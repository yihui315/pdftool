import { expect, test } from "@playwright/test";

test("serves every public route and production PDF asset from first-party paths", async ({ request }) => {
  const routes = ["/", "/upload-ready.html", "/merge.html", "/split.html", "/manage.html", "/compress.html", "/about.html", "/privacy.html", "/sitemap.xml"];
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
