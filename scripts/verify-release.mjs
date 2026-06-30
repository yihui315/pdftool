import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
  "index.html",
  "upload-ready.html",
  "manage.html",
  "privacy.html",
  "sitemap.xml",
  "assets/css/tailwind.min.css",
  "assets/css/styles.css",
  "assets/js/upload-ready.js",
  "assets/js/upload-ready-worker.mjs",
  "assets/js/upload-ready-processing.mjs",
  "assets/js/pdf-preview.js",
  "assets/js/pdf-worker-entry.mjs",
  "assets/vendor/pdf-lib.min.js",
  "assets/vendor/pdf-lib.esm.min.js",
  "assets/vendor/pdfjs/pdf.mjs",
  "assets/vendor/pdfjs/pdf.worker.mjs"
];
const requiredDirectories = [
  "assets/vendor/pdfjs/cmaps",
  "assets/vendor/pdfjs/standard_fonts",
  "assets/vendor/pdfjs/wasm",
  "assets/vendor/pdfjs/iccs"
];

for (const relative of requiredFiles) {
  const details = await stat(path.join(root, relative)).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw new Error(`Missing or empty release file: ${relative}`);
  }
}
for (const relative of requiredDirectories) {
  const entries = await readdir(path.join(root, relative)).catch(() => []);
  if (entries.length === 0) throw new Error(`Missing or empty release directory: ${relative}`);
}

const assistant = await readFile(path.join(root, "upload-ready.html"), "utf8");
if (!assistant.includes('data-privacy-proof="verified"')) {
  throw new Error("Privacy proof must be explicitly verified for the release build.");
}
if (/https?:\/\/[^"']*(?:pdfjs|pdf-lib)/iu.test(assistant)) {
  throw new Error("Runtime PDF dependencies must use first-party paths.");
}

console.log(`Verified ${requiredFiles.length} release files and ${requiredDirectories.length} asset directories.`);

