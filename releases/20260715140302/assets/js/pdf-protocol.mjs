export const PROTOCOL_VERSION = 1;

export const MAIN_MESSAGE_TYPES = Object.freeze({
  BOOTSTRAP: "BOOTSTRAP",
  START: "START",
  CANCEL: "CANCEL"
});

export const WORKER_MESSAGE_TYPES = Object.freeze({
  READY: "READY",
  PROGRESS: "PROGRESS",
  RESULT: "RESULT",
  ERROR: "ERROR",
  CANCELLED: "CANCELLED"
});

export const PROCESSING_STAGES = Object.freeze([
  "bootstrap",
  "parsing",
  "structural",
  "rasterizing",
  "validating",
  "cleanup"
]);

export const ERROR_CODES = Object.freeze([
  "PDF_LIB_UNAVAILABLE",
  "PDFJS_ASSET_LOAD_FAILED",
  "WORKER_START_FAILED",
  "INVALID_PDF",
  "ENCRYPTED_PDF",
  "UNSUPPORTED_SIGNATURE",
  "UNSUPPORTED_FORM",
  "UNSUPPORTED_ACTIVE_CONTENT",
  "RESOURCE_LIMIT",
  "MEMORY_LIMIT",
  "PROCESSING_TIMEOUT",
  "CANCELLED",
  "TARGET_UNREACHABLE",
  "OUTPUT_VALIDATION_FAILED",
  "PREVIEW_RENDER_FAILED",
  "DOWNLOAD_URL_FAILED"
]);

const resultMethods = new Set(["original", "structural", "raster"]);
const stages = new Set(PROCESSING_STAGES);
const errorCodes = new Set(ERROR_CODES);

function baseMessage(message) {
  return !!message
    && typeof message === "object"
    && Number.isInteger(message.protocolVersion)
    && message.protocolVersion === PROTOCOL_VERSION
    && typeof message.type === "string";
}

function validRunId(runId) {
  return typeof runId === "string" && runId.length > 0 && runId.length <= 128;
}

export function validateMainMessage(message) {
  if (!baseMessage(message) || !Object.values(MAIN_MESSAGE_TYPES).includes(message.type)) {
    return { ok: false, reason: "invalid-envelope" };
  }
  if (message.type === MAIN_MESSAGE_TYPES.BOOTSTRAP) return { ok: true };
  if (!validRunId(message.runId)) return { ok: false, reason: "invalid-run-id" };
  if (message.type === MAIN_MESSAGE_TYPES.CANCEL) return { ok: true };
  if (!(message.sourceBuffer instanceof ArrayBuffer) || message.sourceBuffer.byteLength === 0) {
    return { ok: false, reason: "invalid-source-buffer" };
  }
  if (!Number.isInteger(message.targetBytes) || message.targetBytes < 100_000 || message.targetBytes > 20_000_000) {
    return { ok: false, reason: "invalid-target" };
  }
  return { ok: true };
}

export function validateWorkerMessage(message) {
  if (!baseMessage(message) || !Object.values(WORKER_MESSAGE_TYPES).includes(message.type)) {
    return { ok: false, reason: "invalid-envelope" };
  }
  if (message.type === WORKER_MESSAGE_TYPES.READY) {
    return message.capabilities && typeof message.capabilities === "object"
      ? { ok: true }
      : { ok: false, reason: "invalid-capabilities" };
  }
  if (!validRunId(message.runId)) return { ok: false, reason: "invalid-run-id" };
  if (message.type === WORKER_MESSAGE_TYPES.PROGRESS) {
    const valid = stages.has(message.stage)
      && Number.isFinite(message.completed)
      && Number.isFinite(message.total)
      && message.total > 0
      && message.completed >= 0
      && message.completed <= message.total;
    return valid ? { ok: true } : { ok: false, reason: "invalid-progress" };
  }
  if (message.type === WORKER_MESSAGE_TYPES.RESULT) {
    const valid = resultMethods.has(message.method)
      && message.resultBuffer instanceof ArrayBuffer
      && Number.isInteger(message.finalBytes)
      && message.finalBytes > 0
      && Number.isInteger(message.pageCount)
      && message.pageCount > 0;
    return valid ? { ok: true } : { ok: false, reason: "invalid-result" };
  }
  if (message.type === WORKER_MESSAGE_TYPES.ERROR) {
    return stages.has(message.stage) && errorCodes.has(message.code)
      ? { ok: true }
      : { ok: false, reason: "invalid-error" };
  }
  return typeof message.cleanupComplete === "boolean"
    ? { ok: true }
    : { ok: false, reason: "invalid-cancelled" };
}
