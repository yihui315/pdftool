import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { getLocale } from "../site/config/locales.mjs";
import {
  LANDING_ROUTES,
  canonicalPath,
  getRoute,
  outputPath
} from "../site/config/routes.mjs";
import { buildSite } from "../scripts/build-site.mjs";

const tempRoots = [];
const repoRoot = path.resolve(import.meta.dirname, "..");

const navigation = Object.freeze({
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
});
const runtimeMessages = Object.freeze({
  "file.reading": "Reading {filename}"
});
const landingLocaleCodes = Object.freeze(["en", "es", "pt-BR", "ja", "id"]);

async function tempRoot() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pdftool-build-"));
  tempRoots.push(directory);
  return directory;
}

async function writeJson(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeEnglishHomeFixture(contentRoot, { locale = "en" } = {}) {
  await writeJson(path.join(contentRoot, "en", "common.json"), {
    locale,
    navigation,
    languageMenu: {
      label: "Choose language",
      currentLanguage: "English"
    },
    accessibility: {
      skipToContent: "Skip to content",
      primaryNavigation: "Primary navigation",
      mobileNavigation: "Mobile navigation",
      openMenu: "Menu",
      closeMenu: "Close"
    },
    footer: {
      tagline: "Private browser-based PDF tools.",
      copyright: "Copyright 2026 PDFTool.work",
      privacy: "Privacy"
    }
  });
  await writeJson(path.join(contentRoot, "en", "runtime.json"), runtimeMessages);
  await writeJson(path.join(contentRoot, "en", "pages", "home.json"), {
    seo: {
      title: "Free PDF tools",
      description: "Work with PDF files privately in your browser."
    },
    h1: "PDF tools",
    lead: "Simple tools for everyday PDF tasks.",
    strings: {
      title: "PDF tools",
      lead: "Simple tools for everyday PDF tasks.",
      heroEyebrow: "PDFTool.work",
      heroTitle: "PDF tools",
      heroLead: "Simple tools for everyday PDF tasks.",
      primaryCta: "Prepare a PDF",
      primaryCtaLabel: "Prepare a PDF for upload",
      primaryCtaTitle: "Prepare a PDF for upload",
      secondaryCta: "Browse tools",
      secondaryCtaLabel: "Browse PDF tools",
      secondaryCtaTitle: "Browse PDF tools",
      proofCardLabel: "Local processing notes",
      proofEyebrow: "Notes",
      proofTitle: "Browser-based tools",
      proofLead: "Review practical limits before processing important documents.",
      proofBrowser: "Selected PDF contents are read by the browser.",
      proofLimits: "Large files can depend on browser memory and PDF structure.",
      proofAds: "Analytics and ads do not need to read the selected PDF.",
      adLabel: "Advertisement",
      toolsEyebrow: "Tasks",
      toolsTitle: "Common PDF jobs",
      toolsLead: "Choose a PDF task.",
      toolCompressTitle: "Compress PDF",
      toolCompressText: "Reduce file size for upload.",
      toolCardAction: "Open tool",
      toolMergeTitle: "Merge PDF",
      toolMergeText: "Combine files.",
      toolSplitTitle: "Split PDF",
      toolSplitText: "Extract pages.",
      toolManageTitle: "Manage pages",
      toolManageText: "Clean up page order.",
      workflowEyebrow: "Workflow",
      workflowTitle: "Simple PDF handling",
      workflowLead: "Choose, review, and save.",
      workflowStepOneTitle: "Choose",
      workflowStepOneText: "Select a local PDF.",
      workflowStepTwoTitle: "Review",
      workflowStepTwoText: "Check settings before processing.",
      workflowStepThreeTitle: "Save",
      workflowStepThreeText: "Download the generated result.",
      faqEyebrow: "FAQ",
      faqTitle: "Questions",
      faqLocalQuestion: "Is processing local?",
      faqLocalAnswer: "The selected PDF contents are read by the browser.",
      faqLargeQuestion: "Can large files fail?",
      faqLargeAnswer: "Large or complex files can be limited by browser memory.",
      faqAdsQuestion: "Why are there ads?",
      faqAdsAnswer: "Ads support free operation."
    }
  });
}

function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]);
}

function currentGitCommit() {
  return execFileSync(
    "git",
    ["-c", `safe.directory=${repoRoot}`, "rev-parse", "HEAD"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  ).trim();
}

function expectUtcIsoTimestamp(value) {
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  expect(new Date(value).toISOString()).toBe(value);
}

describe("atomic multilingual release builds", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((directory) => rm(directory, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  test("writes a manifest, vendor assets, and sitemap for injected routes", async () => {
    const root = await tempRoot();
    const contentRoot = path.join(root, "content");
    const outDir = path.join(root, "dist");
    await writeEnglishHomeFixture(contentRoot);

    const manifest = await buildSite({
      routes: [getRoute("home")],
      locales: [getLocale("en")],
      contentRoot,
      outDir
    });

    expect(manifest.routes).toHaveLength(1);
    expect(manifest.files).toContain("en/index.html");
    expect(manifest.files).toContain("assets/vendor/pdfjs/pdf.worker.mjs");
    expect(manifest.gitCommit).toBe(currentGitCommit());
    expectUtcIsoTimestamp(manifest.buildTimeUtc);

    const sitemap = await readFile(path.join(outDir, "sitemap.xml"), "utf8");
    expect(sitemapLocs(sitemap)).toHaveLength(1);

    const html = await readFile(path.join(outDir, "en", "index.html"), "utf8");
    const document = new JSDOM(html).window.document;
    const runtimeScript = document.querySelector(
      'script#runtime-i18n[type="application/json"]'
    );
    expect(runtimeScript).not.toBeNull();
    expect(JSON.parse(runtimeScript.textContent)).toEqual({
      locale: "en",
      messages: runtimeMessages
    });

    const diskManifest = JSON.parse(
      await readFile(path.join(outDir, "release-manifest.json"), "utf8")
    );
    expect(diskManifest.gitCommit).toBe(manifest.gitCommit);
    expect(diskManifest.buildTimeUtc).toBe(manifest.buildTimeUtc);
  });

  test("leaves the previous output untouched when locale validation fails", async () => {
    const root = await tempRoot();
    const contentRoot = path.join(root, "content");
    const outDir = path.join(root, "dist");
    const marker = path.join(outDir, "previous-output.txt");
    await writeEnglishHomeFixture(contentRoot, { locale: "fr" });
    await mkdir(outDir, { recursive: true });
    await writeFile(marker, "previous release\n", "utf8");

    await expect(
      buildSite({
        routes: [getRoute("home")],
        locales: [getLocale("en")],
        contentRoot,
        outDir
      })
    ).rejects.toThrow(/unsupported locale|locale identity mismatch/i);

    await expect(readFile(marker, "utf8")).resolves.toBe("previous release\n");
  });

  test("builds localized landing guides with visible sections and FAQ JSON-LD", async () => {
    const root = await tempRoot();
    const outDir = path.join(root, "dist");

    const manifest = await buildSite({ outDir });

    expect(manifest.routes).toHaveLength(98);
    expect(manifest.routes.filter(({ key }) =>
      LANDING_ROUTES.some((route) => route.key === key)
    )).toHaveLength(20);
    expect(manifest.staticPages).toEqual(
      expect.arrayContaining([
        "terms.html",
        "contact.html",
        "seo-action-contract-pdf-compress-1mb.html"
      ])
    );
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        "terms.html",
        "contact.html",
        "seo-action-contract-pdf-compress-1mb.html"
      ])
    );

    const sitemap = await readFile(path.join(outDir, "sitemap.xml"), "utf8");
    expect(sitemapLocs(sitemap)).toEqual(
      expect.arrayContaining([
        "https://pdftool.work/terms.html",
        "https://pdftool.work/contact.html",
        "https://pdftool.work/seo-action-contract-pdf-compress-1mb.html"
      ])
    );

    for (const locale of landingLocaleCodes) {
      for (const route of LANDING_ROUTES) {
        const relativePath = outputPath(locale, route.key);
        expect(manifest.files).toContain(relativePath);

        const html = await readFile(path.join(outDir, relativePath), "utf8");
        const document = new JSDOM(html).window.document;

        expect(document.querySelector("h1")?.textContent?.trim()).toBeTruthy();
        expect(
          document.querySelector('[data-landing-section="limitations"]')?.textContent
        ).toMatch(/\S/u);
        expect(
          document.querySelector('[data-landing-section="privacy"]')?.textContent
        ).toMatch(/\S/u);

        const primaryHref = document
          .querySelector("[data-landing-primary-cta]")
          ?.getAttribute("href");
        expect([canonicalPath(locale, "compress"), canonicalPath(locale, "uploadReady")]).toContain(
          primaryHref
        );

        const visibleQuestions = [
          ...document.querySelectorAll("[data-landing-faq-question]")
        ].map((node) => node.textContent.trim());
        expect(visibleQuestions).toHaveLength(3);

        const jsonLd = JSON.parse(
          document.querySelector('script[type="application/ld+json"]').textContent
        );
        expect(jsonLd["@type"]).toBe("FAQPage");
        expect(jsonLd.mainEntity.map((entry) => entry.name)).toEqual(visibleQuestions);
      }
    }
  }, 30_000);
});
