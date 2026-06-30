import { expect, test } from "@playwright/test";

test("boots the production module worker and returns a validated one-page result", async ({ page }) => {
  await page.goto("/tests/browser/fixtures/worker-harness.html");
  await page.waitForFunction(() => !!window.workerHarness);
  await page.evaluate(() => window.workerHarness.bootstrap());
  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "READY"))).toBe(true);

  const detachedLength = await page.evaluate(async () => {
    const source = await window.workerHarness.createPdf();
    return window.workerHarness.start("foundation-run", source, 500_000);
  });
  expect(detachedLength).toBe(0);

  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "RESULT"))).toBe(true);
  const result = await page.evaluate(() => window.workerHarness.events.find((event) => event.type === "RESULT"));
  expect(result.method).toBe("original");
  expect(result.pageCount).toBe(1);
  expect(result.finalBytes).toBeGreaterThan(0);
  expect(await page.evaluate(() => {
    const message = window.workerHarness.events.find((event) => event.type === "RESULT");
    return message.resultBuffer instanceof ArrayBuffer
      && window.workerHarness.validateWorkerMessage(message).ok;
  })).toBe(true);
});

test("acknowledges cancellation and does not publish a stale result", async ({ page }) => {
  await page.goto("/tests/browser/fixtures/worker-harness.html");
  await page.waitForFunction(() => !!window.workerHarness);
  await page.evaluate(() => window.workerHarness.bootstrap());
  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "READY"))).toBe(true);

  await page.evaluate(async () => {
    const source = await window.workerHarness.createPdf();
    window.workerHarness.start("cancel-run", source, 100_000);
    window.workerHarness.cancel("cancel-run");
  });
  await expect.poll(() => page.evaluate(() => window.workerHarness.events.some((event) => event.type === "CANCELLED"))).toBe(true);
  await page.waitForTimeout(250);
  const types = await page.evaluate(() => window.workerHarness.events.filter((event) => event.runId === "cancel-run").map((event) => event.type));
  expect(types).not.toContain("RESULT");
});
