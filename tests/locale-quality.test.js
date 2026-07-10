import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { getLocale } from "../site/config/locales.mjs";
import {
  CORE_ROUTES,
  LANDING_ROUTES,
  canonicalPath
} from "../site/config/routes.mjs";
import { loadLocaleContent } from "../site/lib/content.mjs";
import { buildSite } from "../scripts/build-site.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(repoRoot, "site", "content");

async function loadContent(locale) {
  const english = await loadLocaleContent(path.join(contentRoot, "en"), {
    expectedLocale: "en"
  });
  if (locale === "en") return english;
  return loadLocaleContent(path.join(contentRoot, locale), {
    expectedLocale: locale,
    englishRuntime: english.runtime
  });
}

function faqValues(page) {
  return Object.entries(page.strings)
    .filter(([key]) => /^faq/i.test(key))
    .map(([, value]) => value);
}

function stringValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringValues);
  }
  return [];
}

describe("localized content quality gates", () => {
  test("Spanish core content is complete, localized, and claim-safe", async () => {
    const english = await loadContent("en");
    const spanish = await loadContent("es");

    expect(spanish.common.navigation.tools).toBe("Todas las herramientas");
    expect(spanish.pages.privacy.h1).toBe("Privacidad");
    expect(spanish.pages.merge.strings.primaryButton).toBe("Combinar PDF");
    expect(spanish.runtime["file.reading"]).not.toBe(english.runtime["file.reading"]);

    for (const { key } of CORE_ROUTES) {
      expect(spanish.pages[key], `missing Spanish page: ${key}`).toBeDefined();
      expect(spanish.pages[key].h1).not.toBe(english.pages[key].h1);
      expect(spanish.pages[key].lead).not.toBe(english.pages[key].lead);

      const spanishFaq = faqValues(spanish.pages[key]);
      const englishFaq = faqValues(english.pages[key]);
      if (spanishFaq.length || englishFaq.length) {
        expect(spanishFaq).not.toEqual(englishFaq);
      }
    }

    const serialized = JSON.stringify(spanish);
    expect(serialized).not.toMatch(
      /no file size limits|files of any size|up to 90%|API access|batch processing feature|complete privacy and security|most operations complete in under 10 seconds/i
    );
  });

  test("Spanish core routes render as generated localized pages", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "pdftool-es-"));
    try {
      const manifest = await buildSite({
        routes: CORE_ROUTES,
        locales: [getLocale("es")],
        contentRoot,
        outDir
      });
      expect(manifest.routes).toHaveLength(13);
      expect(manifest.routes.map(({ file }) => file)).toContain("es/merge-pdf.html");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test("Brazilian Portuguese core content is complete, localized, and claim-safe", async () => {
    const english = await loadContent("en");
    const portuguese = await loadContent("pt-BR");

    expect(portuguese.common.navigation.tools).toBe("Todas as ferramentas");
    expect(portuguese.pages.privacy.h1).toBe("Privacidade");
    expect(portuguese.pages.merge.strings.primaryButton).toBe("Juntar PDFs");
    expect(portuguese.runtime["file.reading"]).not.toBe(english.runtime["file.reading"]);
    expect(getLocale("pt-BR").hrefLang).toBe("pt-BR");
    expect(canonicalPath("pt-BR", "home")).toBe("/pt-br/");

    for (const { key } of CORE_ROUTES) {
      expect(portuguese.pages[key], `missing Brazilian Portuguese page: ${key}`).toBeDefined();
      expect(portuguese.pages[key].h1).not.toBe(english.pages[key].h1);
      expect(portuguese.pages[key].lead).not.toBe(english.pages[key].lead);

      const portugueseFaq = faqValues(portuguese.pages[key]);
      const englishFaq = faqValues(english.pages[key]);
      if (portugueseFaq.length || englishFaq.length) {
        expect(portugueseFaq).not.toEqual(englishFaq);
      }
    }

    const serialized = JSON.stringify(portuguese);
    expect(serialized).not.toMatch(
      /no file size limits|files of any size|up to 90%|API access|batch processing feature|complete privacy and security|most operations complete in under 10 seconds/i
    );
  });

  test("Brazilian Portuguese core routes render with the pt-br prefix", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "pdftool-pt-br-"));
    try {
      const manifest = await buildSite({
        routes: CORE_ROUTES,
        locales: [getLocale("pt-BR")],
        contentRoot,
        outDir
      });
      expect(manifest.routes).toHaveLength(13);
      expect(manifest.routes.map(({ file }) => file)).toContain(
        "pt-br/merge-pdf.html"
      );
      expect(manifest.routes.find(({ key }) => key === "home").canonicalPath).toBe(
        "/pt-br/"
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test("Japanese core content is complete, localized, and UI-safe", async () => {
    const english = await loadContent("en");
    const japanese = await loadContent("ja");
    const japaneseLocale = getLocale("ja");

    expect(japanese.common.navigation.tools).toBe("すべてのツール");
    expect(japanese.pages.privacy.h1).toBe("プライバシー");
    expect(japanese.pages.merge.strings.primaryButton).toBe("PDFを結合");
    expect(japanese.runtime["file.reading"]).not.toBe(english.runtime["file.reading"]);
    expect(japaneseLocale.hrefLang).toBe("ja");
    expect(japaneseLocale.dir).toBe("ltr");

    for (const { key } of CORE_ROUTES) {
      expect(japanese.pages[key], `missing Japanese page: ${key}`).toBeDefined();
      expect(japanese.pages[key].h1).not.toBe(english.pages[key].h1);
      expect(japanese.pages[key].lead).not.toBe(english.pages[key].lead);

      const primaryButton = japanese.pages[key].strings.primaryButton;
      if (primaryButton !== undefined) {
        expect(primaryButton.trim(), `empty Japanese primary button: ${key}`).not.toBe("");
        expect(primaryButton).not.toBe(english.pages[key].strings.primaryButton);
      }

      const japaneseFaq = faqValues(japanese.pages[key]);
      const englishFaq = faqValues(english.pages[key]);
      if (japaneseFaq.length || englishFaq.length) {
        expect(japaneseFaq).not.toEqual(englishFaq);
      }
    }

    const unexpectedTokens = stringValues(japanese).filter((value) =>
      /\{(?!filename\})[^}]+\}/.test(value)
    );
    expect(unexpectedTokens).toEqual([]);

    const serialized = JSON.stringify(japanese);
    expect(serialized).not.toMatch(
      /no file size limits|files of any size|up to 90%|API access|batch processing feature|complete privacy and security|most operations complete in under 10 seconds/i
    );
  });

  test("Japanese core routes render with the ja prefix", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "pdftool-ja-"));
    try {
      const manifest = await buildSite({
        routes: CORE_ROUTES,
        locales: [getLocale("ja")],
        contentRoot,
        outDir
      });
      expect(manifest.routes).toHaveLength(13);
      expect(manifest.routes.map(({ file }) => file)).toContain("ja/merge-pdf.html");
      expect(manifest.routes.find(({ key }) => key === "home").canonicalPath).toBe(
        "/ja/"
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test("Indonesian core content is complete, localized, and claim-safe", async () => {
    const english = await loadContent("en");
    const indonesian = await loadContent("id");

    expect(indonesian.common.navigation.tools).toBe("Semua alat");
    expect(indonesian.common.languageMenu.currentLanguage).toBe("Bahasa Indonesia");
    expect(indonesian.pages.privacy.h1).toBe("Privasi");
    expect(indonesian.pages.merge.strings.primaryButton).toBe("Gabungkan PDF");
    expect(indonesian.runtime["file.reading"]).not.toBe(english.runtime["file.reading"]);
    expect(getLocale("id").hrefLang).toBe("id");

    for (const { key } of CORE_ROUTES) {
      expect(indonesian.pages[key], `missing Indonesian page: ${key}`).toBeDefined();
      expect(indonesian.pages[key].h1).not.toBe(english.pages[key].h1);
      expect(indonesian.pages[key].lead).not.toBe(english.pages[key].lead);

      const primaryButton = indonesian.pages[key].strings.primaryButton;
      if (primaryButton !== undefined) {
        expect(primaryButton.trim(), `empty Indonesian primary button: ${key}`).not.toBe("");
        expect(primaryButton).not.toBe(english.pages[key].strings.primaryButton);
      }

      const indonesianFaq = faqValues(indonesian.pages[key]);
      const englishFaq = faqValues(english.pages[key]);
      if (indonesianFaq.length || englishFaq.length) {
        expect(indonesianFaq).not.toEqual(englishFaq);
      }
    }

    const serialized = JSON.stringify(indonesian);
    expect(serialized).not.toMatch(
      /no file size limits|files of any size|up to 90%|API access|batch processing feature|complete privacy and security|most operations complete in under 10 seconds/i
    );
  });

  test("Indonesian core routes render with the id prefix", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "pdftool-id-"));
    try {
      const manifest = await buildSite({
        routes: CORE_ROUTES,
        locales: [getLocale("id")],
        contentRoot,
        outDir
      });
      expect(manifest.routes).toHaveLength(13);
      expect(manifest.routes.map(({ file }) => file)).toContain("id/merge-pdf.html");
      expect(manifest.routes.find(({ key }) => key === "home").canonicalPath).toBe(
        "/id/"
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test("localized landing guides are complete, distinct, and claim-safe", async () => {
    const english = await loadContent("en");
    const allTitleH1Pairs = new Set();

    for (const locale of ["en", "es", "pt-BR", "ja", "id"]) {
      const content = await loadContent(locale);
      const titles = new Set();
      const descriptions = new Set();
      const h1s = new Set();

      for (const { key } of LANDING_ROUTES) {
        const page = content.pages[key];
        expect(page, `missing ${locale} landing page: ${key}`).toBeDefined();
        expect(["compress", "uploadReady"]).toContain(page.strings.primaryToolRoute);

        titles.add(page.seo.title);
        descriptions.add(page.seo.description);
        h1s.add(page.h1);
        allTitleH1Pairs.add(`${locale}\u0000${page.seo.title}\u0000${page.h1}`);

        expect(page.strings.limitationsTitle).toMatch(/\S/u);
        expect(page.strings.limitationsText).toMatch(/\S/u);
        expect(page.strings.privacyTitle).toMatch(/\S/u);
        expect(page.strings.privacyText).toMatch(/\S/u);
        expect(page.strings.faqOneQuestion).toMatch(/\S/u);
        expect(page.strings.faqOneAnswer).toMatch(/\S/u);
        expect(page.strings.primaryCta).toMatch(/\S/u);

        if (locale !== "en") {
          expect(page.h1).not.toBe(english.pages[key].h1);
          expect(page.lead).not.toBe(english.pages[key].lead);
          expect(page.strings.faqOneQuestion).not.toBe(
            english.pages[key].strings.faqOneQuestion
          );
        }
      }

      expect(titles.size, `${locale} duplicate landing titles`).toBe(
        LANDING_ROUTES.length
      );
      expect(descriptions.size, `${locale} duplicate landing descriptions`).toBe(
        LANDING_ROUTES.length
      );
      expect(h1s.size, `${locale} duplicate landing H1s`).toBe(
        LANDING_ROUTES.length
      );

      const serialized = JSON.stringify(content.pages);
      expect(serialized).not.toMatch(
        /no file size limits|files of any size|up to 90%|API access|batch processing feature|complete privacy and security|most operations complete in under 10 seconds/i
      );
    }

    expect(allTitleH1Pairs.size).toBe(20);
  });
});
