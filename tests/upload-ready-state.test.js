import { describe, expect, it } from "vitest";
import {
  buildLocalDiagnostic,
  createInitialState,
  formatDecimalBytes,
  getSafeTargetBytes,
  normalizeDownloadName,
  parseTargetBytes,
  reduceUploadState
} from "../assets/js/upload-ready-state.js";

describe("upload-ready state helpers", () => {
  it.each([
    ["200", "KB", 200_000],
    ["500", "KB", 500_000],
    ["1", "MB", 1_000_000],
    ["1.25", "MB", 1_250_000],
    ["100.01", "KB", 100_010]
  ])("parses %s %s as strict decimal bytes", (value, unit, expected) => {
    expect(parseTargetBytes(value, unit)).toBe(expected);
  });

  it.each(["", "0", "-1", "1.234", "1,5", "abc", "Infinity"])(
    "rejects invalid target value %s",
    (value) => expect(() => parseTargetBytes(value, "MB")).toThrowError(/目标大小/)
  );

  it("enforces the 100KB through 20MB boundary", () => {
    expect(parseTargetBytes("100", "KB")).toBe(100_000);
    expect(parseTargetBytes("20", "MB")).toBe(20_000_000);
    expect(() => parseTargetBytes("99.99", "KB")).toThrowError(/100 KB/);
    expect(() => parseTargetBytes("20.01", "MB")).toThrowError(/20 MB/);
  });

  it("floors the 99 percent safety target", () => {
    expect(getSafeTargetBytes(500_001)).toBe(495_000);
  });

  it("formats decimal units without switching to binary units", () => {
    expect(formatDecimalBytes(486_000)).toBe("486 KB");
    expect(formatDecimalBytes(2_400_000)).toBe("2.4 MB");
  });

  it("normalizes hostile and reserved download names", () => {
    const name = normalizeDownloadName("../CON:<script>\u202E.pdf", "500KB");
    expect(name).toMatch(/_500KB大小符合\.pdf$/);
    expect(name).not.toMatch(/[<>:"/\\|?*\u0000-\u001f\u202e]/iu);
    expect(name.length).toBeLessThanOrEqual(124);
  });

  it("accepts only legal run-scoped state transitions", () => {
    let state = createInitialState();
    state = reduceUploadState(state, { type: "FILE_SELECTED", fileName: "a.pdf" });
    state = reduceUploadState(state, { type: "START", runId: "run-1" });
    state = reduceUploadState(state, { type: "PROGRESS", runId: "run-1", stage: "parsing", percent: 10 });
    const stale = reduceUploadState(state, { type: "RESULT", runId: "run-old", result: {} });
    expect(stale).toBe(state);
    const cancelling = reduceUploadState(state, { type: "CANCEL", runId: "run-1" });
    expect(cancelling.status).toBe("cancelling");
    const cancelled = reduceUploadState(cancelling, { type: "CANCELLED", runId: "run-1" });
    expect(cancelled.status).toBe("cancelled");
    expect(() => reduceUploadState(cancelled, { type: "RESULT", runId: "run-1", result: {} })).toThrowError(/非法状态转换/);
  });

  it("builds an allowlisted diagnostic without file-derived fields", () => {
    const report = buildLocalDiagnostic({
      buildId: "1.0.0.0-test",
      browser: "Chromium 149",
      capabilities: { worker: true, offscreenCanvas: true },
      errorCode: "INVALID_PDF",
      stage: "parsing",
      elapsedMs: 9234,
      cleanupComplete: true,
      fileName: "secret.pdf",
      fileSize: 12345
    });
    expect(report).toEqual({
      buildId: "1.0.0.0-test",
      browser: "Chromium 149",
      capabilities: { worker: true, offscreenCanvas: true },
      errorCode: "INVALID_PDF",
      stage: "parsing",
      elapsedBucket: "5-15s",
      cleanupComplete: true
    });
    expect(JSON.stringify(report)).not.toContain("secret.pdf");
    expect(JSON.stringify(report)).not.toContain("12345");
  });
});
