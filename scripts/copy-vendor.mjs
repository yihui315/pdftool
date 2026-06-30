import { copyFile, cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = resolve(projectRoot, "assets/vendor");

const files = [
  ["node_modules/pdf-lib/dist/pdf-lib.min.js", "assets/vendor/pdf-lib.min.js"],
  ["node_modules/pdf-lib/dist/pdf-lib.esm.min.js", "assets/vendor/pdf-lib.esm.min.js"],
  ["node_modules/pdfjs-dist/build/pdf.mjs", "assets/vendor/pdfjs/pdf.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.mjs", "assets/vendor/pdfjs/pdf.worker.mjs"]
];

const directories = ["cmaps", "standard_fonts", "wasm", "iccs"];

async function assertNonEmpty(path) {
  const details = await stat(path);
  if (!details.isFile() || details.size === 0) throw new Error(`Vendor asset is empty: ${path}`);
}

for (const [sourcePath, targetPath] of files) {
  const source = resolve(projectRoot, sourcePath);
  const target = resolve(projectRoot, targetPath);
  await assertNonEmpty(source);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  await assertNonEmpty(target);
}

for (const directory of directories) {
  const source = resolve(projectRoot, "node_modules/pdfjs-dist", directory);
  const target = resolve(vendorRoot, "pdfjs", directory);
  await cp(source, target, { recursive: true, force: true });
}

console.log("Copied locked pdf-lib and PDF.js runtime assets to assets/vendor.");
