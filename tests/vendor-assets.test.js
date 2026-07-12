import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
let outputRoot;

describe("vendored PDF runtime assets", () => {
  beforeAll(() => {
    outputRoot = mkdtempSync(resolve(tmpdir(), "pdftool-vendor-"));
    execFileSync(
      process.execPath,
      [resolve(root, "scripts/copy-vendor.mjs"), "--out", outputRoot],
      { cwd: root }
    );
  }, 30_000);

  afterAll(() => {
    if (outputRoot) rmSync(outputRoot, { recursive: true, force: true });
  });

  it.each([
    "assets/vendor/pdf-lib.min.js",
    "assets/vendor/pdf-lib.esm.min.js",
    "assets/vendor/pdfjs/pdf.mjs",
    "assets/vendor/pdfjs/pdf.worker.mjs",
    "assets/vendor/pdfjs/cmaps/LICENSE",
    "assets/vendor/pdfjs/standard_fonts/LICENSE_FOXIT",
    "assets/vendor/pdfjs/wasm/openjpeg.wasm",
    "assets/vendor/pdfjs/iccs/CGATS001Compat-v2-micro.icc"
  ])("copies non-empty %s", (relativePath) => {
    const target = resolve(outputRoot, relativePath);
    expect(existsSync(target)).toBe(true);
    expect(statSync(target).size).toBeGreaterThan(0);
  });

  it("keeps PDF.js display and worker builds on the exact same version", () => {
    const display = readFileSync(resolve(outputRoot, "assets/vendor/pdfjs/pdf.mjs"), "utf8");
    const worker = readFileSync(resolve(outputRoot, "assets/vendor/pdfjs/pdf.worker.mjs"), "utf8");
    expect(display).toContain("6.1.200");
    expect(worker).toContain("6.1.200");
  });
});
