import { expect, test } from "@playwright/test";
import playwrightConfig from "../../playwright.config.js";

const CORE_ROUTES = [
  "/", "/pdf-tools.html", "/upload-ready.html", "/merge.html", "/split.html",
  "/manage.html", "/compress.html", "/pdf-to-jpg.html", "/jpg-to-pdf.html",
  "/pdf-rotate.html", "/pdf-unlock.html", "/about.html", "/privacy.html"
];
const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280];

async function readHeaderLayout(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("header nav");
    const mobileMenu = document.querySelector("[data-mobile-menu]");
    const mobileToggle = document.querySelector("[data-menu-toggle]");
    const mobileEnglishLinks = Array.from(mobileMenu.querySelectorAll("a[href^='/en']"));
    const navBounds = nav.getBoundingClientRect();
    const menuBounds = mobileMenu.getBoundingClientRect();
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    };
    const visibleMobileLinks = Array.from(mobileMenu.querySelectorAll("a")).filter(isVisible);

    return {
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      navOverflow: nav.scrollWidth > nav.clientWidth,
      navLeft: navBounds.left,
      navRight: navBounds.right,
      viewport: window.innerWidth,
      mobileToggleVisible: isVisible(mobileToggle),
      desktopEnglishLinks: nav.querySelectorAll("a[href^='/en']").length,
      mobileEnglishLinks: mobileEnglishLinks.length,
      styledMobileEnglishLinks: mobileEnglishLinks.filter((link) => link.hasAttribute("style")).length,
      mobileMenuVisible: isVisible(mobileMenu),
      mobileMenuOverflow: mobileMenu.scrollWidth > mobileMenu.clientWidth,
      mobileMenuLeft: menuBounds.left,
      mobileMenuRight: menuBounds.right,
      visibleMobileLinks: visibleMobileLinks.length,
      mobileLinkOverflow: visibleMobileLinks.some((link) => {
        const bounds = link.getBoundingClientRect();
        return link.scrollWidth > link.clientWidth || bounds.left < 0 || bounds.right > window.innerWidth;
      }),
      visibleDesktopNavLinks: Array.from(nav.querySelectorAll("[data-nav-link]")).filter(isVisible).length
    };
  });
}

function expectHeaderWithinViewport(layout, label) {
  expect(layout.documentOverflow, label).toBe(false);
  expect(layout.navOverflow, label).toBe(false);
  expect(layout.navLeft, label).toBeGreaterThanOrEqual(0);
  expect(layout.navRight, label).toBeLessThanOrEqual(layout.viewport);
}

function expectOpenMobileMenuWithinViewport(layout, label) {
  expect(layout.mobileMenuVisible, label).toBe(true);
  expect(layout.mobileMenuOverflow, label).toBe(false);
  expect(layout.mobileMenuLeft, label).toBeGreaterThanOrEqual(0);
  expect(layout.mobileMenuRight, label).toBeLessThanOrEqual(layout.viewport);
  expect(layout.visibleMobileLinks, label).toBeGreaterThan(0);
  expect(layout.mobileLinkOverflow, label).toBe(false);
}

test("requires explicit opt-in before reusing the test server", () => {
  expect(playwrightConfig.webServer.reuseExistingServer).toBe(process.env.PLAYWRIGHT_REUSE_SERVER === "1");
});

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
      const label = `${width}px ${route}`;
      const layout = await readHeaderLayout(page);
      expectHeaderWithinViewport(layout, label);
      expect(layout.mobileToggleVisible, label).toBe(true);
      expect(layout.desktopEnglishLinks, label).toBe(0);
      expect(layout.mobileEnglishLinks, label).toBe(1);
      expect(layout.styledMobileEnglishLinks, label).toBe(0);

      const toggle = page.locator("[data-menu-toggle]");
      const mobileMenu = page.locator("[data-mobile-menu]");
      await toggle.click();
      await expect(toggle, `${label} expanded toggle`).toHaveAttribute("aria-expanded", "true");
      await expect(mobileMenu, `${label} mobile menu`).toBeVisible();
      expectOpenMobileMenuWithinViewport(await readHeaderLayout(page), `${label} open mobile menu`);
      await toggle.click();
      await expect(toggle, `${label} collapsed toggle`).toHaveAttribute("aria-expanded", "false");
      await expect(mobileMenu, `${label} mobile menu`).toBeHidden();
    }
  }

  await page.setViewportSize({ width: 1536, height: 800 });
  for (const route of CORE_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const label = `1536px ${route}`;
    const layout = await readHeaderLayout(page);
    expectHeaderWithinViewport(layout, label);
    expect(layout.visibleDesktopNavLinks, `${label} visible desktop navigation links`).toBeGreaterThan(0);
    expect(layout.mobileToggleVisible, `${label} mobile navigation toggle`).toBe(false);
  }
});
