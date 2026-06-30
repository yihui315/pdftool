import { describe, expect, it } from "vitest";
import {
  RASTER_CANDIDATES,
  classifyPdfFeatures,
  estimateRunBytes,
  geometryMatches,
  isWithinProcessingLimits,
  selectCompliantCandidate
} from "../assets/js/upload-ready-processing.mjs";

describe("upload-ready processing policy", () => {
  it("keeps at most eight raster candidates in descending quality order", () => {
    expect(RASTER_CANDIDATES).toHaveLength(8);
    for (let index = 1; index < RASTER_CANDIDATES.length; index += 1) {
      expect(RASTER_CANDIDATES[index].dpi).toBeLessThan(RASTER_CANDIDATES[index - 1].dpi);
      expect(RASTER_CANDIDATES[index].jpegQuality).toBeLessThan(RASTER_CANDIDATES[index - 1].jpegQuality);
    }
  });

  it("selects the first high-quality candidate below the safety target", () => {
    const candidates = [
      { bytes: 510_000, id: "high" },
      { bytes: 490_000, id: "balanced" },
      { bytes: 420_000, id: "small" }
    ];
    expect(selectCompliantCandidate(candidates, 495_000)?.id).toBe("balanced");
    expect(selectCompliantCandidate(candidates, 400_000)).toBeNull();
  });

  it("applies the conservative 160MB processing estimate", () => {
    expect(estimateRunBytes(10_000_000)).toBe(129_200_000);
    expect(isWithinProcessingLimits({ inputBytes: 10_000_000, pageCount: 100 })).toBe(true);
    expect(isWithinProcessingLimits({ inputBytes: 22_000_000, pageCount: 1 })).toBe(false);
    expect(isWithinProcessingLimits({ inputBytes: 1_000_000, pageCount: 101 })).toBe(false);
  });

  it.each([
    ["%PDF /Type /Sig", "UNSUPPORTED_SIGNATURE"],
    ["%PDF /AcroForm 8 0 R", "UNSUPPORTED_FORM"],
    ["%PDF /XFA [", "UNSUPPORTED_FORM"],
    ["%PDF /JavaScript 9 0 R", "UNSUPPORTED_ACTIVE_CONTENT"],
    ["%PDF /EmbeddedFiles 4 0 R", "UNSUPPORTED_ACTIVE_CONTENT"],
    ["%PDF /RichMedia 2 0 R", "UNSUPPORTED_ACTIVE_CONTENT"]
  ])("classifies unsupported marker %s", (source, expected) => {
    expect(classifyPdfFeatures(new TextEncoder().encode(source))).toBe(expected);
  });

  it("does not reject an ordinary PDF header", () => {
    expect(classifyPdfFeatures(new TextEncoder().encode("%PDF-1.7 /Type /Page"))).toBeNull();
  });

  it("compares page geometry with a small tolerance", () => {
    expect(geometryMatches([{ width: 595, height: 842 }], [{ width: 595.4, height: 841.6 }])).toBe(true);
    expect(geometryMatches([{ width: 595, height: 842 }], [{ width: 612, height: 792 }])).toBe(false);
    expect(geometryMatches([{ width: 595, height: 842 }], [])).toBe(false);
  });
});
