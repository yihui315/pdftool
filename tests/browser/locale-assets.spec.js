import { expect, test } from "@playwright/test";

const TOOL_ASSETS = [
  "/assets/js/pdf-to-jpg.js",
  "/assets/js/jpg-to-pdf.js",
  "/assets/js/pdf-rotate.js",
  "/assets/js/upload-ready-worker.mjs"
];

const TOOL_PAGES = [
  { route: "/pdf-to-jpg.html", src: "/assets/js/pdf-to-jpg.js", type: "module" },
  { route: "/jpg-to-pdf.html", src: "/assets/js/jpg-to-pdf.js" },
  { route: "/pdf-rotate.html", src: "/assets/js/pdf-rotate.js" }
];

const LOCALIZED_HOMES = [
  { route: "/en/", locale: "en", language: "English" },
  { route: "/es/", locale: "es", language: "Español" },
  { route: "/pt-br/", locale: "pt-BR", language: "Português (Brasil)" },
  { route: "/ja/", locale: "ja", language: "日本語" },
  { route: "/id/", locale: "id", language: "Bahasa Indonesia" }
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
  for (const { route, src, type } of TOOL_PAGES) {
    const response = await request.get(route);
    const html = await response.text();
    const scriptPattern = new RegExp(`<script[^>]+src="${src}"[^>]*>`);

    expect(html, route).toMatch(scriptPattern);
    if (type) {
      expect(html, route).toMatch(new RegExp(`<script[^>]+src="${src}"[^>]+type="${type}"[^>]*>`));
    }
    expect(html, `${route} inline implementation`).not.toContain("var fileInput =");
  }
});

test("roots PDF.js resources and the upload-ready worker for nested locale execution", async ({ request, baseURL }) => {
  const pdfToJpg = await (await request.get("/assets/js/pdf-to-jpg.js")).text();
  expect(pdfToJpg).toContain('import("/assets/js/pdfjs-polyfills.mjs")');
  expect(pdfToJpg).toContain('pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/js/pdf-worker-entry.mjs";');
  expect(pdfToJpg).toContain('new URL("/assets/vendor/pdfjs/", window.location.href)');

  const uploadReady = await (await request.get("/assets/js/upload-ready.js")).text();
  const workerPath = uploadReady.match(/new Worker\("([^"]+)", \{ type: "module" \}\)/)?.[1];
  expect(workerPath).toBe("/assets/js/upload-ready-worker.mjs");
  expect(new URL(workerPath, `${baseURL}/zh-cn/tools/upload-ready.html`).pathname).toBe(workerPath);
});

test("keeps every growth locale bound to its own URL and runtime", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("pdf-tool-locale", "zh-CN"));

  for (const { route, locale, language } of LOCALIZED_HOMES) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("h1")).not.toBeEmpty();
    await expect(page.locator("[data-language-toggle]")).toContainText(language);
    await expect
      .poll(() => page.evaluate(() => window.PDFToolI18n?.locale))
      .toBe(locale);
  }
});
