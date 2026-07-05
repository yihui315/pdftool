import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("never places PDF-derived sentinels in a network request", async ({ page, context }) => {
  const sentinel = "PDFTOOL_PRIVATE_SENTINEL_7F3A91";
  const fileName = `${sentinel}_申请材料.pdf`;
  const document = await PDFDocument.create();
  document.setTitle(sentinel);
  const pdfPage = document.addPage([320, 240]);
  pdfPage.drawText(sentinel, { x: 20, y: 160, size: 12 });
  const bytes = Buffer.from(await document.save());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const requests = [];

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  page.on("request", (request) => {
    requests.push([
      request.url(),
      JSON.stringify(request.headers()),
      request.postData() || ""
    ].join("\n"));
  });
  await page.addInitScript(() => {
    window.__pdfToolOutbound = [];
    const originalBeacon = navigator.sendBeacon?.bind(navigator);
    if (originalBeacon) navigator.sendBeacon = (...args) => { window.__pdfToolOutbound.push(String(args)); return false; };
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = class extends OriginalWebSocket {
      constructor(url, protocols) {
        window.__pdfToolOutbound.push(`ws:${url}`);
        super(url, protocols);
      }
    };
  });

  await page.goto("/upload-ready.html");
  await page.locator("[data-file-input]").setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: bytes });
  await page.getByRole("button", { name: "开始准备 PDF" }).click();
  await expect(page.getByRole("heading", { name: "原文件已经符合大小限制" })).toBeVisible({ timeout: 20_000 });

  const requestText = requests.join("\n");
  expect(requestText).not.toContain(sentinel);
  expect(requestText).not.toContain(fileName);
  expect(requestText).not.toContain(hash);
  expect(await page.evaluate(() => window.__pdfToolOutbound)).toEqual([]);
  await expect(page.locator("[data-result-method]")).toHaveText("未重写原文件");
});
