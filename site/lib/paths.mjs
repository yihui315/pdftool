import {
  alternatePaths,
  canonicalPath,
  outputPath
} from "../config/routes.mjs";

export const DEFAULT_ORIGIN = "https://pdftool.work";

const EXTERNAL_URL_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function normalizedOrigin(origin) {
  const url = new URL(origin);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.href;
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch (error) {
    throw new Error(`Invalid URL path segment: ${segment}`, { cause: error });
  }
}

function normalizePublicPath(path, fieldName) {
  if (typeof path !== "string" && !(path instanceof URL)) {
    throw new Error(`${fieldName} must be a string URL path`);
  }

  const value = String(path).trim().replaceAll("\\", "/");
  if (value === "") throw new Error(`${fieldName} must not be empty`);
  if (value.startsWith("//") || EXTERNAL_URL_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a root-relative public path`);
  }
  if (value.includes("\0")) {
    throw new Error(`${fieldName} must not contain null bytes`);
  }
  if (value.includes("?") || value.includes("#")) {
    throw new Error(`${fieldName} must not include query strings or fragments`);
  }

  const segments = value
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment.length > 0);
  const hasTrailingSlash = value.endsWith("/") && segments.length > 0;

  for (const segment of segments) {
    const decoded = decodeSegment(segment);
    if (decoded === "." || decoded === "..") {
      throw new Error(`${fieldName} must not contain traversal segments`);
    }
  }

  return `/${segments.join("/")}${hasTrailingSlash ? "/" : ""}`;
}

/** Return a normalized root-absolute URL for a first-party public asset. */
export function assetUrl(path) {
  return normalizePublicPath(path, "Asset path");
}

/** Return an absolute URL on the production origin from a first-party path. */
export function absoluteUrl(path, origin = DEFAULT_ORIGIN) {
  if (typeof path !== "string") {
    throw new Error("URL path must be a string");
  }

  const value = path.trim();
  if (value === "") throw new Error("URL path must not be empty");
  if (value.startsWith("//") || EXTERNAL_URL_PATTERN.test(value)) {
    throw new Error("URL path must be a first-party root-relative path");
  }

  return new URL(normalizePublicPath(value, "URL path"), normalizedOrigin(origin)).href;
}

export { alternatePaths, canonicalPath, outputPath };
