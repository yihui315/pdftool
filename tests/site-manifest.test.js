import { describe, expect, test } from "vitest";
import { LOCALES, getLocale } from "../site/config/locales.mjs";
import {
  CORE_ROUTES,
  LANDING_ROUTES,
  allOutputPaths,
  alternatePaths,
  canonicalPath,
  getRoute,
  outputPath,
  routesForLocale
} from "../site/config/routes.mjs";

const CORE_KEYS = [
  "home",
  "tools",
  "uploadReady",
  "merge",
  "split",
  "manage",
  "compress",
  "pdfToJpg",
  "jpgToPdf",
  "rotate",
  "unlock",
  "about",
  "privacy"
];

const LANDING_KEYS = [
  "compress1mb",
  "compress500kb",
  "compressReadable",
  "tooLargeToUpload"
];

describe("locale registry", () => {
  test("defines the six launch locales in stable order", () => {
    expect(LOCALES.map(({ code }) => code)).toEqual([
      "zh-CN",
      "en",
      "es",
      "pt-BR",
      "ja",
      "id"
    ]);
    expect(LOCALES).toEqual([
      { code: "zh-CN", prefix: "", hrefLang: "zh-CN", label: "简体中文", dir: "ltr" },
      { code: "en", prefix: "en", hrefLang: "en", label: "English", dir: "ltr" },
      { code: "es", prefix: "es", hrefLang: "es", label: "Español", dir: "ltr" },
      {
        code: "pt-BR",
        prefix: "pt-br",
        hrefLang: "pt-BR",
        label: "Português (Brasil)",
        dir: "ltr"
      },
      { code: "ja", prefix: "ja", hrefLang: "ja", label: "日本語", dir: "ltr" },
      { code: "id", prefix: "id", hrefLang: "id", label: "Bahasa Indonesia", dir: "ltr" }
    ]);
  });

  test("rejects unsupported locales", () => {
    expect(() => getLocale("fr")).toThrow("Unsupported locale: fr");
    expect(() => routesForLocale("fr")).toThrow("Unsupported locale: fr");
  });

  test("prevents locale metadata mutation", () => {
    expect(Object.isFrozen(LOCALES)).toBe(true);
    expect(LOCALES.every(Object.isFrozen)).toBe(true);
    expect(() => {
      LOCALES[0].prefix = "zh";
    }).toThrow(TypeError);
    expect(getLocale("zh-CN").prefix).toBe("");
  });
});

describe("route registry", () => {
  test("defines the core and landing routes in stable order", () => {
    expect(CORE_ROUTES.map(({ key }) => key)).toEqual(CORE_KEYS);
    expect(LANDING_ROUTES.map(({ key }) => key)).toEqual(LANDING_KEYS);
  });

  test("keeps existing Chinese filenames and stable localized filenames", () => {
    expect(CORE_ROUTES.map(({ chineseFilename, localizedFilename }) => [
      chineseFilename,
      localizedFilename
    ])).toEqual([
      ["index.html", "index.html"],
      ["pdf-tools.html", "pdf-tools.html"],
      ["upload-ready.html", "upload-ready.html"],
      ["merge.html", "merge-pdf.html"],
      ["split.html", "split-pdf.html"],
      ["manage.html", "manage-pdf.html"],
      ["compress.html", "compress-pdf.html"],
      ["pdf-to-jpg.html", "pdf-to-jpg.html"],
      ["jpg-to-pdf.html", "jpg-to-pdf.html"],
      ["pdf-rotate.html", "rotate-pdf.html"],
      ["pdf-unlock.html", "unlock-pdf.html"],
      ["about.html", "about.html"],
      ["privacy.html", "privacy.html"]
    ]);

    expect(LANDING_ROUTES.map(({ localizedFilename }) => localizedFilename)).toEqual([
      "compress-pdf-to-1mb.html",
      "compress-pdf-to-500kb.html",
      "compress-pdf-without-quality-loss.html",
      "pdf-too-large-to-upload.html"
    ]);
  });

  test("records page fragments and root-absolute route scripts", () => {
    expect(CORE_ROUTES.map(({ fragment }) => fragment)).toEqual([
      "home.html",
      "tools.html",
      "upload-ready.html",
      "merge.html",
      "split.html",
      "manage.html",
      "compress.html",
      "pdf-to-jpg.html",
      "jpg-to-pdf.html",
      "rotate.html",
      "unlock.html",
      "about.html",
      "privacy.html"
    ]);

    const routeScripts = CORE_ROUTES.flatMap(({ scripts }) => scripts);
    expect(routeScripts.length).toBeGreaterThan(0);
    for (const script of routeScripts) {
      expect(script.src).toMatch(/^\/assets\/[^\\]+$/);
      expect(["classic", "module"]).toContain(script.type);
    }
  });

  test("supports every core route in all locales and landing routes outside Chinese", () => {
    expect(routesForLocale("zh-CN")).toHaveLength(13);
    expect(routesForLocale("zh-CN").map(({ key }) => key)).toEqual(CORE_KEYS);

    for (const code of ["en", "es", "pt-BR", "ja", "id"]) {
      expect(routesForLocale(code)).toHaveLength(17);
      expect(routesForLocale(code).map(({ key }) => key)).toEqual([
        ...CORE_KEYS,
        ...LANDING_KEYS
      ]);
    }
  });

  test("rejects unsupported routes and unavailable locale-route combinations", () => {
    expect(() => getRoute("missing")).toThrow("Unsupported route: missing");
    expect(() => outputPath("en", "missing")).toThrow("Unsupported route: missing");
    expect(() => canonicalPath("fr", "home")).toThrow("Unsupported locale: fr");
    expect(() => outputPath("zh-CN", "compress1mb")).toThrow(
      "Route compress1mb is not available for locale: zh-CN"
    );
  });

  test("prevents route registry and route metadata mutation", () => {
    expect(Object.isFrozen(CORE_ROUTES)).toBe(true);
    expect(Object.isFrozen(LANDING_ROUTES)).toBe(true);

    const route = getRoute("merge");
    expect(Object.isFrozen(route)).toBe(true);
    expect(Object.isFrozen(route.locales)).toBe(true);
    expect(Object.isFrozen(route.scripts)).toBe(true);
    expect(route.scripts.every(Object.isFrozen)).toBe(true);
    expect(() => {
      route.scripts[0].src = "/assets/js/wrong.js";
    }).toThrow(TypeError);

    const localizedRoutes = routesForLocale("en");
    expect(Object.isFrozen(localizedRoutes)).toBe(true);
    expect(() => localizedRoutes.pop()).toThrow(TypeError);
  });
});

describe("public route paths", () => {
  test("distinguishes homepage output files from canonical directory URLs", () => {
    expect(outputPath("zh-CN", "home")).toBe("index.html");
    expect(canonicalPath("zh-CN", "home")).toBe("/");
    expect(outputPath("en", "home")).toBe("en/index.html");
    expect(canonicalPath("en", "home")).toBe("/en/");
    expect(outputPath("pt-BR", "compress")).toBe("pt-br/compress-pdf.html");
    expect(canonicalPath("pt-BR", "compress")).toBe("/pt-br/compress-pdf.html");
  });

  test("returns reciprocal locale alternates for available routes", () => {
    expect(alternatePaths("compress")).toEqual([
      { locale: "zh-CN", hrefLang: "zh-CN", path: "/compress.html" },
      { locale: "en", hrefLang: "en", path: "/en/compress-pdf.html" },
      { locale: "es", hrefLang: "es", path: "/es/compress-pdf.html" },
      { locale: "pt-BR", hrefLang: "pt-BR", path: "/pt-br/compress-pdf.html" },
      { locale: "ja", hrefLang: "ja", path: "/ja/compress-pdf.html" },
      { locale: "id", hrefLang: "id", path: "/id/compress-pdf.html" }
    ]);
    expect(alternatePaths("compress1mb").map(({ locale }) => locale)).toEqual([
      "en",
      "es",
      "pt-BR",
      "ja",
      "id"
    ]);
    expect(Object.isFrozen(alternatePaths("home"))).toBe(true);
    expect(alternatePaths("home").every(Object.isFrozen)).toBe(true);
  });

  test("produces 98 unique URL-safe output paths", () => {
    const paths = allOutputPaths();
    expect(paths).toHaveLength(98);
    expect(new Set(paths).size).toBe(98);
    expect(paths.every((path) => !path.startsWith("/") && !path.includes("\\"))).toBe(true);
    expect(Object.isFrozen(paths)).toBe(true);

    for (const route of [...CORE_ROUTES, ...LANDING_ROUTES]) {
      for (const alternate of alternatePaths(route.key)) {
        expect(alternate.path).toMatch(/^\//);
        expect(alternate.path).not.toContain("\\");
      }
    }
  });
});
