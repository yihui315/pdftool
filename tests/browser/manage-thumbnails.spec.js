import { expect, test } from "@playwright/test";

async function loadDistinctPdf(page) {
  return page.evaluate(async () => {
    const pdf = await window.PDFLib.PDFDocument.create();
    for (let index = 0; index < 4; index += 1) {
      const page = pdf.addPage([320, 240]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 320,
        height: 240,
        color: window.PDFLib.rgb(index === 0 ? 0.1 : 0.8, index === 1 ? 0.2 : 0.7, index === 2 ? 0.3 : 0.6)
      });
      page.drawText(`MANAGER-PAGE-${index + 1}`, { x: 28, y: 105, size: 22, color: window.PDFLib.rgb(0, 0, 0) });
    }
    const bytes = await pdf.save();
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "页面管理测试.pdf", { type: "application/pdf" }));
    const input = document.querySelector("[data-file-input]");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return bytes.length;
  });
}

test("keeps page nodes stable while rendering real identity-bound thumbnails", async ({ page }) => {
  await page.goto("/manage.html");
  await page.waitForFunction(() => !!window.PDFLib);
  await loadDistinctPdf(page);
  await expect(page.locator("[data-page-id]")).toHaveCount(4);
  await expect.poll(() => page.locator("[data-page-id] canvas").first().evaluate((canvas) => canvas.width)).toBeGreaterThan(0);
  expect(await page.locator("[data-page-id] canvas").first().evaluate((canvas) => {
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 !== 3 && value < 245);
  })).toBe(true);

  await page.evaluate(() => {
    window.__firstManagerCard = document.querySelector("[data-page-id]");
    window.__firstManagerCanvas = window.__firstManagerCard.querySelector("canvas");
  });
  await page.locator("[data-page-id]").first().getByRole("button", { name: "旋转页面" }).click();
  await page.locator("[data-page-id]").first().getByRole("button", { name: "下移页面" }).click();
  expect(await page.evaluate(() => window.__firstManagerCard.isSameNode(document.querySelectorAll("[data-page-id]")[1]))).toBe(true);
  expect(await page.evaluate(() => window.__firstManagerCanvas.isSameNode(window.__firstManagerCard.querySelector("canvas")))).toBe(true);

  await windowToggle(page, "删除页面");
  await expect(page.locator("[data-page-id]").nth(1)).toHaveClass(/is-removed/);
  await windowToggle(page, "恢复页面");
  await expect(page.locator("[data-page-id]").nth(1)).not.toHaveClass(/is-removed/);

  await page.getByRole("button", { name: "导出新 PDF" }).click();
  await expect(page.getByRole("link", { name: "下载新 PDF" })).toBeVisible({ timeout: 15_000 });
});

async function windowToggle(page, accessibleName) {
  await page.locator("[data-page-id]").nth(1).getByRole("button", { name: accessibleName }).click();
}
