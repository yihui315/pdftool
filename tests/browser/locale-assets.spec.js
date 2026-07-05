import { expect, test } from "@playwright/test";

const TOOL_ASSETS = [
  "/assets/js/pdf-to-jpg.js",
  "/assets/js/jpg-to-pdf.js",
  "/assets/js/pdf-rotate.js",
  "/assets/js/upload-ready-worker.mjs"
];

const TOOL_PAGES = [
  { route: "/pdf-to-jpg.html", script: '<script type="module" src="/assets/js/pdf-to-jpg.js"></script>' },
  { route: "/jpg-to-pdf.html", script: '<script src="/assets/js/jpg-to-pdf.js" defer></script>' },
  { route: "/pdf-rotate.html", script: '<script src="/assets/js/pdf-rotate.js" defer></script>' }
];

test("serves extracted tool assets from locale-safe root paths", async ({ request }) => {
  for (const asset of TOOL_ASSETS) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
  }
});

test("keeps first-party asset references rooted from nested locale pages", async ({ request, baseURL }) => {
  for (const { route } of TOOL_PAGES) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    const references = Array.from(html.matchAll(/(?:href|src)=["']([^"']+)["']/g), (match) => match[1])
      .filter((reference) => reference.includes("assets/"));

    expect(references.length, `${route} first-party asset references`).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference, `${route} asset reference`).toMatch(/^\/assets\//);
      const nestedURL = new URL(reference, `${baseURL}/zh-cn/tools/${route.slice(1)}`);
      expect(nestedURL.pathname, `${route} nested-locale resolution`).toBe(reference);
    }
  }
});

test("loads extracted tool implementations through exact external script tags", async ({ request }) => {
  for (const { route, script } of TOOL_PAGES) {
    const response = await request.get(route);
    const html = await response.text();

    expect(html, route).toContain(script);
    expect(html, `${route} inline implementation`).not.toContain("var fileInput =");
  }
});

test("roots PDF.js resources and the upload-ready worker for nested locale execution", async ({ request, baseURL }) => {
  const pdfToJpg = await (await request.get("/assets/js/pdf-to-jpg.js")).text();
  expect(pdfToJpg).toContain('await import("/assets/js/pdfjs-polyfills.mjs");');
  expect(pdfToJpg).toContain('pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/js/pdf-worker-entry.mjs";');
  expect(pdfToJpg).toContain('new URL("/assets/vendor/pdfjs/", window.location.href)');

  const uploadReady = await (await request.get("/assets/js/upload-ready.js")).text();
  const workerPath = uploadReady.match(/new Worker\("([^"]+)", \{ type: "module" \}\)/)?.[1];
  expect(workerPath).toBe("/assets/js/upload-ready-worker.mjs");
  expect(new URL(workerPath, `${baseURL}/zh-cn/tools/upload-ready.html`).pathname).toBe(workerPath);
});
