import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const publicPages = Object.freeze([
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
]);

const sharedRequiredFiles = Object.freeze([
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
]);

const generatedRequiredFiles = Object.freeze([
  "ads.txt",
  "robots.txt",
  "release-manifest.json",
  ...sharedRequiredFiles
]);

const requiredDirectories = Object.freeze([
  "assets/vendor/pdfjs/cmaps",
  "assets/vendor/pdfjs/standard_fonts",
  "assets/vendor/pdfjs/wasm",
  "assets/vendor/pdfjs/iccs"
]);

const remotePdfRuntimePattern = /https?:\/\/[^"']*(?:pdf(?:\.min)?\.js|pdfjs|pdf-lib)/iu;

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

async function assertNonEmptyFile(root, relative) {
  const details = await stat(path.join(root, relative)).catch(() => null);
  if (!details?.isFile() || details.size === 0) {
    throw new Error(`Missing or empty release file: ${relative}`);
  }
}

async function assertNonEmptyDirectory(root, relative) {
  const entries = await readdir(path.join(root, relative)).catch(() => []);
  if (entries.length === 0) {
    throw new Error(`Missing or empty release directory: ${relative}`);
  }
}

async function listHtmlFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listHtmlFiles(root, filename)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(toPosix(path.relative(root, filename)));
    }
  }
  return files.sort();
}

async function assertNoRemotePdfRuntime(root, pages) {
  for (const page of pages) {
    const html = await readFile(path.join(root, page), "utf8");
    if (remotePdfRuntimePattern.test(html)) {
      throw new Error(
        `Remote PDF runtime found in ${page}; production dependencies must be first-party.`
      );
    }
  }
}

async function verifyGeneratedManifest(root) {
  const manifestPath = path.join(root, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = manifest.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("release-manifest.json must include a non-empty files list.");
  }
  if (files.some((file) => path.isAbsolute(file) || file.includes("\\") || file.includes(".."))) {
    throw new Error("release-manifest.json contains an unsafe file path.");
  }
  expectSorted(files, "release-manifest.json files");

  const details = manifest.fileDetails;
  if (!Array.isArray(details) || details.length !== files.length) {
    throw new Error("release-manifest.json must include one fileDetails entry per file.");
  }

  for (const detail of details) {
    if (!files.includes(detail.path)) {
      throw new Error(`release-manifest.json has unlisted file detail: ${detail.path}`);
    }
    const buffer = await readFile(path.join(root, detail.path));
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    if (detail.bytes !== buffer.length || detail.sha256 !== sha256) {
      throw new Error(`release-manifest.json hash mismatch for ${detail.path}`);
    }
  }

  return manifest;
}

function expectSorted(values, label) {
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(values) !== JSON.stringify(sorted)) {
    throw new Error(`${label} must be sorted.`);
  }
}

export async function verifyRelease(releaseRoot = projectRoot) {
  const root = resolve(releaseRoot);
  const generatedRelease = root !== projectRoot;
  const requiredFiles = generatedRelease
    ? generatedRequiredFiles
    : Object.freeze([...publicPages, ...sharedRequiredFiles]);

  for (const relative of requiredFiles) {
    await assertNonEmptyFile(root, relative);
  }
  for (const relative of requiredDirectories) {
    await assertNonEmptyDirectory(root, relative);
  }

  if (generatedRelease) {
    await verifyGeneratedManifest(root);
    await assertNoRemotePdfRuntime(root, await listHtmlFiles(root));
  } else {
    const assistant = await readFile(path.join(root, "upload-ready.html"), "utf8");
    if (!assistant.includes('data-privacy-proof="verified"')) {
      throw new Error("Privacy proof must be explicitly verified for the release build.");
    }
    if (/https?:\/\/[^"']*(?:pdfjs|pdf-lib)/iu.test(assistant)) {
      throw new Error("Runtime PDF dependencies must use first-party paths.");
    }
    await assertNoRemotePdfRuntime(root, publicPages);
  }

  return {
    root,
    checkedFiles: requiredFiles.length,
    checkedDirectories: requiredDirectories.length
  };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const result = await verifyRelease(process.argv[2] ?? projectRoot);
  console.log(
    `Verified ${result.checkedFiles} release files and ${result.checkedDirectories} asset directories.`
  );
}
