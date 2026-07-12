import path from "node:path";
import { describe, expect, test } from "vitest";
import { shouldCopyProjectAsset } from "../scripts/build-site.mjs";

const assetsRoot = path.resolve(import.meta.dirname, "..", "assets");

describe("project asset copy filter", () => {
  test("leaves vendored runtimes to the locked dependency copy step", () => {
    expect(shouldCopyProjectAsset(assetsRoot, assetsRoot)).toBe(true);
    expect(
      shouldCopyProjectAsset(path.join(assetsRoot, "vendor"), assetsRoot)
    ).toBe(false);
    expect(
      shouldCopyProjectAsset(
        path.join(assetsRoot, "vendor", "pdfjs", "pdf.mjs"),
        assetsRoot
      )
    ).toBe(false);
    expect(
      shouldCopyProjectAsset(path.join(assetsRoot, "js", "site.js"), assetsRoot)
    ).toBe(true);
  });
});
