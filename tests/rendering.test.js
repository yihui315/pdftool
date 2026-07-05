import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, test } from "vitest";
import { getLocale } from "../site/config/locales.mjs";
import { getRoute } from "../site/config/routes.mjs";
import { escapeHtml, safeJson } from "../site/lib/html.mjs";
import { absoluteUrl, assetUrl } from "../site/lib/paths.mjs";
import { renderFragment } from "../site/lib/render-fragment.mjs";
import { renderLayout } from "../site/templates/layout.mjs";
import { buildSite } from "../scripts/build-site.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const tempRoots = [];

const sharedInfoRoutes = Object.freeze(["home", "tools", "about", "privacy"]);
const bilingualToolRoutes = Object.freeze([
  "uploadReady",
  "merge",
  "split",
  "manage",
  "compress",
  "pdfToJpg",
  "jpgToPdf",
  "rotate",
  "unlock"
]);
const sharedInfoPages = Object.freeze([
  Object.freeze({
    file: "index.html",
    lang: "zh-CN",
    h1: "免费在线 PDF 工具"
  }),
  Object.freeze({
    file: "en/index.html",
    lang: "en",
    h1: "Free online PDF tools"
  }),
  Object.freeze({
    file: "es/index.html",
    lang: "es",
    h1: "Herramientas PDF gratis en línea"
  }),
  Object.freeze({
    file: "pt-br/index.html",
    lang: "pt-BR",
    h1: "Ferramentas PDF online grátis"
  }),
  Object.freeze({
    file: "ja/index.html",
    lang: "ja",
    h1: "無料オンライン PDF ツール"
  }),
  Object.freeze({
    file: "id/index.html",
    lang: "id",
    h1: "Alat PDF online gratis"
  }),
  Object.freeze({
    file: "pdf-tools.html",
    lang: "zh-CN",
    h1: "PDF 工具箱"
  }),
  Object.freeze({
    file: "en/pdf-tools.html",
    lang: "en",
    h1: "PDF tools"
  }),
  Object.freeze({
    file: "es/pdf-tools.html",
    lang: "es",
    h1: "Herramientas PDF"
  }),
  Object.freeze({
    file: "pt-br/pdf-tools.html",
    lang: "pt-BR",
    h1: "Ferramentas PDF"
  }),
  Object.freeze({
    file: "ja/pdf-tools.html",
    lang: "ja",
    h1: "PDF ツール"
  }),
  Object.freeze({
    file: "id/pdf-tools.html",
    lang: "id",
    h1: "Alat PDF"
  }),
  Object.freeze({
    file: "about.html",
    lang: "zh-CN",
    h1: "关于 PDFTool.work"
  }),
  Object.freeze({
    file: "en/about.html",
    lang: "en",
    h1: "About PDFTool.work"
  }),
  Object.freeze({
    file: "es/about.html",
    lang: "es",
    h1: "Acerca de PDFTool.work"
  }),
  Object.freeze({
    file: "pt-br/about.html",
    lang: "pt-BR",
    h1: "Sobre o PDFTool.work"
  }),
  Object.freeze({
    file: "ja/about.html",
    lang: "ja",
    h1: "PDFTool.work について"
  }),
  Object.freeze({
    file: "id/about.html",
    lang: "id",
    h1: "Tentang PDFTool.work"
  }),
  Object.freeze({
    file: "privacy.html",
    lang: "zh-CN",
    h1: "隐私政策"
  }),
  Object.freeze({
    file: "en/privacy.html",
    lang: "en",
    h1: "Privacy Policy"
  }),
  Object.freeze({
    file: "es/privacy.html",
    lang: "es",
    h1: "Privacidad"
  }),
  Object.freeze({
    file: "pt-br/privacy.html",
    lang: "pt-BR",
    h1: "Privacidade"
  }),
  Object.freeze({
    file: "ja/privacy.html",
    lang: "ja",
    h1: "プライバシー"
  }),
  Object.freeze({
    file: "id/privacy.html",
    lang: "id",
    h1: "Kebijakan Privasi"
  })
]);

const bilingualToolPages = Object.freeze([
  Object.freeze({ route: "uploadReady", file: "upload-ready.html", lang: "zh-CN", h1: "PDF 上传准备工具" }),
  Object.freeze({ route: "uploadReady", file: "en/upload-ready.html", lang: "en", h1: "PDF upload preparation" }),
  Object.freeze({ route: "merge", file: "merge.html", lang: "zh-CN", h1: "合并 PDF" }),
  Object.freeze({ route: "merge", file: "en/merge-pdf.html", lang: "en", h1: "Merge PDF" }),
  Object.freeze({ route: "split", file: "split.html", lang: "zh-CN", h1: "拆分 PDF" }),
  Object.freeze({ route: "split", file: "en/split-pdf.html", lang: "en", h1: "Split PDF" }),
  Object.freeze({ route: "manage", file: "manage.html", lang: "zh-CN", h1: "管理 PDF 页面" }),
  Object.freeze({ route: "manage", file: "en/manage-pdf.html", lang: "en", h1: "Manage PDF pages" }),
  Object.freeze({ route: "compress", file: "compress.html", lang: "zh-CN", h1: "压缩 PDF" }),
  Object.freeze({ route: "compress", file: "en/compress-pdf.html", lang: "en", h1: "Compress PDF" }),
  Object.freeze({ route: "pdfToJpg", file: "pdf-to-jpg.html", lang: "zh-CN", h1: "PDF 转 JPG" }),
  Object.freeze({ route: "pdfToJpg", file: "en/pdf-to-jpg.html", lang: "en", h1: "PDF to JPG" }),
  Object.freeze({ route: "jpgToPdf", file: "jpg-to-pdf.html", lang: "zh-CN", h1: "JPG 转 PDF" }),
  Object.freeze({ route: "jpgToPdf", file: "en/jpg-to-pdf.html", lang: "en", h1: "JPG to PDF" }),
  Object.freeze({ route: "rotate", file: "pdf-rotate.html", lang: "zh-CN", h1: "旋转 PDF" }),
  Object.freeze({ route: "rotate", file: "en/rotate-pdf.html", lang: "en", h1: "Rotate PDF" }),
  Object.freeze({ route: "unlock", file: "pdf-unlock.html", lang: "zh-CN", h1: "解锁 PDF" }),
  Object.freeze({ route: "unlock", file: "en/unlock-pdf.html", lang: "en", h1: "Unlock PDF" })
]);

const toolHookSelectors = Object.freeze({
  uploadReady: Object.freeze([
    "[data-supported-flow]",
    "[data-workspace]",
    "[data-idle-view]",
    "[data-processing-view]",
    "[data-error-view]",
    "[data-result-view]",
    "[data-file-input]",
    "[data-select-file]",
    "[data-drop-zone]",
    "[data-selected-file]",
    "[data-selected-name]",
    "[data-selected-size]",
    "[data-remove-file]",
    "[data-start-button]",
    "[data-ready-hint]",
    "[data-custom-target]",
    "[data-custom-value]",
    "[data-target-error]",
    "[data-processing-title]",
    "[data-processing-summary]",
    "[data-progress-detail]",
    "[data-elapsed]",
    "[data-cancel-button]",
    "[data-error-heading]",
    "[data-error-message]",
    "[data-retry-button]",
    "[data-copy-diagnostic]",
    "[data-copy-status]",
    "[data-result-heading]",
    "[data-result-copy]",
    "[data-result-size]",
    "[data-original-size]",
    "[data-result-method]",
    "[data-result-margin]",
    "[data-preview-review]",
    "[data-preview-canvas]",
    "[data-preview-error]",
    "[data-retry-preview]",
    "[data-prev-page]",
    "[data-next-page]",
    "[data-page-indicator]",
    "[data-preview-zoom]",
    "[data-readability-confirm]",
    "[data-download-reason]",
    "[data-download-link]",
    "#analysis-size",
    "#analysis-pages",
    "#analysis-type",
    "#analysis-tip"
  ]),
  merge: Object.freeze([
    "[data-file-input]",
    "[data-select-files]",
    "[data-drop-zone]",
    "[data-file-list]",
    "[data-file-summary]",
    "[data-clear-files]",
    "[data-merge-button]",
    "[data-demo-reset]",
    "[data-progress-fill]",
    "[data-progress-label]",
    "[data-progress-percent]",
    "[data-error-box]",
    "[data-large-file-tip]",
    "[data-result-card]",
    "[data-result-meta]",
    "[data-download-link]"
  ]),
  split: Object.freeze([
    "[data-file-input]",
    "[data-select-file]",
    "[data-drop-zone]",
    "[data-clear-file]",
    "[data-reset-button]",
    "[data-split-button]",
    "[data-single-pages]",
    "[data-range-field]",
    "[data-range-input]",
    "[data-file-info]",
    "[data-large-file-tip]",
    "[data-error-box]",
    "[data-progress-fill]",
    "[data-progress-label]",
    "[data-progress-percent]",
    "[data-result-card]",
    "[data-result-meta]",
    "[data-result-list]"
  ]),
  manage: Object.freeze([
    "[data-file-input]",
    "[data-select-file]",
    "[data-drop-zone]",
    "[data-clear-file]",
    "[data-reset-button]",
    "[data-export-button]",
    "[data-page-grid]",
    "[data-page-summary]",
    "[data-file-info]",
    "[data-large-file-tip]",
    "[data-error-box]",
    "[data-progress-label]",
    "[data-progress-percent]",
    ".progress-track",
    "[data-result-card]",
    "[data-result-meta]",
    "[data-download-link]"
  ]),
  compress: Object.freeze([
    "[data-file-input]",
    "[data-select-file]",
    "[data-drop-zone]",
    "[data-clear-file]",
    "[data-reset-button]",
    "[data-compress-button]",
    "[data-compress-mode]",
    "[data-file-info]",
    "[data-large-file-tip]",
    "[data-error-box]",
    "[data-progress-fill]",
    "[data-progress-label]",
    "[data-progress-percent]",
    "[data-result-card]",
    "[data-result-meta]",
    "[data-compress-note]",
    "[data-download-link]"
  ]),
  pdfToJpg: Object.freeze([
    "[data-file-input]",
    "[data-drop-zone]",
    "[data-clear-file]",
    "[data-file-name]",
    "[data-display-name]",
    "#page-count-display",
    "#page-count",
    "#preview-area",
    "#image-grid",
    "#action-area",
    "#convert-btn",
    "#loading-indicator",
    "#loading-text",
    "#download-all",
    "#output-format",
    "#output-quality"
  ]),
  jpgToPdf: Object.freeze([
    "#file-input",
    "#drop-zone",
    "#select-btn",
    "#clear-btn",
    "#file-banner",
    "#file-count",
    "#preview-area",
    "#sortable-list",
    "#convert-btn",
    "#loading-indicator",
    "#loading-text",
    "#result-area",
    "#download-btn"
  ]),
  rotate: Object.freeze([
    "#file-input",
    "#drop-zone",
    "#select-btn",
    "#clear-btn",
    "#rotate-all-btn",
    "#file-banner",
    "#file-name",
    "#page-count",
    "#preview-area",
    "#page-grid",
    "#export-btn",
    "#loading-indicator",
    "#loading-text"
  ]),
  unlock: Object.freeze([
    "[data-drop-zone]",
    "[data-file-input]",
    "[data-select-files]",
    "[data-file-list]",
    "[data-file-summary]",
    "[data-clear-files]",
    "[data-password-input]",
    "[data-toggle-password-visibility]",
    "[data-unlock-button]",
    "[data-demo-reset]",
    "[data-progress-fill]",
    "[data-progress-percent]",
    "[data-progress-label]",
    "[data-error-box]",
    "[data-result-card]",
    "[data-download-link]",
    "[data-result-meta]",
    "[data-large-file-tip]"
  ])
});

const unsupportedEnglishClaims = Object.freeze([
  "no file size limits",
  "files of any size",
  "up to 90%",
  "api access",
  "batch processing feature",
  "complete privacy and security",
  "most operations complete in under 10 seconds"
]);

async function tempRoot() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pdftool-render-"));
  tempRoots.push(directory);
  return directory;
}

async function renderSharedInfoPages() {
  const outDir = await tempRoot();
  const contentRoot = path.join(repoRoot, "site", "content");

  await readFile(path.join(contentRoot, "zh-CN", "common.json"), "utf8");
  await buildSite({
    routes: sharedInfoRoutes.map((routeKey) => getRoute(routeKey)),
    locales: ["zh-CN", "en", "es", "pt-BR", "ja", "id"].map((locale) =>
      getLocale(locale)
    ),
    contentRoot,
    outDir
  });

  return Object.fromEntries(
    await Promise.all(
      sharedInfoPages.map(async ({ file }) => [
        file,
        new JSDOM(await readFile(path.join(outDir, file), "utf8"))
      ])
    )
  );
}

async function renderBilingualToolPages() {
  const outDir = await tempRoot();
  const contentRoot = path.join(repoRoot, "site", "content");

  await buildSite({
    routes: bilingualToolRoutes.map((routeKey) => getRoute(routeKey)),
    locales: ["zh-CN", "en"].map((locale) => getLocale(locale)),
    contentRoot,
    outDir
  });

  return Object.fromEntries(
    await Promise.all(
      bilingualToolPages.map(async ({ file }) => [
        file,
        new JSDOM(await readFile(path.join(outDir, file), "utf8"))
      ])
    )
  );
}

afterEach(async () => {
  await Promise.all(
    tempRoots.map((directory) => rm(directory, { recursive: true, force: true }))
  );
  tempRoots.length = 0;
});

function englishCommon() {
  return {
    locale: "en",
    navigation: {
      home: "Home",
      tools: "Tools",
      uploadReady: "Upload Ready",
      merge: "Merge PDF",
      split: "Split PDF",
      manage: "Manage PDF",
      compress: "Compress PDF",
      pdfToJpg: "PDF to JPG",
      jpgToPdf: "JPG to PDF",
      rotate: "Rotate PDF",
      unlock: "Unlock PDF",
      about: "About",
      privacy: "Privacy"
    },
    languageMenu: {
      label: "Choose language",
      currentLanguage: "English"
    },
    footer: {
      tagline: "Private browser-based PDF tools.",
      copyright: "Copyright 2026 PDFTool.work",
      privacy: "Privacy"
    }
  };
}

function englishPage() {
  return {
    seo: {
      title: "Free PDF tools",
      description: "Work with PDF files privately in your browser."
    },
    h1: "PDF tools",
    lead: "Simple tools for everyday PDF tasks.",
    strings: {
      title: "PDF tools",
      lead: "Simple tools for everyday PDF tasks.",
      cta: "Choose a tool",
      ctaLabel: "Choose a PDF tool",
      ctaTitle: "Open the PDF tools list"
    }
  };
}

function englishRuntime() {
  return {
    "file.reading": "Reading </script> {filename}"
  };
}

describe("safe HTML rendering primitives", () => {
  test("escapes text content and normalizes asset URLs", () => {
    expect(escapeHtml(`<script>&"`)).toBe("&lt;script&gt;&amp;&quot;");
    expect(assetUrl("assets/js/site.js")).toBe("/assets/js/site.js");
    expect(absoluteUrl("/en/")).toBe("https://pdftool.work/en/");
    expect(() => absoluteUrl("https://example.com/en/")).toThrow(
      /first-party|root-relative|protocol/i
    );
  });

  test("renders only declared fragment translations", () => {
    expect(() => renderFragment('<h1 data-i18n="missing"></h1>', {})).toThrow(
      /missing/
    );
    expect(renderFragment('<h1 data-i18n="title"></h1>', { title: "PDF & files" }))
      .toContain("PDF &amp; files");
  });

  test("escapes JSON safely for inline JSON-LD scripts", () => {
    const serialized = safeJson({
      name: "PDF </script> & files",
      lineSeparator: "\u2028",
      paragraphSeparator: "\u2029"
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(JSON.parse(serialized)).toMatchObject({
      name: "PDF </script> & files"
    });
  });
});

describe("shared localized page layout", () => {
  test("renders an English page with safe SEO, assets, and one h1", () => {
    const page = englishPage();
    const runtime = englishRuntime();
    const fragment = renderFragment(
      [
        '<section class="editorial-hero">',
        '<h1 data-i18n="title"></h1>',
        '<p data-i18n="lead"></p>',
        '<a href="/en/pdf-tools.html" data-i18n="cta" data-i18n-attr="aria-label:ctaLabel,title:ctaTitle"></a>',
        "</section>"
      ].join(""),
      page.strings
    );

    const html = renderLayout({
      locale: "en",
      routeKey: "home",
      common: englishCommon(),
      page,
      runtime,
      fragment
    });
    const dom = new JSDOM(html);
    const { document } = dom.window;

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(
      document.querySelector('link[rel="canonical"]').getAttribute("href")
    ).toBe("https://pdftool.work/en/");

    const alternateLinks = [
      ...document.querySelectorAll('link[rel="alternate"]')
    ];
    expect(alternateLinks).toHaveLength(7);
    expect(
      alternateLinks
        .filter((link) => link.getAttribute("hreflang") !== "x-default")
        .map((link) => link.getAttribute("hreflang"))
    ).toEqual(["zh-CN", "en", "es", "pt-BR", "ja", "id"]);
    expect(
      new URL(
        alternateLinks
          .find((link) => link.getAttribute("hreflang") === "x-default")
          .getAttribute("href")
      ).pathname
    ).toBe("/en/");

    expect(document.querySelectorAll("h1")).toHaveLength(1);

    const localAssets = [
      ...document.querySelectorAll("link[href], script[src]")
    ]
      .map((node) => node.getAttribute("href") ?? node.getAttribute("src"))
      .filter((url) => url.includes("/assets/"));
    expect(localAssets.length).toBeGreaterThan(0);
    expect(localAssets.every((url) => url.startsWith("/assets/"))).toBe(true);
    expect(document.querySelector('link[rel="icon"]').getAttribute("href")).toBe(
      "/assets/favicon.svg"
    );
    expect(
      [...document.querySelectorAll("script[src]")].map((script) =>
        script.getAttribute("src")
      )
    ).toContain("/assets/js/i18n.js");

    const runtimeScriptMatch = html.match(
      /<script id="runtime-i18n" type="application\/json">(?<json>[\s\S]*?)<\/script>/u
    );
    expect(runtimeScriptMatch?.groups?.json).toBeDefined();
    expect(runtimeScriptMatch.groups.json).not.toContain("</script>");
    expect(JSON.parse(runtimeScriptMatch.groups.json)).toEqual({
      locale: "en",
      messages: runtime
    });
    expect(html.indexOf('id="runtime-i18n"')).toBeLessThan(
      html.indexOf("/assets/js/i18n.js")
    );

    const runtimeScript = document.querySelector(
      'script#runtime-i18n[type="application/json"]'
    );
    expect(runtimeScript).not.toBeNull();
    expect(JSON.parse(runtimeScript.textContent)).toEqual({
      locale: "en",
      messages: runtime
    });

    const jsonLdScripts = [
      ...document.querySelectorAll('script[type="application/ld+json"]')
    ];
    expect(jsonLdScripts).toHaveLength(1);
    expect(() => JSON.parse(jsonLdScripts[0].textContent)).not.toThrow();
  });

  test("renders shared multilingual informational pages with safe localized metadata", async () => {
    const pages = await renderSharedInfoPages();

    for (const { file, lang, h1 } of sharedInfoPages) {
      const document = pages[file].window.document;
      expect(document.documentElement.getAttribute("lang")).toBe(lang);
      expect(document.querySelector("h1")?.textContent.trim()).toBe(h1);
      expect(document.querySelectorAll("[data-language-menu-root]")).toHaveLength(1);
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(document.querySelectorAll("a[data-language-option][style]")).toHaveLength(0);

      if (lang === "en") {
        const pageText = document.body.textContent.toLowerCase().replace(/\s+/gu, " ");
        for (const claim of unsupportedEnglishClaims) {
          expect(pageText).not.toContain(claim);
        }
      }
    }
  });

  test("renders bilingual PDF tool pages with scripts and required hooks", async () => {
    const pages = await renderBilingualToolPages();

    for (const { route, file, lang, h1 } of bilingualToolPages) {
      const document = pages[file].window.document;
      expect(document.documentElement.getAttribute("lang")).toBe(lang);
      expect(document.querySelector("h1")?.textContent.trim()).toBe(h1);
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);

      const scriptSources = [...document.querySelectorAll("script[src]")].map(
        (script) => script.getAttribute("src")
      );
      for (const script of getRoute(route).scripts) {
        expect(scriptSources, `${file} missing ${script.src}`).toContain(script.src);
      }

      for (const selector of toolHookSelectors[route]) {
        expect(document.querySelector(selector), `${file} missing ${selector}`).not.toBeNull();
      }

      if (lang === "en") {
        const mainText = document.querySelector("main")?.textContent ?? "";
        const runtimeText =
          document.querySelector('script#runtime-i18n[type="application/json"]')
            ?.textContent ?? "";
        expect(mainText).not.toMatch(/[\u4e00-\u9fff]/u);
        expect(runtimeText).not.toMatch(/[\u4e00-\u9fff]/u);
      }
    }
  });
});
