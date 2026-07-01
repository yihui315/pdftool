import { expect, test } from "@playwright/test";

test("serves every public route and production PDF asset from first-party paths", async ({ request }) => {
  const routes = [
    "/", "/upload-ready.html", "/merge.html", "/split.html", "/manage.html", "/compress.html",
    "/pdf-to-jpg.html", "/jpg-to-pdf.html", "/pdf-rotate.html", "/pdf-unlock.html",
    "/about.html", "/privacy.html", "/blog-merge-pdf.html", "/blog-pdf-tips.html", "/blog-jpg-to-pdf.html", "/sitemap.xml"
  ];
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }

  const assets = [
    ["/assets/js/upload-ready.js", /javascript/],
    ["/assets/js/upload-ready-worker.mjs", /javascript/],
    ["/assets/js/pdf-preview.js", /javascript/],
    ["/assets/vendor/pdfjs/pdf.mjs", /javascript/],
    ["/assets/vendor/pdfjs/pdf.worker.mjs", /javascript/],
    ["/assets/vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap", /(octet-stream|application\/binary)/],
    ["/assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf", /(font|octet-stream)/],
    ["/assets/vendor/pdfjs/wasm/openjpeg.wasm", /application\/wasm/],
    ["/assets/vendor/pdfjs/iccs/CGATS001Compat-v2-micro.icc", /(icc|octet-stream)/]
  ];
  for (const [path, contentType] of assets) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toMatch(contentType);
  }

  const pdfjs = await request.get("/assets/vendor/pdfjs/pdf.mjs");
  expect(await pdfjs.text()).toContain('const version = "6.1.200"');
});

test("keeps the responsive header inside the viewport", async ({ page }) => {
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ["/", "/upload-ready.html", "/jpg-to-pdf.html"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const layout = await page.evaluate(() => {
        const nav = document.querySelector("header nav");
        const bounds = nav.getBoundingClientRect();
        return {
          documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          navOverflow: nav.scrollWidth > nav.clientWidth,
          left: bounds.left,
          right: bounds.right,
          viewport: window.innerWidth
        };
      });
      expect(layout.documentOverflow, `${width}px ${route}`).toBe(false);
      expect(layout.navOverflow, `${width}px ${route}`).toBe(false);
      expect(layout.left, `${width}px ${route}`).toBeGreaterThanOrEqual(0);
      expect(layout.right, `${width}px ${route}`).toBeLessThanOrEqual(layout.viewport);
    }
  }
});
