import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixturePath = path.resolve("tests/browser/fixtures/preview-harness.html");

test("renders nonblank pages with bounded thumbnail concurrency and LRU cleanup", async ({ page }) => {
  await page.goto("/");
  await page.setContent(await readFile(fixturePath, "utf8"), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForFunction(() => !!window.previewHarness);
  expect(await page.evaluate(() => window.previewHarness.open())).toBe(14);

  const metrics = await page.evaluate(() => window.previewHarness.renderAll());
  expect(metrics.peakConcurrency).toBeLessThanOrEqual(2);
  expect(metrics.cacheEntries).toBeLessThanOrEqual(12);
  expect(metrics.cacheBytes).toBeLessThanOrEqual(32_000_000);
  expect(await page.evaluate(() => window.previewHarness.firstPixels())).toMatchObject({ nonBlank: true });
  expect(await page.evaluate(() => window.previewHarness.canvases[0].width)).toBe(0);

  expect(await page.evaluate(() => window.previewHarness.destroy())).toBe(true);
  expect(await page.evaluate(() => window.previewHarness.queue.getMetrics().trackedCanvases)).toBe(0);
});
