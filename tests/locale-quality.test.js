import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { getLocale } from "../site/config/locales.mjs";
import { CORE_ROUTES, canonicalPath } from "../site/config/routes.mjs";
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
});
