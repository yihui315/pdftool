import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tempRoots = [];

async function countHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await countHtmlFiles(filename);
    if (entry.isFile() && entry.name.endsWith(".html")) total += 1;
  }
  return total;
}

describe("AdSense release policy check", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.map((directory) => rm(directory, { recursive: true, force: true }))
    );
    tempRoots.length = 0;
  });

  test("scans only the built release and supports an isolated report path", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "pdftool-adsense-"));
    tempRoots.push(temporaryRoot);
    const reportPath = path.join(temporaryRoot, "report.json");
    const expectedPages = await countHtmlFiles(path.join(repoRoot, "dist"));

    const output = execFileSync(
      process.execPath,
      [path.join(repoRoot, "scripts", "check-adsense-policy.mjs")],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env, ADSENSE_REPORT_PATH: reportPath }
      }
    );

    expect(output).toContain(`Pages checked: ${expectedPages}`);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    expect(report.total_pages_checked).toBe(expectedPages);
  });
});
