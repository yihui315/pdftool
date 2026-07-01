export const RASTER_CANDIDATES = Object.freeze([
  Object.freeze({ dpi: 144, jpegQuality: 0.84 }),
  Object.freeze({ dpi: 132, jpegQuality: 0.79 }),
  Object.freeze({ dpi: 120, jpegQuality: 0.74 }),
  Object.freeze({ dpi: 108, jpegQuality: 0.68 }),
  Object.freeze({ dpi: 96, jpegQuality: 0.62 }),
  Object.freeze({ dpi: 84, jpegQuality: 0.55 }),
  Object.freeze({ dpi: 72, jpegQuality: 0.47 }),
  Object.freeze({ dpi: 60, jpegQuality: 0.38 })
]);

const MAX_INPUT_BYTES = 30_000_000;
const MAX_PAGE_COUNT = 100;
const MAX_ESTIMATED_BYTES = 160_000_000;
const FIXED_PROCESSING_BYTES = 64_000_000 + 32_000_000 + (2 * 200_000 * 4 * 2);

export function selectCompliantCandidate(candidates, safeTargetBytes) {
  if (!Array.isArray(candidates) || !Number.isInteger(safeTargetBytes)) return null;
  return candidates.find((candidate) => Number.isFinite(candidate?.bytes) && candidate.bytes <= safeTargetBytes) || null;
}

export function estimateRunBytes(inputBytes) {
  if (!Number.isFinite(inputBytes) || inputBytes < 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(inputBytes * 3) + FIXED_PROCESSING_BYTES;
}

export function isWithinProcessingLimits({ inputBytes, pageCount }) {
  return Number.isInteger(inputBytes)
    && inputBytes > 0
    && inputBytes <= MAX_INPUT_BYTES
    && Number.isInteger(pageCount)
    && pageCount > 0
    && pageCount <= MAX_PAGE_COUNT
    && estimateRunBytes(inputBytes) <= MAX_ESTIMATED_BYTES;
}

export function classifyPdfFeatures(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) return null;
  const source = new TextDecoder("latin1").decode(bytes);
  if (/\/(?:Type|FT)\s*\/Sig\b/u.test(source)) return "UNSUPPORTED_SIGNATURE";
  if (/\/(?:AcroForm|XFA)\b/u.test(source)) return "UNSUPPORTED_FORM";
  if (/\/(?:JavaScript|JS|EmbeddedFiles|RichMedia|Launch|Sound|Movie)\b/u.test(source)) {
    return "UNSUPPORTED_ACTIVE_CONTENT";
  }
  return null;
}

export function geometryMatches(expected, actual, tolerance = 1) {
  if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length === 0 || expected.length !== actual.length) {
    return false;
  }
  return expected.every((page, index) => {
    const output = actual[index];
    return Number.isFinite(page?.width)
      && Number.isFinite(page?.height)
      && Number.isFinite(output?.width)
      && Number.isFinite(output?.height)
      && Math.abs(page.width - output.width) <= tolerance
      && Math.abs(page.height - output.height) <= tolerance;
  });
}
