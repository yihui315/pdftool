import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, "node_modules/pdf-lib/dist/pdf-lib.min.js");
const target = resolve(projectRoot, "assets/vendor/pdf-lib.min.js");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log("Copied pdf-lib.min.js to assets/vendor.");
