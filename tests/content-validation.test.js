import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  assertRuntimeParity,
  assertTokenParity,
  interpolationTokens,
  loadLocaleContent,
  readJson,
  validateCommon,
  validatePage,
  validateRuntime
} from "../site/lib/content.mjs";

const FIXTURES = fileURLToPath(new URL("./fixtures/content/", import.meta.url));

function loadLocaleFixture(name, options = {}) {
  return loadLocaleContent(path.join(FIXTURES, name), {
    expectedLocale: "en",
    ...options
  });
}

function validCommon() {
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
      copyright: "Copyright PDFTool.work",
      privacy: "Privacy"
    }
  };
}

function validPage() {
  return {
    seo: {
      title: "Free PDF tools",
      description: "Work with PDF files in your browser."
    },
    h1: "PDF tools",
    lead: "Simple tools for everyday PDF tasks.",
    strings: {
      callToAction: "Choose a tool"
    }
  };
}

describe("locale content loading", () => {
  test("loads a valid locale fixture", async () => {
    await expect(loadLocaleFixture("valid")).resolves.toMatchObject({
      locale: "en"
    });
  });

  test("reports a precise nested path for invalid page content", async () => {
    await expect(loadLocaleFixture("invalid")).rejects.toThrow(
      /home\.seo\.description/
    );
  });

  test("includes the source filename in malformed JSON errors", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "content-json-"));
    const filename = path.join(directory, "broken.json");
    await writeFile(filename, '{"locale":', "utf8");

    try {
      await expect(readJson(filename)).rejects.toThrow(/broken\.json/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("returns deeply immutable locale content", async () => {
    const content = await loadLocaleFixture("valid");

    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(content.common.navigation)).toBe(true);
    expect(Object.isFrozen(content.pages.home.seo)).toBe(true);
    expect(() => {
      content.pages.home.seo.title = "Changed";
    }).toThrow(TypeError);
  });

  test("rejects a locale identity mismatch", async () => {
    await expect(
      loadLocaleFixture("valid", { expectedLocale: "es" })
    ).rejects.toThrow(/common\.locale.*es.*en/i);
  });
});

describe("common content validation", () => {
  test("requires every shared navigation label", () => {
    const common = validCommon();
    common.navigation.uploadReady = " ";

    expect(() => validateCommon(common, "en")).toThrow(
      /common\.navigation\.uploadReady/
    );
  });

  test("requires language menu text", () => {
    const common = validCommon();
    delete common.languageMenu.currentLanguage;

    expect(() => validateCommon(common, "en")).toThrow(
      /common\.languageMenu\.currentLanguage/
    );
  });

  test("requires footer labels", () => {
    const common = validCommon();
    common.footer.tagline = "";

    expect(() => validateCommon(common, "en")).toThrow(
      /common\.footer\.tagline/
    );
  });
});

describe("runtime content validation", () => {
  test("requires a plain flat object", () => {
    expect(() => validateRuntime([])).toThrow(/runtime.*plain object/i);
    expect(() => validateRuntime({ reading: { label: "Reading" } })).toThrow(
      /runtime\.reading/
    );
  });

  test("rejects non-string and empty runtime values", () => {
    expect(() => validateRuntime({ reading: 42 })).toThrow(/runtime\.reading/);
    expect(() => validateRuntime({ reading: "  " })).toThrow(/runtime\.reading/);
  });

  test("rejects unsafe runtime keys", () => {
    const runtime = JSON.parse('{"__proto__":"unsafe"}');

    expect(() => validateRuntime(runtime)).toThrow(/runtime\.__proto__.*unsafe/i);
  });

  test("rejects a missing reference key", () => {
    expect(() =>
      assertRuntimeParity(
        { reading: "Reading {filename}" },
        { reading: "Reading {filename}", complete: "Complete" }
      )
    ).toThrow(/runtime\.complete.*missing/i);
  });

  test("rejects an extra reference key", () => {
    expect(() =>
      assertRuntimeParity(
        { reading: "Reading {filename}", surprise: "Surprise" },
        { reading: "Reading {filename}" }
      )
    ).toThrow(/runtime\.surprise.*unknown/i);
  });

  test("enforces interpolation token parity", () => {
    expect(() =>
      assertRuntimeParity(
        { reading: "Reading {file}" },
        { reading: "Reading {filename}" }
      )
    ).toThrow(/runtime\.reading.*token mismatch/i);
  });
});

describe("page content validation", () => {
  test("requires SEO description text", () => {
    const page = validPage();
    page.seo.description = "";

    expect(() => validatePage("home", page, "en")).toThrow(
      /home\.seo\.description/
    );
  });

  test("requires non-empty heading and lead text", () => {
    const page = validPage();
    page.h1 = " ";

    expect(() => validatePage("home", page, "en")).toThrow(/home\.h1/);
  });

  test("requires a plain string dictionary", () => {
    const arrayPage = validPage();
    arrayPage.strings = [];
    expect(() => validatePage("home", arrayPage, "en")).toThrow(
      /home\.strings.*plain object/i
    );

    const emptyValuePage = validPage();
    emptyValuePage.strings.callToAction = "";
    expect(() => validatePage("home", emptyValuePage, "en")).toThrow(
      /home\.strings\.callToAction/
    );
  });

  test("rejects an unknown route key", () => {
    expect(() => validatePage("notARoute", validPage(), "en")).toThrow(
      /unknown route.*notARoute/i
    );
  });
});

describe("interpolation tokens", () => {
  test("returns unique sorted ASCII token names", () => {
    expect(interpolationTokens("{size}: Reading {filename} ({size})")).toEqual([
      "filename",
      "size"
    ]);
  });

  test("rejects malformed braces", () => {
    expect(() => interpolationTokens("Reading {filename")).toThrow(
      /malformed interpolation/i
    );
    expect(() => interpolationTokens("Reading {file-name}")).toThrow(
      /malformed interpolation/i
    );
  });

  test("reports the supplied path when token sets differ", () => {
    expect(() =>
      assertTokenParity("{filename}", "{file}", "runtime.reading")
    ).toThrow(/runtime\.reading.*token mismatch/i);
  });
});
