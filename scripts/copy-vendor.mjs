import { copyFile, cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const files = Object.freeze([
  ["node_modules/pdf-lib/dist/pdf-lib.min.js", "assets/vendor/pdf-lib.min.js"],
  ["node_modules/pdf-lib/dist/pdf-lib.esm.min.js", "assets/vendor/pdf-lib.esm.min.js"],
  ["node_modules/pdfjs-dist/build/pdf.mjs", "assets/vendor/pdfjs/pdf.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.mjs", "assets/vendor/pdfjs/pdf.worker.mjs"]
]);

const directories = Object.freeze(["cmaps", "standard_fonts", "wasm", "iccs"]);

async function assertNonEmpty(filename) {
  const details = await stat(filename);
  if (!details.isFile() || details.size === 0) {
    throw new Error(`Vendor asset is empty: ${filename}`);
  }
}

function parseOutRoot(argv) {
  const index = argv.indexOf("--out");
  if (index !== -1) {
    const value = argv[index + 1];
    if (!value) throw new Error("--out requires a target directory");
    return resolve(projectRoot, value);
  }

  const assignment = argv.find((argument) => argument.startsWith("--out="));
  if (assignment) {
    const value = assignment.slice("--out=".length);
    if (!value) throw new Error("--out requires a target directory");
    return resolve(projectRoot, value);
  }

  return projectRoot;
}

export async function copyVendor({ outRoot = projectRoot } = {}) {
  const outputRoot = resolve(outRoot);
  const vendorRoot = resolve(outputRoot, "assets/vendor");

  for (const [sourcePath, targetPath] of files) {
    const source = resolve(projectRoot, sourcePath);
    const target = resolve(outputRoot, targetPath);
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

  return outputRoot;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const outRoot = parseOutRoot(process.argv.slice(2));
  await copyVendor({ outRoot });
  console.log(
    `Copied locked pdf-lib and PDF.js runtime assets to ${resolve(outRoot, "assets/vendor")}.`
  );
}
