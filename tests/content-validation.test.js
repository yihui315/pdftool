import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
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

function spanishCommon() {
  const common = validCommon();
  common.locale = "es";
  common.languageMenu.currentLanguage = "Español";
  return common;
}

const ENGLISH_RUNTIME = {
  complete: "Complete",
  reading: "Reading {filename}: {size}"
};

async function withSpanishLocale(runtime, assertion) {
  const directory = await mkdtemp(path.join(tmpdir(), "content-es-"));
  const pagesDirectory = path.join(directory, "pages");
  await mkdir(pagesDirectory);
  await Promise.all([
    writeFile(
      path.join(directory, "common.json"),
      JSON.stringify(spanishCommon()),
      "utf8"
    ),
    writeFile(path.join(directory, "runtime.json"), JSON.stringify(runtime), "utf8"),
    writeFile(
      path.join(pagesDirectory, "home.json"),
      JSON.stringify(validPage()),
      "utf8"
    )
  ]);

  try {
    return await assertion(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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

  test("names common.json when the locale directory is incomplete", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "content-missing-common-"));

    try {
      await expect(
        loadLocaleContent(directory, { expectedLocale: "en" })
      ).rejects.toThrow(/common\.json/);
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

  test("loads a non-English locale with English runtime parity", async () => {
    await withSpanishLocale(
      {
        complete: "Completado",
        reading: "Leyendo {filename}: {size}"
      },
      async (directory) => {
        await expect(
          loadLocaleContent(directory, {
            expectedLocale: "es",
            englishRuntime: ENGLISH_RUNTIME
          })
        ).resolves.toMatchObject({ locale: "es" });
      }
    );
  });

  test("rejects a missing runtime key through the locale loader", async () => {
    await withSpanishLocale(
      { reading: "Leyendo {filename}: {size}" },
      async (directory) => {
        await expect(
          loadLocaleContent(directory, {
            expectedLocale: "es",
            englishRuntime: ENGLISH_RUNTIME
          })
        ).rejects.toThrow(
          /runtime\.complete is missing; required by the English reference/
        );
      }
    );
  });

  test("rejects an extra runtime key through the locale loader", async () => {
    await withSpanishLocale(
      { ...ENGLISH_RUNTIME, surprise: "Sorpresa" },
      async (directory) => {
        await expect(
          loadLocaleContent(directory, {
            expectedLocale: "es",
            englishRuntime: ENGLISH_RUNTIME
          })
        ).rejects.toThrow(/runtime\.surprise.*unknown/i);
      }
    );
  });

  test("rejects a runtime token mismatch through the locale loader", async () => {
    await withSpanishLocale(
      { complete: "Completado", reading: "Leyendo {file}: {size}" },
      async (directory) => {
        await expect(
          loadLocaleContent(directory, {
            expectedLocale: "es",
            englishRuntime: ENGLISH_RUNTIME
          })
        ).rejects.toThrow(/runtime\.reading.*token mismatch/i);
      }
    );
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

  test("rejects unsafe navigation keys with a precise path", () => {
    const common = validCommon();
    Object.defineProperty(common.navigation, "__proto__", {
      enumerable: true,
      value: "unsafe"
    });
    expect(() => validateCommon(common, "en")).toThrow(
      /common\.navigation\.__proto__.*unsafe/i
    );
  });

  test("rejects unsafe keys in nested future content with a precise path", () => {
    const nested = validCommon();
    nested.future = [{ details: JSON.parse('{"constructor":"unsafe"}') }];
    expect(() => validateCommon(nested, "en")).toThrow(
      /common\.future\[0\]\.details\.constructor.*unsafe/i
    );
  });

  test("rejects cycles in future nested content", () => {
    const common = validCommon();
    common.future = {};
    common.future.self = common.future;

    expect(() => validateCommon(common, "en")).toThrow(
      /common\.future\.self.*cycle/i
    );
  });
});

describe("runtime content validation", () => {
  test("accepts a genuine cross-realm plain object", () => {
    const runtime = runInNewContext('({ reading: "Reading {filename}" })');

    expect(() => validateRuntime(runtime)).not.toThrow();
  });

  test("rejects non-plain objects and unsafe prototype chains", () => {
    class RuntimeDictionary {
      constructor() {
        this.reading = "Reading";
      }
    }

    expect(() => validateRuntime(new Date())).toThrow(/plain object/i);
    expect(() => validateRuntime(new Map())).toThrow(/plain object/i);
    expect(() => validateRuntime(new RuntimeDictionary())).toThrow(/plain object/i);
    expect(() => validateRuntime(Object.create({ reading: "Reading" }))).toThrow(
      /plain object/i
    );
  });

  test("rejects a forged null-rooted Object prototype", () => {
    const forgedPrototype = Object.create(null, {
      constructor: { value: Object }
    });
    const runtime = Object.create(forgedPrototype);
    runtime.reading = "Reading";

    expect(() => validateRuntime(runtime)).toThrow(/plain object/i);
  });

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

  test("rejects symbol keys", () => {
    const symbolRuntime = { reading: "Reading" };
    symbolRuntime[Symbol("secret")] = "hidden";
    expect(() => validateRuntime(symbolRuntime)).toThrow(/runtime.*symbol key/i);
  });

  test("rejects non-enumerable properties", () => {
    const hiddenRuntime = { reading: "Reading" };
    Object.defineProperty(hiddenRuntime, "hidden", { value: "secret" });
    expect(() => validateRuntime(hiddenRuntime)).toThrow(
      /runtime\.hidden.*non-enumerable/i
    );
  });

  test("rejects accessors without invoking them", () => {
    let invoked = false;
    const runtime = { reading: "Reading" };
    Object.defineProperty(runtime, "danger", {
      enumerable: true,
      get() {
        invoked = true;
        return "unsafe";
      }
    });

    expect(() => validateRuntime(runtime)).toThrow(/runtime\.danger.*accessor/i);
    expect(invoked).toBe(false);
  });

  test("rejects a missing reference key", () => {
    expect(() =>
      assertRuntimeParity(
        { reading: "Reading {filename}" },
        { reading: "Reading {filename}", complete: "Complete" }
      )
    ).toThrow(/runtime\.complete is missing; required by the English reference/);
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

  test("rejects unsafe keys at the page root with a precise path", () => {
    const rootPage = validPage();
    rootPage.constructor = "unsafe";
    expect(() => validatePage("home", rootPage, "en")).toThrow(
      /home\.constructor.*unsafe/i
    );
  });

  test("rejects unsafe keys in page SEO data with a precise path", () => {
    const seoPage = validPage();
    seoPage.seo.prototype = "unsafe";
    expect(() => validatePage("home", seoPage, "en")).toThrow(
      /home\.seo\.prototype.*unsafe/i
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

  test("reports the supplied path for malformed reference interpolation", () => {
    expect(() =>
      assertTokenParity("Reading {filename", "Reading {filename}", "runtime.reading")
    ).toThrow(/runtime\.reading.*malformed interpolation/i);
  });

  test("reports the supplied path for malformed candidate interpolation", () => {
    expect(() =>
      assertTokenParity("Reading {filename}", "Reading {filename", "runtime.reading")
    ).toThrow(/runtime\.reading.*malformed interpolation/i);
  });
});
