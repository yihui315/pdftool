import { describe, expect, it } from "vitest";
import {
  MAIN_MESSAGE_TYPES,
  PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  validateMainMessage,
  validateWorkerMessage
} from "../assets/js/pdf-protocol.mjs";

describe("run-scoped PDF worker protocol", () => {
  it("accepts valid bootstrap, start and cancel commands", () => {
    expect(validateMainMessage({ type: MAIN_MESSAGE_TYPES.BOOTSTRAP, protocolVersion: PROTOCOL_VERSION }).ok).toBe(true);
    expect(validateMainMessage({
      type: MAIN_MESSAGE_TYPES.START,
      protocolVersion: PROTOCOL_VERSION,
      runId: "run-1",
      sourceBuffer: new ArrayBuffer(4),
      targetBytes: 500_000
    }).ok).toBe(true);
    expect(validateMainMessage({
      type: MAIN_MESSAGE_TYPES.CANCEL,
      protocolVersion: PROTOCOL_VERSION,
      runId: "run-1"
    }).ok).toBe(true);
  });

  it("rejects malformed, unknown and wrong-version commands", () => {
    expect(validateMainMessage(null).ok).toBe(false);
    expect(validateMainMessage({ type: "GUESS", protocolVersion: PROTOCOL_VERSION }).ok).toBe(false);
    expect(validateMainMessage({ type: MAIN_MESSAGE_TYPES.BOOTSTRAP, protocolVersion: 99 }).ok).toBe(false);
    expect(validateMainMessage({ type: MAIN_MESSAGE_TYPES.START, protocolVersion: PROTOCOL_VERSION, runId: "", sourceBuffer: {}, targetBytes: 0 }).ok).toBe(false);
  });

  it("accepts every worker response shape", () => {
    const messages = [
      { type: WORKER_MESSAGE_TYPES.READY, protocolVersion: PROTOCOL_VERSION, capabilities: { worker: true } },
      { type: WORKER_MESSAGE_TYPES.PROGRESS, protocolVersion: PROTOCOL_VERSION, runId: "run-1", stage: "parsing", completed: 1, total: 2 },
      { type: WORKER_MESSAGE_TYPES.RESULT, protocolVersion: PROTOCOL_VERSION, runId: "run-1", method: "structural", resultBuffer: new ArrayBuffer(2), finalBytes: 2, pageCount: 1 },
      { type: WORKER_MESSAGE_TYPES.ERROR, protocolVersion: PROTOCOL_VERSION, runId: "run-1", stage: "parsing", code: "INVALID_PDF" },
      { type: WORKER_MESSAGE_TYPES.CANCELLED, protocolVersion: PROTOCOL_VERSION, runId: "run-1", cleanupComplete: true }
    ];
    messages.forEach((message) => expect(validateWorkerMessage(message).ok).toBe(true));
  });

  it("rejects invalid worker progress and result payloads", () => {
    expect(validateWorkerMessage({ type: WORKER_MESSAGE_TYPES.PROGRESS, protocolVersion: PROTOCOL_VERSION, runId: "run-1", stage: "wat", completed: 2, total: 1 }).ok).toBe(false);
    expect(validateWorkerMessage({ type: WORKER_MESSAGE_TYPES.RESULT, protocolVersion: PROTOCOL_VERSION, runId: "run-1", method: "magic", resultBuffer: {}, finalBytes: -1, pageCount: 0 }).ok).toBe(false);
  });
});
