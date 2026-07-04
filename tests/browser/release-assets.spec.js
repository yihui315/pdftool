import { expect, test } from "@playwright/test";

const CORE_ROUTES = [
  "/", "/pdf-tools.html", "/upload-ready.html", "/merge.html", "/split.html",
  "/manage.html", "/compress.html", "/pdf-to-jpg.html", "/jpg-to-pdf.html",
  "/pdf-rotate.html", "/pdf-unlock.html", "/about.html", "/privacy.html"
];
const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280];

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
  for (const width of VIEWPORT_WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of CORE_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const layout = await page.evaluate(() => {
        const nav = document.querySelector("header nav");
        const bounds = nav.getBoundingClientRect();
        const mobileToggle = document.querySelector("[data-menu-toggle]");
        const mobileEnglishLinks = Array.from(document.querySelectorAll("[data-mobile-menu] a[href^='/en']"));
        return {
          documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          navOverflow: nav.scrollWidth > nav.clientWidth,
          left: bounds.left,
          right: bounds.right,
          viewport: window.innerWidth,
          mobileToggleVisible: getComputedStyle(mobileToggle).display !== "none",
          desktopEnglishLinks: nav.querySelectorAll("a[href^='/en']").length,
          mobileEnglishLinks: mobileEnglishLinks.length,
          styledMobileEnglishLinks: mobileEnglishLinks.filter((link) => link.hasAttribute("style")).length
        };
      });
      expect(layout.documentOverflow, `${width}px ${route}`).toBe(false);
      expect(layout.navOverflow, `${width}px ${route}`).toBe(false);
      expect(layout.left, `${width}px ${route}`).toBeGreaterThanOrEqual(0);
      expect(layout.right, `${width}px ${route}`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.mobileToggleVisible, `${width}px ${route}`).toBe(true);
      expect(layout.desktopEnglishLinks, `${width}px ${route}`).toBe(0);
      expect(layout.mobileEnglishLinks, `${width}px ${route}`).toBe(1);
      expect(layout.styledMobileEnglishLinks, `${width}px ${route}`).toBe(0);
      await page.locator("[data-menu-toggle]").click();
      await expect(page.locator("[data-mobile-menu]"), `${width}px ${route} mobile menu`).toBeVisible();
    }
  }

  await page.setViewportSize({ width: 1536, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const desktopLayout = await page.evaluate(() => {
    const desktopNav = Array.from(document.querySelectorAll("header nav > div"))
      .find((element) => element.classList.contains("2xl:flex") && element.classList.contains("gap-1"));
    return {
      desktopNavVisible: getComputedStyle(desktopNav).display !== "none",
      mobileToggleVisible: getComputedStyle(document.querySelector("[data-menu-toggle]")).display !== "none"
    };
  });
  expect(desktopLayout.desktopNavVisible, "1536px desktop navigation").toBe(true);
  expect(desktopLayout.mobileToggleVisible, "1536px mobile navigation toggle").toBe(false);
});
