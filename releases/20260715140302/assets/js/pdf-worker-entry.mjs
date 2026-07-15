import "./pdfjs-polyfills.mjs";

// When PDF.js falls back inside our outer processing worker, prevent the
// vendor worker module from auto-binding to the outer worker's parent port.
// PDF.js will bind the exported handler to its own LoopbackPort instead.
const isOuterFallback = globalThis.__PDFTOOL_OUTER_WORKER__ === true;
const parentPostMessage = isOuterFallback ? globalThis.postMessage : null;
if (isOuterFallback) globalThis.postMessage = undefined;
const pdfWorker = await import("../vendor/pdfjs/pdf.worker.mjs");
if (isOuterFallback) globalThis.postMessage = parentPostMessage;

globalThis.pdfjsWorker = {
  WorkerMessageHandler: pdfWorker.WorkerMessageHandler
};

export const WorkerMessageHandler = pdfWorker.WorkerMessageHandler;
