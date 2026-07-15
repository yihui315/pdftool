const UNIT_BYTES = Object.freeze({ KB: 1_000, MB: 1_000_000 });
const MIN_TARGET_BYTES = 100_000;
const MAX_TARGET_BYTES = 20_000_000;
const PROCESSING_STATUSES = new Set(["processing", "cancelling"]);

export const ERROR_MESSAGES = Object.freeze({
  PDF_LIB_UNAVAILABLE: "PDF 处理组件加载失败，请刷新后重试。",
  PDFJS_ASSET_LOAD_FAILED: "PDF 预览组件加载失败，请刷新后重试。",
  WORKER_START_FAILED: "当前浏览器无法启动本地处理，请更新桌面浏览器或重试。",
  INVALID_PDF: "这个文件不是可读取的 PDF。",
  ENCRYPTED_PDF: "暂不支持加密 PDF，请先在可信工具中解密。",
  UNSUPPORTED_SIGNATURE: "暂不处理带数字签名的 PDF。",
  UNSUPPORTED_FORM: "暂不处理包含表单的 PDF。",
  UNSUPPORTED_ACTIVE_CONTENT: "该 PDF 含首版不支持的交互或附件内容。",
  RESOURCE_LIMIT: "文件超出首版处理范围，请使用较小的 PDF。",
  MEMORY_LIMIT: "浏览器内存不足，未生成结果。",
  PROCESSING_TIMEOUT: "本地处理超时，请关闭其他标签页后重试。",
  CANCELLED: "已取消，原文件未更改。",
  TARGET_UNREACHABLE: "在当前大小限制下无法生成可确认清晰的结果。",
  OUTPUT_VALIDATION_FAILED: "结果校验失败，未提供下载。",
  PREVIEW_RENDER_FAILED: "这一页无法预览，请重试；原文件仍可用。",
  DOWNLOAD_URL_FAILED: "下载准备失败，请重新生成结果。"
});

export function parseTargetBytes(value, unit) {
  const text = String(value ?? "").trim();
  if (!Object.hasOwn(UNIT_BYTES, unit) || !/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error("目标大小必须是最多两位小数的正数。");
  }
  const bytes = Math.floor(Number(text) * UNIT_BYTES[unit]);
  if (!Number.isSafeInteger(bytes) || bytes < MIN_TARGET_BYTES || bytes > MAX_TARGET_BYTES) {
    throw new Error("目标大小必须在 100 KB 到 20 MB 之间。");
  }
  return bytes;
}

export function getSafeTargetBytes(limitBytes) {
  if (!Number.isInteger(limitBytes) || limitBytes <= 0) throw new Error("目标大小无效。");
  return Math.floor(limitBytes * 0.99);
}

export function formatDecimalBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes >= 1_000_000) {
    const value = Math.round((bytes / 1_000_000) * 100) / 100;
    return `${value} MB`;
  }
  if (bytes >= 1_000) {
    const value = Math.round((bytes / 1_000) * 10) / 10;
    return `${value} KB`;
  }
  return `${Math.floor(bytes)} B`;
}

export function normalizeDownloadName(originalName, targetLabel) {
  const fallback = "PDF文件";
  const source = String(originalName || fallback).normalize("NFC").split(/[\\/]/u).pop() || fallback;
  let base = source.replace(/\.pdf$/iu, "");
  base = base
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/gu, " ")
    .replace(/[. ]+$/gu, "")
    .trim();
  if (!base || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu.test(base)) base = fallback;
  const safeTarget = String(targetLabel || "目标").replace(/[^0-9A-Za-z.\u4e00-\u9fff-]/gu, "").slice(0, 20) || "目标";
  const suffix = `_${safeTarget}大小符合.pdf`;
  const maxBaseLength = Math.max(1, 124 - suffix.length);
  return `${base.slice(0, maxBaseLength)}${suffix}`;
}

export function createInitialState() {
  return Object.freeze({ status: "idle", runId: null, stage: null, percent: 0, fileName: "", result: null, errorCode: null });
}

function nextState(state, changes) {
  return Object.freeze({ ...state, ...changes });
}

export function reduceUploadState(state, event) {
  if (!state || !event?.type) throw new Error("非法状态转换：缺少状态或事件。");
  if (event.runId && state.runId && event.runId !== state.runId) return state;

  if (event.type === "FILE_SELECTED" && ["idle", "cancelled", "error", "file-selected", "success"].includes(state.status)) {
    return nextState(state, { status: "file-selected", fileName: event.fileName || "", runId: null, stage: null, percent: 0, result: null, errorCode: null });
  }
  if (event.type === "START" && state.status === "file-selected" && event.runId) {
    return nextState(state, { status: "processing", runId: event.runId, stage: "bootstrap", percent: 0, result: null, errorCode: null });
  }
  if (event.type === "PROGRESS" && state.status === "processing") {
    return nextState(state, { stage: event.stage, percent: Math.max(0, Math.min(100, Math.round(event.percent ?? 0))) });
  }
  if (event.type === "CANCEL" && state.status === "processing") {
    return nextState(state, { status: "cancelling", stage: "cleanup" });
  }
  if (event.type === "CANCELLED" && state.status === "cancelling") {
    return nextState(state, { status: "cancelled", stage: null, percent: 0, runId: null, result: null, errorCode: "CANCELLED" });
  }
  if (event.type === "RESULT" && state.status === "processing") {
    return nextState(state, { status: "success", stage: null, percent: 100, result: event.result, errorCode: null });
  }
  if (event.type === "ERROR" && PROCESSING_STATUSES.has(state.status)) {
    return nextState(state, { status: "error", stage: event.stage || state.stage, errorCode: event.code || "INVALID_PDF", result: null });
  }
  if (event.type === "RESET") return createInitialState();
  throw new Error(`非法状态转换：${state.status} -> ${event.type}`);
}

function elapsedBucket(elapsedMs) {
  if (elapsedMs < 1_000) return "<1s";
  if (elapsedMs < 5_000) return "1-5s";
  if (elapsedMs < 15_000) return "5-15s";
  if (elapsedMs < 60_000) return "15-60s";
  return ">=60s";
}

export function buildLocalDiagnostic(input = {}) {
  return {
    buildId: String(input.buildId || "unknown"),
    browser: String(input.browser || "unknown"),
    capabilities: {
      worker: input.capabilities?.worker === true,
      offscreenCanvas: input.capabilities?.offscreenCanvas === true
    },
    errorCode: String(input.errorCode || "unknown"),
    stage: String(input.stage || "unknown"),
    elapsedBucket: elapsedBucket(Number(input.elapsedMs) || 0),
    cleanupComplete: input.cleanupComplete === true
  };
}
