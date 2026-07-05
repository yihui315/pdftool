import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { getLocale } from "../site/config/locales.mjs";
import { getRoute } from "../site/config/routes.mjs";
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
      lead: "Simple tools for everyday PDF tasks."
    }
  });
}

function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]);
}

function currentGitCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
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
});
