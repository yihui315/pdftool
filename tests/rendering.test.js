import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { escapeHtml, safeJson } from "../site/lib/html.mjs";
import { absoluteUrl, assetUrl } from "../site/lib/paths.mjs";
import { renderFragment } from "../site/lib/render-fragment.mjs";
import { renderLayout } from "../site/templates/layout.mjs";

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
});
