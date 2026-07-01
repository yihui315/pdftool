import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicPages = [
  "index.html",
  "upload-ready.html",
  "merge.html",
  "split.html",
  "manage.html",
  "compress.html",
  "pdf-to-jpg.html",
  "jpg-to-pdf.html",
  "pdf-rotate.html",
  "pdf-unlock.html",
  "about.html",
  "privacy.html",
  "blog-merge-pdf.html",
  "blog-pdf-tips.html",
  "blog-jpg-to-pdf.html"
];
const requiredFiles = [
  ...publicPages,
  "sitemap.xml",
  "assets/favicon.svg",
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
for (const page of publicPages) {
  const html = await readFile(path.join(root, page), "utf8");
  if (/https?:\/\/[^"']*(?:pdf(?:\.min)?\.js|pdfjs|pdf-lib)/iu.test(html)) {
    throw new Error(`Remote PDF runtime found in ${page}; production dependencies must be first-party.`);
  }
}

console.log(`Verified ${requiredFiles.length} release files and ${requiredDirectories.length} asset directories.`);
