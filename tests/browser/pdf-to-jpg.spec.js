import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function onePagePdf() {
  const document = await PDFDocument.create();
  const pdfPage = document.addPage([320, 240]);
  pdfPage.drawText("FIRST-PARTY-PDFJS", { x: 30, y: 150, size: 18 });
  return Buffer.from(await document.save());
}

test("converts a PDF with the self-hosted PDF.js runtime and downloads the result", async ({ page }) => {
  await page.goto("/pdf-to-jpg.html");
  await page.locator("[data-file-input]").setInputFiles({
    name: "转换测试.pdf",
    mimeType: "application/pdf",
    buffer: await onePagePdf()
  });
  const convert = page.getByRole("button", { name: "转换为图片" });
  await expect(convert).toBeEnabled();
  await convert.click();
  const image = page.locator("#image-grid img");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute("src", /^blob:/);

  const downloadButton = page.getByRole("button", { name: "下载全部图片" });
  await expect(downloadButton).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^page-1\.jpe?g$/);
});

test("keeps a PDF selected while the PDF.js runtime is still loading", async ({ page }) => {
  let releaseRuntime;
  const runtimeGate = new Promise((resolve) => {
    releaseRuntime = resolve;
  });

  await page.route("**/assets/vendor/pdfjs/pdf.mjs", async (route) => {
    await runtimeGate;
    await route.continue();
  });

  await page.goto("/pdf-to-jpg.html", { waitUntil: "commit" });
  await page.locator("[data-file-input]").setInputFiles({
    name: "快速选择.pdf",
    mimeType: "application/pdf",
    buffer: await onePagePdf()
  });
  releaseRuntime();
  await page.waitForLoadState("load");

  await expect(page.getByRole("button", { name: "转换为图片" })).toBeEnabled();
});

test("does not restore a PDF that was cleared while the runtime loaded", async ({ page }) => {
  let releaseRuntime;
  const runtimeGate = new Promise((resolve) => {
    releaseRuntime = resolve;
  });

  await page.route("**/assets/vendor/pdfjs/pdf.mjs", async (route) => {
    await runtimeGate;
    await route.continue();
  });

  await page.goto("/pdf-to-jpg.html", { waitUntil: "commit" });
  await page.locator("[data-file-input]").setInputFiles({
    name: "随后清除.pdf",
    mimeType: "application/pdf",
    buffer: await onePagePdf()
  });
  const clear = page.locator("[data-clear-file]");
  await expect(clear).toBeEnabled();
  await clear.click();
  releaseRuntime();
  await page.waitForLoadState("load");

  await expect(page.getByRole("button", { name: "转换为图片" })).toBeDisabled();
  await expect(page.locator("[data-file-name]")).toBeHidden();
});
