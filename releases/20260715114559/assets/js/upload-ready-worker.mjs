import {
  MAIN_MESSAGE_TYPES,
  PROCESSING_STAGES,
  PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  validateMainMessage
} from "./pdf-protocol.mjs";
import {
  RASTER_CANDIDATES,
  classifyPdfFeatures,
  geometryMatches,
  isWithinProcessingLimits
} from "./upload-ready-processing.mjs";
import "./pdfjs-polyfills.mjs";

const PDFJS_BASE_URL = new URL("../vendor/pdfjs/", import.meta.url);
const PROCESSING_TIMEOUT_MS = 180_000;
const MAX_RENDER_PIXELS = 12_000_000;

let librariesPromise;
let activeRun = null;

globalThis.__PDFTOOL_OUTER_WORKER__ = true;

class WorkerCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }

  reset(target, width, height) {
    target.canvas.width = width;
    target.canvas.height = height;
  }

  destroy(target) {
    target.canvas.width = 0;
    target.canvas.height = 0;
    target.canvas = null;
    target.context = null;
  }
}

class WorkerFilterFactory {
  addFilter() { return "none"; }
  addHCMFilter() { return "none"; }
  addAlphaFilter() { return "none"; }
  addLuminosityFilter() { return "none"; }
  addKnockoutFilter() { return "none"; }
  addHighlightHCMFilter() { return "none"; }
  addSelectionHCMFilter() { return "none"; }
  addSelectionFilter() { return "none"; }
  createSelectionStyle() { return null; }
  destroy() {}
}

class ProcessingFailure extends Error {
  constructor(code, stage, message = code) {
    super(message);
    this.name = "ProcessingFailure";
    this.code = code;
    this.stage = stage;
  }
}

function post(type, payload = {}, transfer = []) {
  self.postMessage({ protocolVersion: PROTOCOL_VERSION, type, ...payload }, transfer);
}

function progress(run, stage, completed, total = 1) {
  if (!run.cancelled) post(WORKER_MESSAGE_TYPES.PROGRESS, { runId: run.runId, stage, completed, total });
}

function publishError(runId, code, stage, error) {
  post(WORKER_MESSAGE_TYPES.ERROR, {
    runId,
    code,
    stage,
    diagnostic: typeof error?.name === "string" ? error.name : "WorkerError"
  });
}

function pdfJsOptions(sourceBuffer) {
  return {
    data: new Uint8Array(sourceBuffer),
    cMapUrl: new URL("cmaps/", PDFJS_BASE_URL).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("standard_fonts/", PDFJS_BASE_URL).href,
    wasmUrl: new URL("wasm/", PDFJS_BASE_URL).href,
    iccUrl: new URL("iccs/", PDFJS_BASE_URL).href,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: typeof OffscreenCanvas !== "undefined",
    isImageDecoderSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
    CanvasFactory: WorkerCanvasFactory,
    FilterFactory: WorkerFilterFactory
  };
}

function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (!ArrayBuffer.isView(value)) throw new TypeError("Expected binary PDF output");
  if (value.byteOffset === 0 && value.byteLength === value.buffer.byteLength) return value.buffer;
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}

function assertActive(run, stage) {
  if (run.cancelled || activeRun !== run) throw new ProcessingFailure("CANCELLED", "cleanup");
  if (run.timedOut || Date.now() > run.deadline) throw new ProcessingFailure("PROCESSING_TIMEOUT", stage);
}

async function loadLibraries() {
  if (!librariesPromise) {
    librariesPromise = Promise.all([
      import("../vendor/pdfjs/pdf.mjs"),
      import("../vendor/pdf-lib.esm.min.js")
    ]).then(([pdfjs, pdfLib]) => {
      if (!pdfjs?.getDocument) throw new Error("PDF.js failed to expose getDocument");
      if (!pdfLib?.PDFDocument) throw new Error("pdf-lib failed to expose PDFDocument");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("./pdf-worker-entry.mjs", import.meta.url).href;
      return { pdfjs, pdfLib };
    });
  }
  return librariesPromise;
}

async function bootstrap() {
  try {
    const { pdfjs } = await loadLibraries();
    post(WORKER_MESSAGE_TYPES.READY, {
      capabilities: {
        pdfjsVersion: pdfjs.version,
        offscreenCanvas: typeof OffscreenCanvas !== "undefined",
        transferableBuffers: true
      }
    });
  } catch (error) {
    librariesPromise = undefined;
    publishError("bootstrap", "PDFJS_ASSET_LOAD_FAILED", "bootstrap", error);
  }
}

async function openPdfJsDocument(run, sourceBuffer) {
  const { pdfjs } = await loadLibraries();
  const loadingTask = pdfjs.getDocument(pdfJsOptions(sourceBuffer));
  run.loadingTasks.add(loadingTask);
  try {
    const document = await loadingTask.promise;
    run.documents.add(document);
    return document;
  } finally {
    run.loadingTasks.delete(loadingTask);
  }
}

async function destroyDocument(run, document) {
  if (!document) return;
  run.documents.delete(document);
  try {
    await document.destroy();
  } catch {
    // Cancellation may already have destroyed this document.
  }
}

async function collectGeometry(run, document, stage) {
  const geometry = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    assertActive(run, stage);
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    geometry.push({ width: viewport.width, height: viewport.height });
    page.cleanup();
  }
  return geometry;
}

async function inspectSource(run, sourceBuffer) {
  progress(run, "parsing", 0, 1);
  const featureCode = classifyPdfFeatures(new Uint8Array(sourceBuffer));
  if (featureCode) throw new ProcessingFailure(featureCode, "parsing");

  const document = await openPdfJsDocument(run, sourceBuffer.slice(0));
  run.sourceDocument = document;
  const [fields, scripts, attachments] = await Promise.all([
    document.getFieldObjects().catch(() => null),
    document.hasJSActions().catch(() => false),
    document.getAttachments().catch(() => null)
  ]);
  if (fields && Object.keys(fields).length > 0) throw new ProcessingFailure("UNSUPPORTED_FORM", "parsing");
  if (scripts === true || (attachments && Object.keys(attachments).length > 0)) {
    throw new ProcessingFailure("UNSUPPORTED_ACTIVE_CONTENT", "parsing");
  }
  if (!isWithinProcessingLimits({ inputBytes: sourceBuffer.byteLength, pageCount: document.numPages })) {
    throw new ProcessingFailure("RESOURCE_LIMIT", "parsing");
  }

  const geometry = await collectGeometry(run, document, "parsing");
  progress(run, "parsing", 1, 1);
  return { document, geometry, pageCount: document.numPages };
}

async function renderProbe(run, document) {
  assertActive(run, "validating");
  const page = await document.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1, 128 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
  run.canvases.add(canvas);
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const renderTask = page.render({ canvasContext: context, viewport, background: "#ffffff" });
  run.renderTask = renderTask;
  try {
    await renderTask.promise;
    assertActive(run, "validating");
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlank = false;
    for (let index = 0; index < data.length; index += 16) {
      if (data[index] < 248 || data[index + 1] < 248 || data[index + 2] < 248) {
        nonBlank = true;
        break;
      }
    }
    const encoded = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
    if (encoded.size === 0) throw new ProcessingFailure("OUTPUT_VALIDATION_FAILED", "validating");
    return nonBlank;
  } finally {
    run.renderTask = null;
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
    run.canvases.delete(canvas);
  }
}

async function validateOutput(run, outputBuffer, expectedGeometry) {
  progress(run, "validating", 0, 1);
  const { pdfLib } = await loadLibraries();
  let pdfLibDocument;
  let pdfJsDocument;
  try {
    pdfLibDocument = await pdfLib.PDFDocument.load(outputBuffer.slice(0), { ignoreEncryption: false });
    if (pdfLibDocument.getPageCount() !== expectedGeometry.length) {
      throw new ProcessingFailure("OUTPUT_VALIDATION_FAILED", "validating", "page-count-mismatch");
    }
    pdfJsDocument = await openPdfJsDocument(run, outputBuffer.slice(0));
    const actualGeometry = await collectGeometry(run, pdfJsDocument, "validating");
    if (!geometryMatches(expectedGeometry, actualGeometry)) {
      throw new ProcessingFailure("OUTPUT_VALIDATION_FAILED", "validating", "page-geometry-mismatch");
    }
    const renderProbeNonBlank = await renderProbe(run, pdfJsDocument);
    progress(run, "validating", 1, 1);
    return renderProbeNonBlank;
  } catch (error) {
    if (error instanceof ProcessingFailure) throw error;
    throw new ProcessingFailure("OUTPUT_VALIDATION_FAILED", "validating", error?.message);
  } finally {
    await destroyDocument(run, pdfJsDocument);
    pdfLibDocument = null;
  }
}

async function attemptStructural(run, sourceBuffer, safeTargetBytes, sourceInfo) {
  progress(run, "structural", 0, 1);
  try {
    const { pdfLib } = await loadLibraries();
    const document = await pdfLib.PDFDocument.load(sourceBuffer.slice(0), { ignoreEncryption: false });
    const saved = await document.save({ useObjectStreams: true, objectsPerTick: 50, updateFieldAppearances: false });
    const outputBuffer = toArrayBuffer(saved);
    const meaningfulGain = outputBuffer.byteLength <= Math.floor(sourceBuffer.byteLength * 0.99);
    progress(run, "structural", 1, 1);
    if (!meaningfulGain || outputBuffer.byteLength > safeTargetBytes) return null;
    const renderProbeNonBlank = await validateOutput(run, outputBuffer, sourceInfo.geometry);
    return { method: "structural", resultBuffer: outputBuffer, renderProbeNonBlank };
  } catch (error) {
    if (error instanceof ProcessingFailure && ["CANCELLED", "PROCESSING_TIMEOUT", "OUTPUT_VALIDATION_FAILED"].includes(error.code)) {
      throw error;
    }
    progress(run, "structural", 1, 1);
    return null;
  }
}

async function renderPageJpeg(run, page, dpi, jpegQuality) {
  const viewport = page.getViewport({ scale: dpi / 72 });
  const pixelCount = Math.ceil(viewport.width) * Math.ceil(viewport.height);
  if (pixelCount > MAX_RENDER_PIXELS) throw new ProcessingFailure("RESOURCE_LIMIT", "rasterizing");

  const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
  run.canvases.add(canvas);
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const renderTask = page.render({ canvasContext: context, viewport, background: "#ffffff" });
  run.renderTask = renderTask;
  try {
    await renderTask.promise;
    assertActive(run, "rasterizing");
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: jpegQuality });
    if (blob.size === 0) throw new ProcessingFailure("PREVIEW_RENDER_FAILED", "rasterizing");
    return new Uint8Array(await blob.arrayBuffer());
  } catch (error) {
    if (error instanceof ProcessingFailure) throw error;
    throw new ProcessingFailure("PREVIEW_RENDER_FAILED", "rasterizing", error?.message);
  } finally {
    run.renderTask = null;
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
    run.canvases.delete(canvas);
  }
}

async function attemptRaster(run, safeTargetBytes, sourceInfo) {
  const { pdfLib } = await loadLibraries();
  const total = RASTER_CANDIDATES.length * sourceInfo.pageCount;

  for (let candidateIndex = 0; candidateIndex < RASTER_CANDIDATES.length; candidateIndex += 1) {
    const candidate = RASTER_CANDIDATES[candidateIndex];
    assertActive(run, "rasterizing");
    const output = await pdfLib.PDFDocument.create();

    for (let pageIndex = 0; pageIndex < sourceInfo.pageCount; pageIndex += 1) {
      assertActive(run, "rasterizing");
      progress(run, "rasterizing", candidateIndex * sourceInfo.pageCount + pageIndex, total);
      const page = await sourceInfo.document.getPage(pageIndex + 1);
      const jpegBytes = await renderPageJpeg(run, page, candidate.dpi, candidate.jpegQuality);
      const embedded = await output.embedJpg(jpegBytes);
      const geometry = sourceInfo.geometry[pageIndex];
      const outputPage = output.addPage([geometry.width, geometry.height]);
      outputPage.drawImage(embedded, { x: 0, y: 0, width: geometry.width, height: geometry.height });
    }

    const saved = await output.save({ useObjectStreams: true, objectsPerTick: 25 });
    const outputBuffer = toArrayBuffer(saved);
    if (outputBuffer.byteLength <= safeTargetBytes) {
      const renderProbeNonBlank = await validateOutput(run, outputBuffer, sourceInfo.geometry);
      return { method: "raster", resultBuffer: outputBuffer, renderProbeNonBlank };
    }
  }
  throw new ProcessingFailure("TARGET_UNREACHABLE", "rasterizing");
}

async function buildResult(run, message) {
  const sourceInfo = await inspectSource(run, message.sourceBuffer);
  const safeTargetBytes = Math.floor(message.targetBytes * 0.99);
  if (message.sourceBuffer.byteLength <= safeTargetBytes) {
    const renderProbeNonBlank = await renderProbe(run, sourceInfo.document);
    return { method: "original", resultBuffer: message.sourceBuffer, renderProbeNonBlank, pageCount: sourceInfo.pageCount };
  }

  const structural = await attemptStructural(run, message.sourceBuffer, safeTargetBytes, sourceInfo);
  if (structural) return { ...structural, pageCount: sourceInfo.pageCount };
  const raster = await attemptRaster(run, safeTargetBytes, sourceInfo);
  return { ...raster, pageCount: sourceInfo.pageCount };
}

async function cleanupRun(run) {
  clearTimeout(run.timeoutId);
  try {
    run.renderTask?.cancel();
  } catch {
    // Render already settled.
  }
  for (const canvas of run.canvases) {
    canvas.width = 0;
    canvas.height = 0;
  }
  run.canvases.clear();
  const loadingTasks = [...run.loadingTasks];
  run.loadingTasks.clear();
  await Promise.allSettled(loadingTasks.map((task) => Promise.race([
    task.destroy(),
    new Promise((resolve) => setTimeout(resolve, 1_000))
  ])));
  const documents = [...run.documents];
  run.documents.clear();
  const sourceDocument = run.sourceDocument;
  try {
    sourceDocument?.cleanup();
  } catch {
    // The run-scoped outer worker is terminated by the main owner next.
  }
  await Promise.allSettled(documents
    .filter((document) => document !== sourceDocument)
    .map((document) => document.destroy()));
  run.sourceDocument = null;
}

async function processStart(message) {
  const run = {
    runId: message.runId,
    cancelled: false,
    cancelPublished: false,
    timedOut: false,
    deadline: Date.now() + PROCESSING_TIMEOUT_MS,
    timeoutId: null,
    loadingTasks: new Set(),
    documents: new Set(),
    canvases: new Set(),
    sourceDocument: null,
    renderTask: null
  };
  activeRun = run;
  run.timeoutId = setTimeout(() => {
    run.timedOut = true;
    try { run.renderTask?.cancel(); } catch {}
    for (const task of run.loadingTasks) void task.destroy().catch(() => {});
  }, PROCESSING_TIMEOUT_MS);

  let result = null;
  let failure = null;
  try {
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertActive(run, "bootstrap");
    result = await buildResult(run, message);
  } catch (error) {
    if (!run.cancelled) {
      if (error instanceof ProcessingFailure) {
        failure = error;
      } else if (error?.name === "PasswordException") {
        failure = new ProcessingFailure("ENCRYPTED_PDF", "parsing");
      } else {
        console.error("[upload-ready-worker]", error);
        failure = new ProcessingFailure("INVALID_PDF", "parsing");
      }
    }
  } finally {
    progress(run, "cleanup", 0, 1);
    await cleanupRun(run);
  }

  if (run.cancelled) {
    post(WORKER_MESSAGE_TYPES.CANCELLED, { runId: run.runId, cleanupComplete: true });
  } else if (failure) {
    console.error("[upload-ready-worker]", failure.code, failure.message);
    publishError(run.runId, failure.code, failure.stage, failure);
  } else if (result) {
    const resultBuffer = toArrayBuffer(result.resultBuffer);
    post(WORKER_MESSAGE_TYPES.RESULT, {
      runId: run.runId,
      method: result.method,
      resultBuffer,
      finalBytes: resultBuffer.byteLength,
      pageCount: result.pageCount,
      renderProbeNonBlank: result.renderProbeNonBlank === true
    }, [resultBuffer]);
  }
  if (activeRun === run) activeRun = null;
}

function cancel(runId) {
  const run = activeRun;
  if (!run || run.runId !== runId || run.cancelled) return;
  run.cancelled = true;
  progress(run, "cleanup", 0, 1);
  try { run.renderTask?.cancel(); } catch {}
  for (const task of run.loadingTasks) void task.destroy().catch(() => {});
}

self.addEventListener("message", (event) => {
  const validation = validateMainMessage(event.data);
  if (!validation.ok) {
    const runId = typeof event.data?.runId === "string" ? event.data.runId : "invalid-message";
    publishError(runId, "WORKER_START_FAILED", PROCESSING_STAGES[0], new Error(validation.reason));
    return;
  }
  if (event.data.type === MAIN_MESSAGE_TYPES.BOOTSTRAP) {
    void bootstrap();
    return;
  }
  if (event.data.type === MAIN_MESSAGE_TYPES.CANCEL) {
    cancel(event.data.runId);
    return;
  }
  if (activeRun) {
    publishError(event.data.runId, "WORKER_START_FAILED", "bootstrap", new Error("A task is already active"));
    return;
  }
  void processStart(event.data);
});
