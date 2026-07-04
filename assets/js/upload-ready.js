import {
  ERROR_MESSAGES,
  buildLocalDiagnostic,
  formatDecimalBytes,
  normalizeDownloadName,
  parseTargetBytes
} from "./upload-ready-state.js";
import {
  MAIN_MESSAGE_TYPES,
  PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  validateWorkerMessage
} from "./pdf-protocol.mjs";
import { createPdfPreview } from "./pdf-preview.js";

const elements = {
  supportedFlow: document.querySelector("[data-supported-flow]"),
  mobileNotice: document.querySelector("[data-mobile-notice]"),
  workspace: document.querySelector("[data-workspace]"),
  idle: document.querySelector("[data-idle-view]"),
  processing: document.querySelector("[data-processing-view]"),
  error: document.querySelector("[data-error-view]"),
  result: document.querySelector("[data-result-view]"),
  fileInput: document.querySelector("[data-file-input]"),
  selectFile: document.querySelector("[data-select-file]"),
  dropZone: document.querySelector("[data-drop-zone]"),
  selectedFile: document.querySelector("[data-selected-file]"),
  selectedName: document.querySelector("[data-selected-name]"),
  selectedSize: document.querySelector("[data-selected-size]"),
  removeFile: document.querySelector("[data-remove-file]"),
  start: document.querySelector("[data-start-button]"),
  readyHint: document.querySelector("[data-ready-hint]"),
  customTarget: document.querySelector("[data-custom-target]"),
  customValue: document.querySelector("[data-custom-value]"),
  targetError: document.querySelector("[data-target-error]"),
  processingTitle: document.querySelector("[data-processing-title]"),
  processingSummary: document.querySelector("[data-processing-summary]"),
  progressDetail: document.querySelector("[data-progress-detail]"),
  progressTrack: document.querySelector("[data-processing-view] .progress-track"),
  elapsed: document.querySelector("[data-elapsed]"),
  cancel: document.querySelector("[data-cancel-button]"),
  errorHeading: document.querySelector("[data-error-heading]"),
  errorMessage: document.querySelector("[data-error-message]"),
  retry: document.querySelector("[data-retry-button]"),
  copyDiagnostic: document.querySelector("[data-copy-diagnostic]"),
  copyStatus: document.querySelector("[data-copy-status]"),
  resultHeading: document.querySelector("[data-result-heading]"),
  resultCopy: document.querySelector("[data-result-copy]"),
  resultSize: document.querySelector("[data-result-size]"),
  originalSize: document.querySelector("[data-original-size]"),
  resultMethod: document.querySelector("[data-result-method]"),
  resultMargin: document.querySelector("[data-result-margin]"),
  previewReview: document.querySelector("[data-preview-review]"),
  previewCanvas: document.querySelector("[data-preview-canvas]"),
  previewError: document.querySelector("[data-preview-error]"),
  retryPreview: document.querySelector("[data-retry-preview]"),
  previousPage: document.querySelector("[data-prev-page]"),
  nextPage: document.querySelector("[data-next-page]"),
  pageIndicator: document.querySelector("[data-page-indicator]"),
  previewZoom: document.querySelector("[data-preview-zoom]"),
  readability: document.querySelector("[data-readability-confirm]"),
  downloadReason: document.querySelector("[data-download-reason]"),
  download: document.querySelector("[data-download-link]"),
  analysisSize: document.getElementById("analysis-size"),
  analysisPages: document.getElementById("analysis-pages"),
  analysisType: document.getElementById("analysis-type"),
  analysisTip: document.getElementById("analysis-tip")
};

const stageOrder = ["parsing", "structural", "rasterizing", "validating", "cleanup"];
const stageLabels = {
  parsing: "正在解析 PDF",
  structural: "正在进行结构优化",
  rasterizing: "正在压缩页面",
  validating: "正在核验结果",
  cleanup: "正在清理本地资源"
};

let currentFile = null;
let worker = null;
let workerReady = false;
let activeRunId = null;
let startedAt = 0;
let elapsedTimer = null;
let watchdogTimer = null;
let downloadUrl = "";
let pendingDownloadUrl = "";
let lastError = null;
let previewSessions = null;
let previewSource = "original";
let previewPage = 1;
let previewPageCount = 1;

function isTouchFirst() {
  return navigator.maxTouchPoints > 0 && (matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1);
}

function showOnly(view) {
  [elements.idle, elements.processing, elements.error, elements.result].forEach((item) => item?.classList.toggle("hidden", item !== view));
}

function revokeDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = "";
  pendingDownloadUrl = "";
  elements.download?.removeAttribute("href");
}

function terminateWorker() {
  if (worker) worker.terminate();
  worker = null;
  workerReady = false;
  activeRunId = null;
  clearInterval(elapsedTimer);
  clearTimeout(watchdogTimer);
  elapsedTimer = null;
  watchdogTimer = null;
}

async function destroyPreviews() {
  if (!previewSessions) return;
  const sessions = previewSessions;
  previewSessions = null;
  await Promise.allSettled([sessions.original?.destroy(), sessions.result?.destroy()]);
  elements.previewCanvas.width = 0;
  elements.previewCanvas.height = 0;
}

function selectedTarget() {
  const selected = document.querySelector("[data-target-radio]:checked");
  if (!selected) throw new Error("请选择文件大小上限。");
  if (selected.value !== "custom") {
    const bytes = Number(selected.value);
    const label = bytes >= 1_000_000 ? `${bytes / 1_000_000}MB` : `${bytes / 1_000}KB`;
    return { bytes, label };
  }
  const unit = document.querySelector('input[name="custom-unit"]:checked')?.value || "MB";
  const bytes = parseTargetBytes(elements.customValue.value, unit);
  return { bytes, label: `${elements.customValue.value}${unit}` };
}

function updateStartState() {
  if (!elements.start) return;
  let targetValid = true;
  try {
    selectedTarget();
    elements.targetError.classList.remove("text-red-700");
  } catch (error) {
    targetValid = false;
    elements.targetError.textContent = error.message;
    elements.targetError.classList.add("text-red-700");
  }
  elements.start.disabled = !(currentFile && workerReady && targetValid && !activeRunId);
  if (!workerReady) elements.readyHint.textContent = "正在加载本地处理组件…";
  else if (!currentFile) elements.readyHint.textContent = "选择 PDF 后即可开始。处理期间文件和目标会被锁定。";
  else elements.readyHint.textContent = "文件只会发送到浏览器内的专用 Worker，不会离开设备。";
}

function setFile(file) {
  if (!file) return;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf || file.size === 0) {
    showError("INVALID_PDF", "parsing");
    return;
  }
  currentFile = file;
  elements.selectedName.textContent = file.name;
  elements.selectedName.title = file.name;
  elements.selectedSize.textContent = `${formatDecimalBytes(file.size)} · 原文件保持不变`;
  elements.selectedFile.classList.remove("hidden");
  elements.dropZone.classList.add("hidden");
  updateFileAnalysis(file);
  updateStartState();
}

function clearFile() {
  currentFile = null;
  if (elements.fileInput) elements.fileInput.value = "";
  elements.selectedName.textContent = "";
  elements.selectedSize.textContent = "";
  elements.selectedFile.classList.add("hidden");
  elements.dropZone.classList.remove("hidden");
  if (elements.analysisSize) elements.analysisSize.textContent = "—";
  if (elements.analysisPages) elements.analysisPages.textContent = "—";
  if (elements.analysisType) elements.analysisType.textContent = "—";
  if (elements.analysisTip) elements.analysisTip.querySelector("p").textContent = "👆 上传PDF文件后，系统将自动分析并给出推荐";
  updateStartState();
}

function updateFileAnalysis(file, resultBytes) {
  if (!elements.analysisSize || !elements.analysisPages || !elements.analysisType || !elements.analysisTip) return;
  const size = resultBytes != null ? resultBytes : file.size;
  elements.analysisSize.textContent = formatDecimalBytes(size);
  const estimatedPages = Math.max(1, Math.round(size / 200000));
  elements.analysisPages.textContent = `~${estimatedPages}`;
  if (resultBytes != null) {
    elements.analysisType.textContent = "✅ 压缩成功";
    elements.analysisTip.querySelector("p").textContent = `🎉 压缩完成！文件从 ${formatDecimalBytes(file.size)} 减小到 ${formatDecimalBytes(resultBytes)}`;
  } else {
    const isLikelyScan = file.size > 2 * 1024 * 1024;
    elements.analysisType.textContent = isLikelyScan ? "📷 扫描件" : "📄 文档型";
    let tip = "";
    if (file.size < 200_000) tip = "💡 文件较小，普通压缩即可满足需求";
    else if (file.size < 500_000) tip = "💡 文件中等大小，建议选择 200KB 或 500KB 目标";
    else if (file.size < 2 * 1024 * 1024) tip = "💡 文件较大，建议选择 500KB 或 1MB 目标";
    else tip = "💡 检测到大文件，可能是扫描件，建议选择 1MB 目标以保证清晰度";
    elements.analysisTip.querySelector("p").textContent = tip;
  }
}

function setProgress(message) {
  const stage = message.stage;
  const ratio = message.total > 0 ? message.completed / message.total : 0;
  const stageIndex = Math.max(0, stageOrder.indexOf(stage));
  const overall = Math.min(98, Math.round(((stageIndex + ratio) / stageOrder.length) * 100));
  elements.progressTrack.style.setProperty("--progress", `${overall}%`);
  elements.processingTitle.textContent = stageLabels[stage] || "正在本地处理";
  elements.progressDetail.textContent = stage === "rasterizing"
    ? `正在评估页面压缩候选 ${message.completed + 1} / ${message.total}`
    : `${stageLabels[stage] || "处理中"}，请保持页面打开。`;
  document.querySelectorAll("[data-stage]").forEach((item) => {
    const index = stageOrder.indexOf(item.dataset.stage);
    item.classList.toggle("is-complete", index >= 0 && index < stageIndex);
    item.classList.toggle("is-current", item.dataset.stage === stage);
  });
}

function initializeWorker() {
  terminateWorker();
  try {
    worker = new Worker("assets/js/upload-ready-worker.mjs", { type: "module" });
  } catch {
    showError("WORKER_START_FAILED", "bootstrap");
    return;
  }
  const bootTimer = setTimeout(() => {
    if (!workerReady) showError("WORKER_START_FAILED", "bootstrap");
  }, 8_000);
  worker.addEventListener("error", () => {
    clearTimeout(bootTimer);
    showError("WORKER_START_FAILED", "bootstrap");
  });
  worker.addEventListener("message", async (event) => {
    const validation = validateWorkerMessage(event.data);
    if (!validation.ok) return;
    const message = event.data;
    if (message.type === WORKER_MESSAGE_TYPES.READY) {
      clearTimeout(bootTimer);
      workerReady = true;
      updateStartState();
      return;
    }
    if (!activeRunId || message.runId !== activeRunId) return;
    if (message.type === WORKER_MESSAGE_TYPES.PROGRESS) {
      setProgress(message);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPES.CANCELLED) {
      terminateWorker();
      showError("CANCELLED", "cleanup", true);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPES.ERROR) {
      terminateWorker();
      showError(message.code, message.stage);
      return;
    }
    if (message.type === WORKER_MESSAGE_TYPES.RESULT) {
      const runId = activeRunId;
      terminateWorker();
      await showResult(message, runId);
    }
  });
  worker.postMessage({ protocolVersion: PROTOCOL_VERSION, type: MAIN_MESSAGE_TYPES.BOOTSTRAP });
}

async function startProcessing() {
  if (!currentFile || activeRunId) return;
  let target;
  try {
    target = selectedTarget();
  } catch (error) {
    elements.targetError.textContent = error.message;
    elements.customValue.focus();
    return;
  }
  if (!workerReady) initializeWorker();
  revokeDownload();
  await destroyPreviews();
  activeRunId = crypto.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  startedAt = performance.now();
  elements.processingSummary.textContent = `${currentFile.name} · ${formatDecimalBytes(currentFile.size)} · 目标 ${target.label}`;
  elements.progressTrack.style.setProperty("--progress", "2%");
  elements.processingTitle.textContent = "正在读取 PDF";
  elements.progressDetail.textContent = "文件只在浏览器内传递，请保持页面打开。";
  elements.cancel.disabled = false;
  showOnly(elements.processing);
  elapsedTimer = setInterval(() => {
    elements.elapsed.textContent = `${Math.floor((performance.now() - startedAt) / 1_000)} 秒`;
  }, 1_000);
  watchdogTimer = setTimeout(() => {
    if (!activeRunId) return;
    terminateWorker();
    showError("PROCESSING_TIMEOUT", "cleanup");
  }, 185_000);
  try {
    const sourceBuffer = await currentFile.arrayBuffer();
    worker.postMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: MAIN_MESSAGE_TYPES.START,
      runId: activeRunId,
      sourceBuffer,
      targetBytes: target.bytes
    }, [sourceBuffer]);
  } catch {
    terminateWorker();
    showError("WORKER_START_FAILED", "bootstrap");
  }
}

function cancelProcessing() {
  if (!worker || !activeRunId || elements.cancel.disabled) return;
  elements.cancel.disabled = true;
  elements.processingTitle.textContent = "正在停止并清理本地资源…";
  elements.progressDetail.textContent = "清理完成前不会开始新的任务。";
  worker.postMessage({ protocolVersion: PROTOCOL_VERSION, type: MAIN_MESSAGE_TYPES.CANCEL, runId: activeRunId });
}

function showError(code, stage, keepFile = false) {
  const elapsedMs = startedAt ? performance.now() - startedAt : 0;
  lastError = { code, stage, elapsedMs, cleanupComplete: !activeRunId };
  terminateWorker();
  elements.errorHeading.textContent = code === "CANCELLED" ? "已取消，原文件未更改" : "处理未完成";
  elements.errorMessage.textContent = ERROR_MESSAGES[code] || ERROR_MESSAGES.INVALID_PDF;
  elements.retry.textContent = keepFile || currentFile ? "重新开始" : "重新选择";
  elements.copyStatus.textContent = "";
  showOnly(elements.error);
  requestAnimationFrame(() => elements.errorHeading.focus());
}

async function showResult(message) {
  const target = selectedTarget();
  const blob = new Blob([message.resultBuffer], { type: "application/pdf" });
  try {
    downloadUrl = URL.createObjectURL(blob);
  } catch {
    showError("DOWNLOAD_URL_FAILED", "cleanup");
    return;
  }
  pendingDownloadUrl = downloadUrl;
  elements.download.download = normalizeDownloadName(currentFile.name, target.label);
  elements.resultSize.textContent = formatDecimalBytes(message.finalBytes);
  elements.originalSize.textContent = formatDecimalBytes(currentFile.size);
  elements.resultMargin.textContent = formatDecimalBytes(Math.max(0, target.bytes - message.finalBytes));
  const methodLabels = { original: "未重写原文件", structural: "结构优化，未转为图片", raster: "页面已转为图片" };
  elements.resultMethod.textContent = methodLabels[message.method];
  elements.previewReview.classList.toggle("hidden", message.method !== "raster");
  elements.readability.checked = false;
  elements.download.setAttribute("aria-disabled", String(message.method === "raster"));
  if (message.method === "raster") elements.download.removeAttribute("href");
  else elements.download.href = downloadUrl;

  if (message.method === "original") {
    elements.resultHeading.textContent = "原文件已经符合大小限制";
    elements.resultCopy.textContent = "文件没有被重写；工具已重新打开并核验页数与页面渲染。";
    elements.download.textContent = "下载原文件";
  } else if (message.method === "structural") {
    elements.resultHeading.textContent = "大小符合所选上限";
    elements.resultCopy.textContent = "结果通过重新打开、页数、页面尺寸和渲染校验，页面未转为图片。";
    elements.download.textContent = "下载大小符合文件";
  } else {
    elements.resultHeading.textContent = "大小符合所选上限，请检查页面";
    elements.resultCopy.textContent = "页面已转为图片。请切换原文件与处理结果，逐页确认可读后再下载。";
    elements.download.textContent = "下载大小符合文件";
    await preparePreviews(message.resultBuffer);
  }
  elements.downloadReason.textContent = message.method === "raster" ? "确认所有页面可读后，下载按钮才会启用。" : "结果已经可以下载，原文件未被修改。";
  elements.progressTrack.style.setProperty("--progress", "100%");
  updateFileAnalysis(currentFile, message.finalBytes);
  showOnly(elements.result);
  requestAnimationFrame(() => elements.resultHeading.focus());
}

async function preparePreviews(resultBuffer) {
  try {
    previewSessions = {
      original: await createPdfPreview(currentFile),
      result: await createPdfPreview(resultBuffer)
    };
    previewPageCount = previewSessions.result.pageCount;
    previewSource = "original";
    previewPage = 1;
    document.querySelector('input[name="preview-source"][value="original"]').checked = true;
    await renderPreview();
  } catch {
    elements.previewCanvas.classList.add("hidden");
    elements.previewError.classList.remove("hidden");
    elements.readability.disabled = true;
  }
}

async function renderPreview() {
  if (!previewSessions) return;
  elements.previewError.classList.add("hidden");
  elements.previewCanvas.classList.remove("hidden");
  elements.pageIndicator.textContent = `${previewPage} / ${previewPageCount}`;
  elements.previousPage.disabled = previewPage <= 1;
  elements.nextPage.disabled = previewPage >= previewPageCount;
  try {
    await previewSessions[previewSource].renderPage({
      pageNumber: previewPage,
      canvas: elements.previewCanvas,
      maxWidth: 720,
      maxHeight: 920,
      zoom: Number(elements.previewZoom.value) || 1
    });
  } catch {
    elements.previewCanvas.classList.add("hidden");
    elements.previewError.classList.remove("hidden");
    elements.readability.disabled = true;
  }
}

async function resetToIdle() {
  terminateWorker();
  revokeDownload();
  await destroyPreviews();
  elements.readability.disabled = false;
  showOnly(elements.idle);
  initializeWorker();
  updateStartState();
}

async function copyDiagnostic() {
  if (!lastError) return;
  const report = buildLocalDiagnostic({
    buildId: document.documentElement.dataset.buildId || "local",
    browser: `${navigator.userAgentData?.brands?.[0]?.brand || "browser"}`,
    capabilities: { worker: typeof Worker !== "undefined", offscreenCanvas: typeof OffscreenCanvas !== "undefined" },
    errorCode: lastError.code,
    stage: lastError.stage,
    elapsedMs: lastError.elapsedMs,
    cleanupComplete: true
  });
  try {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    elements.copyStatus.textContent = "本地诊断已复制，不包含文件名、大小、页数或内容。";
  } catch {
    elements.copyStatus.textContent = "浏览器未允许复制，请检查剪贴板权限。";
  }
}

document.querySelectorAll("[data-target-radio]").forEach((radio) => radio.addEventListener("change", () => {
  elements.customTarget.classList.toggle("hidden", radio.value !== "custom" || !radio.checked);
  updateStartState();
}));
elements.customValue?.addEventListener("input", updateStartState);
document.querySelectorAll('input[name="custom-unit"]').forEach((radio) => radio.addEventListener("change", updateStartState));
elements.selectFile?.addEventListener("click", () => elements.fileInput.click());
elements.fileInput?.addEventListener("change", () => setFile(elements.fileInput.files?.[0]));
elements.removeFile?.addEventListener("click", clearFile);
elements.start?.addEventListener("click", startProcessing);
elements.cancel?.addEventListener("click", cancelProcessing);
elements.retry?.addEventListener("click", resetToIdle);
elements.copyDiagnostic?.addEventListener("click", copyDiagnostic);
elements.dropZone?.addEventListener("click", (event) => {
  if (!event.target.closest("[data-select-file]")) elements.fileInput.click();
});
elements.dropZone?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
["dragenter", "dragover"].forEach((name) => elements.dropZone?.addEventListener(name, (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("is-dragover");
}));
["dragleave", "drop"].forEach((name) => elements.dropZone?.addEventListener(name, (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragover");
}));
elements.dropZone?.addEventListener("drop", (event) => setFile(event.dataTransfer.files?.[0]));
document.querySelectorAll('input[name="preview-source"]').forEach((radio) => radio.addEventListener("change", async () => {
  if (!radio.checked) return;
  previewSource = radio.value;
  await renderPreview();
}));
elements.previousPage?.addEventListener("click", async () => { previewPage = Math.max(1, previewPage - 1); await renderPreview(); });
elements.nextPage?.addEventListener("click", async () => { previewPage = Math.min(previewPageCount, previewPage + 1); await renderPreview(); });
elements.previewZoom?.addEventListener("change", renderPreview);
elements.retryPreview?.addEventListener("click", renderPreview);
elements.readability?.addEventListener("change", () => {
  const confirmed = elements.readability.checked;
  elements.download.setAttribute("aria-disabled", String(!confirmed));
  if (confirmed) elements.download.href = pendingDownloadUrl;
  else elements.download.removeAttribute("href");
  elements.downloadReason.textContent = confirmed ? "你已确认页面可读，可以下载结果。" : "确认所有页面可读后，下载按钮才会启用。";
});
elements.download?.addEventListener("click", (event) => {
  if (elements.download.getAttribute("aria-disabled") === "true") event.preventDefault();
});
window.addEventListener("beforeunload", () => {
  terminateWorker();
  revokeDownload();
  void destroyPreviews();
});

if (isTouchFirst()) {
  elements.supportedFlow.classList.add("hidden");
  elements.mobileNotice.classList.remove("hidden");
} else {
  showOnly(elements.idle);
  initializeWorker();
}
