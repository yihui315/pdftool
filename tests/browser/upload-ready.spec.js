import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function onePagePdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([320, 240]);
  page.drawText("UPLOAD-READY-ORIGINAL", { x: 24, y: 170, size: 18 });
  return Buffer.from(await document.save());
}

test("completes the original-file path with inert filename and a local download", async ({ page }) => {
  await page.goto("/upload-ready.html");
  await expect(page.getByRole("heading", { level: 1, name: "PDF 上传准备工具" })).toBeVisible();
  await expect(page.locator("#analysis-size")).toHaveText("—");

  const hostileName = '<img src=x onerror="window.__xss=1">申请表.pdf';
  await page.locator("[data-file-input]").setInputFiles({
    name: hostileName,
    mimeType: "application/pdf",
    buffer: await onePagePdf()
  });
  await expect(page.locator("[data-selected-name]")).toHaveText(hostileName);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(page.locator("[data-workspace] img")).toHaveCount(0);

  await page.getByRole("button", { name: "开始准备 PDF" }).click();
  await expect(page.getByRole("heading", { name: "原文件已经符合大小限制" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-result-method]")).toHaveText("未重写原文件");
  const download = page.getByRole("link", { name: "下载原文件" });
  await expect(download).toBeEnabled();
  await expect(download).toHaveAttribute("download", /500KB大小符合\.pdf$/);
  await expect(page.locator("#analysis-size")).not.toHaveText("—");
});

test("shows a dedicated compatibility notice for touch-first devices", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/upload-ready.html");
  await expect(page.getByText("移动设备内存有限，重要文件建议使用桌面浏览器处理。")).toBeVisible();
  await expect(page.locator("[data-file-input]")).toBeHidden();
  await context.close();
});

test("requires a real page review before downloading a raster result", async ({ page }) => {
  await page.goto("/upload-ready.html");
  await page.waitForFunction(() => !document.querySelector("[data-start-button]").disabled || document.querySelector("[data-ready-hint]").textContent.includes("选择 PDF"));
  const sourceBytes = await page.evaluate(async () => {
    const { PDFDocument } = await import("/assets/vendor/pdf-lib.esm.min.js");
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 123456789;
    for (let index = 0; index < pixels.data.length; index += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels.data[index] = seed & 255;
      pixels.data[index + 1] = (seed >>> 8) & 255;
      pixels.data[index + 2] = (seed >>> 16) & 255;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const png = await (await fetch(canvas.toDataURL("image/png"))).arrayBuffer();
    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(png);
    const pdfPage = pdf.addPage([700, 900]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: 700, height: 900 });
    const bytes = await pdf.save({ useObjectStreams: false });
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "扫描申请材料.pdf", { type: "application/pdf" }));
    const input = document.querySelector("[data-file-input]");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return bytes.length;
  });
  expect(sourceBytes).toBeGreaterThan(500_000);

  await page.getByRole("button", { name: "开始准备 PDF" }).click();
  await expect(page.getByRole("heading", { name: "大小符合所选上限，请检查页面" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-result-method]")).toHaveText("页面已转为图片");
  await expect(page.locator("[data-preview-canvas]")).toBeVisible();
  expect(await page.locator("[data-preview-canvas]").evaluate((canvas) => canvas.width * canvas.height)).toBeGreaterThan(0);

  const download = page.locator("[data-download-link]");
  await expect(download).toHaveText("下载大小符合文件");
  await expect(download).toHaveAttribute("aria-disabled", "true");
  await expect(download).not.toHaveAttribute("href", /.+/);
  await page.locator("[data-readability-confirm]").check();
  await expect(download).toHaveAttribute("aria-disabled", "false");
  await expect(download).toHaveAttribute("href", /^blob:/);
});
