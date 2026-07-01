import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("converts a PDF with the self-hosted PDF.js runtime and downloads the result", async ({ page }) => {
  const document = await PDFDocument.create();
  const pdfPage = document.addPage([320, 240]);
  pdfPage.drawText("FIRST-PARTY-PDFJS", { x: 30, y: 150, size: 18 });

  await page.goto("/pdf-to-jpg.html");
  await page.locator("[data-file-input]").setInputFiles({
    name: "转换测试.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await document.save())
  });
  const convert = page.getByRole("button", { name: "转换为图片" });
  await expect(convert).toBeEnabled();
  await convert.click();
  const image = page.locator("#image-grid img");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute("src", /^blob:/);

  const downloadButton = page.getByRole("button", { name: "打包下载全部" });
  await expect(downloadButton).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^page-1\.jpe?g$/);
});
