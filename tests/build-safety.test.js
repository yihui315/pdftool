import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { getLocale } from "../site/config/locales.mjs";
import { getRoute } from "../site/config/routes.mjs";
import {
  assertSafeOutputRoot,
  buildSite,
  parseBuildSiteCliOptions
} from "../scripts/build-site.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

async function fileExists(filename) {
  return access(filename)
    .then(() => true)
    .catch(() => false);
}

describe("build output safety", () => {
  test("rejects repository root output before replacing anything", async () => {
    const packageJson = path.join(repoRoot, "package.json");
    const packageJsonBefore = await readFile(packageJson, "utf8");
    const unsafeStaging = path.resolve(
      path.dirname(repoRoot),
      `${path.basename(repoRoot)}.next`
    );

    await expect(
      buildSite({
        routes: [getRoute("home")],
        locales: [getLocale("en")],
        contentRoot: path.join(repoRoot, "tests/fixtures/content"),
        outDir: repoRoot
      })
    ).rejects.toThrow(/unsafe output root/i);

    await expect(readFile(packageJson, "utf8")).resolves.toBe(packageJsonBefore);
    await expect(fileExists(unsafeStaging)).resolves.toBe(false);
  });

  test("rejects missing or empty CLI output values", () => {
    expect(() => parseBuildSiteCliOptions(["--out"])).toThrow(/--out requires/i);
    expect(() => parseBuildSiteCliOptions(["--out="])).toThrow(/--out requires/i);
  });

  test("rejects ancestor and filesystem-root output directories", () => {
    expect(() => assertSafeOutputRoot(path.dirname(repoRoot))).toThrow(
      /unsafe output root/i
    );
    expect(() => assertSafeOutputRoot(path.parse(repoRoot).root)).toThrow(
      /unsafe output root/i
    );
  });
});
