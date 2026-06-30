import { expect, test } from "@playwright/test";

async function bootstrap(page) {
  await page.goto("/tests/browser/fixtures/worker-harness.html");
  await page.waitForFunction(() => !!window.workerHarness);
  await page.evaluate(() => window.workerHarness.bootstrap());
  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "READY"))).toBe(true);
}

test("uses a validated structural rewrite when it safely meets 100KB", async ({ page }) => {
  await bootstrap(page);
  const sourceBytes = await page.evaluate(async () => {
    const source = await window.workerHarness.createStructuralPdf();
    const bytes = source.byteLength;
    window.workerHarness.start("structural-run", source, 100_000);
    return bytes;
  });
  expect(sourceBytes).toBeGreaterThan(99_000);

  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "RESULT")), { timeout: 30_000 }).toBe(true);
  const result = await page.evaluate(() => {
    const event = window.workerHarness.events.find((item) => item.type === "RESULT");
    return { method: event.method, finalBytes: event.finalBytes, pageCount: event.pageCount, renderProbeNonBlank: event.renderProbeNonBlank };
  });
  expect(result).toMatchObject({ method: "structural", pageCount: 100, renderProbeNonBlank: true });
  expect(result.finalBytes).toBeLessThanOrEqual(99_000);
});

test("builds and validates a raster candidate below the 500KB safety target", async ({ page }) => {
  await bootstrap(page);
  const sourceBytes = await page.evaluate(async () => {
    const source = await window.workerHarness.createImagePdf();
    const bytes = source.byteLength;
    window.workerHarness.start("raster-run", source, 500_000);
    return bytes;
  });
  expect(sourceBytes).toBeGreaterThan(500_000);

  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "RESULT")), { timeout: 40_000 }).toBe(true);
  const result = await page.evaluate(() => {
    const event = window.workerHarness.events.find((item) => item.type === "RESULT");
    return { method: event.method, finalBytes: event.finalBytes, pageCount: event.pageCount, renderProbeNonBlank: event.renderProbeNonBlank };
  });
  expect(result).toMatchObject({ method: "raster", pageCount: 1, renderProbeNonBlank: true });
  expect(result.finalBytes).toBeLessThanOrEqual(495_000);
});
