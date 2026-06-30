import "./pdfjs-polyfills.mjs";
import * as pdfjs from "../vendor/pdfjs/pdf.mjs";

const PDFJS_BASE_URL = new URL("../vendor/pdfjs/", import.meta.url);
const MAX_THUMBNAIL_PIXELS = 200_000;

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./pdf-worker-entry.mjs", import.meta.url).href;

export class PreviewError extends Error {
  constructor(message, code = "PREVIEW_RENDER_FAILED") {
    super(message);
    this.name = "PreviewError";
    this.code = code;
  }
}

async function sourceToArrayBuffer(source) {
  if (source instanceof Blob) return source.arrayBuffer();
  if (source instanceof ArrayBuffer) return source.slice(0);
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  throw new PreviewError("Unsupported PDF preview source", "INVALID_PDF");
}

function loadingOptions(buffer) {
  return {
    data: new Uint8Array(buffer),
    cMapUrl: new URL("cmaps/", PDFJS_BASE_URL).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("standard_fonts/", PDFJS_BASE_URL).href,
    wasmUrl: new URL("wasm/", PDFJS_BASE_URL).href,
    iccUrl: new URL("iccs/", PDFJS_BASE_URL).href,
    useWorkerFetch: false,
    isImageDecoderSupported: false,
    isEvalSupported: false
  };
}

class PdfPreviewSession {
  constructor(loadingTask, document) {
    this.loadingTask = loadingTask;
    this.document = document;
    this.pageCount = document.numPages;
    this.destroyed = false;
    this.activeRenders = new Map();
    this.canvases = new Set();
  }

  async renderPage({ pageNumber, canvas, maxWidth = 720, maxHeight = 900, zoom = 1, rotation = 0 }) {
    if (this.destroyed) throw new PreviewError("Preview session is closed");
    if (!(canvas instanceof HTMLCanvasElement)) throw new PreviewError("A canvas is required");
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > this.pageCount) {
      throw new PreviewError("Page is outside the document");
    }

    this.cancelRender(canvas);
    const page = await this.document.getPage(pageNumber);
    const normalizedRotation = ((page.rotate + rotation) % 360 + 360) % 360;
    const baseViewport = page.getViewport({ scale: 1, rotation: normalizedRotation });
    const cssScale = Math.max(0.1, Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height) * zoom);
    let renderScale = cssScale * Math.min(window.devicePixelRatio || 1, 2);
    if ((baseViewport.width * renderScale) * (baseViewport.height * renderScale) > MAX_THUMBNAIL_PIXELS && maxWidth <= 360) {
      renderScale = Math.sqrt(MAX_THUMBNAIL_PIXELS / (baseViewport.width * baseViewport.height));
    }
    const viewport = page.getViewport({ scale: renderScale, rotation: normalizedRotation });
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    canvas.style.width = `${Math.max(1, Math.round(baseViewport.width * cssScale))}px`;
    canvas.style.height = `${Math.max(1, Math.round(baseViewport.height * cssScale))}px`;
    this.canvases.add(canvas);

    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const renderTask = page.render({ canvasContext: context, viewport, background: "#ffffff" });
    this.activeRenders.set(canvas, renderTask);
    try {
      await renderTask.promise;
      return { width: canvas.width, height: canvas.height, bytes: canvas.width * canvas.height * 4 };
    } catch (error) {
      if (error?.name === "RenderingCancelledException") throw error;
      throw new PreviewError("PDF page preview failed");
    } finally {
      if (this.activeRenders.get(canvas) === renderTask) this.activeRenders.delete(canvas);
      page.cleanup();
    }
  }

  cancelRender(canvas) {
    const task = this.activeRenders.get(canvas);
    if (!task) return;
    try { task.cancel(); } catch {}
    this.activeRenders.delete(canvas);
  }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const task of this.activeRenders.values()) {
      try { task.cancel(); } catch {}
    }
    this.activeRenders.clear();
    for (const canvas of this.canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
    this.canvases.clear();
    try { this.document?.cleanup(); } catch {}
    await Promise.race([
      this.loadingTask.destroy().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2_000))
    ]);
    this.document = null;
    this.loadingTask = null;
  }
}

export async function createPdfPreview(source) {
  const buffer = await sourceToArrayBuffer(source);
  let loadingTask;
  try {
    loadingTask = pdfjs.getDocument(loadingOptions(buffer));
    const document = await loadingTask.promise;
    return new PdfPreviewSession(loadingTask, document);
  } catch (error) {
    await loadingTask?.destroy().catch(() => {});
    const code = error?.name === "PasswordException" ? "ENCRYPTED_PDF" : "INVALID_PDF";
    throw new PreviewError("PDF preview could not be opened", code);
  }
}

export function createThumbnailQueue(session, options = {}) {
  const maxConcurrency = Math.max(1, Math.min(2, options.maxConcurrency || 2));
  const maxEntries = Math.max(1, Math.min(12, options.maxEntries || 12));
  const maxBytes = Math.max(1, Math.min(32_000_000, options.maxBytes || 32_000_000));
  const queue = [];
  const cache = new Map();
  let active = 0;
  let peakConcurrency = 0;
  let cacheBytes = 0;
  let destroyed = false;

  function notify(state, job) {
    options.onState?.(state, job);
  }

  function evict() {
    while (cache.size > maxEntries || cacheBytes > maxBytes) {
      const [key, entry] = cache.entries().next().value;
      cache.delete(key);
      cacheBytes -= entry.bytes;
      entry.canvas.width = 0;
      entry.canvas.height = 0;
      notify("evicted", entry.job);
    }
  }

  function pump() {
    while (!destroyed && active < maxConcurrency && queue.length > 0) {
      const job = queue.shift();
      active += 1;
      peakConcurrency = Math.max(peakConcurrency, active);
      notify("rendering", job);
      session.renderPage(job).then((result) => {
        const previous = cache.get(job.key);
        if (previous) cacheBytes -= previous.bytes;
        cache.delete(job.key);
        cache.set(job.key, { ...result, canvas: job.canvas, job });
        cacheBytes += result.bytes;
        evict();
        notify("rendered", job);
        job.resolve(result);
      }).catch((error) => {
        notify(error?.name === "RenderingCancelledException" ? "cancelled" : "error", job);
        job.reject(error);
      }).finally(() => {
        active -= 1;
        pump();
      });
    }
  }

  return {
    request(job) {
      if (destroyed) return Promise.reject(new PreviewError("Thumbnail queue is closed"));
      const cached = cache.get(job.key);
      if (cached && cached.canvas === job.canvas && cached.job.rotation === job.rotation) {
        cache.delete(job.key);
        cache.set(job.key, cached);
        return Promise.resolve({ width: cached.width, height: cached.height, bytes: cached.bytes });
      }
      return new Promise((resolve, reject) => {
        queue.push({ ...job, resolve, reject });
        notify("queued", job);
        pump();
      });
    },
    invalidate(key) {
      const entry = cache.get(key);
      if (!entry) return;
      cache.delete(key);
      cacheBytes -= entry.bytes;
    },
    getMetrics() {
      return { active, queued: queue.length, peakConcurrency, cacheEntries: cache.size, cacheBytes, trackedCanvases: cache.size };
    },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const job of queue.splice(0)) job.reject(new PreviewError("Thumbnail render cancelled"));
      for (const entry of cache.values()) {
        session.cancelRender(entry.canvas);
        entry.canvas.width = 0;
        entry.canvas.height = 0;
      }
      cache.clear();
      cacheBytes = 0;
    }
  };
}
