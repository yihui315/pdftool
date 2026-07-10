import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { RUNTIME_KEYS } from "../site/config/runtime-keys.mjs";
import { validateRuntime } from "../site/lib/content.mjs";

const I18N_SCRIPT = fileURLToPath(new URL("../assets/js/i18n.js", import.meta.url));
const VALID_RUNTIME = new URL("./fixtures/content/valid/runtime.json", import.meta.url);

async function loadValidRuntime() {
  return JSON.parse(await readFile(VALID_RUNTIME, "utf8"));
}

async function loadRuntimeI18n(payload, { includeScript = true, rawText } = {}) {
  const source = await readFile(I18N_SCRIPT, "utf8");
  const script = includeScript
    ? { textContent: rawText ?? JSON.stringify(payload) }
    : null;
  const context = {
    document: {
      getElementById(id) {
        return id === "runtime-i18n" ? script : null;
      }
    },
    window: {}
  };

  runInNewContext(source, context, { filename: I18N_SCRIPT });
  return context.window.PDFToolI18n;
}

describe("browser runtime translations", () => {
  test("interpolates runtime message values exactly", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });

    expect(runtime.t("file.reading", { filename: "a.pdf" })).toBe("Reading a.pdf");
  });

  test("interpolates messages from the valid runtime fixture", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: await loadValidRuntime()
    });

    expect(runtime.t("file.reading", { filename: "a.pdf" })).toBe("Reading a.pdf");
  });

  test("throws a clear error for missing runtime keys", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });

    expect(() => runtime.t("file.missing")).toThrow(/Missing runtime translation/);
  });

  test("keeps interpolated HTML as plain text when assigned to textContent", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });
    const dom = new JSDOM('<p id="status"></p>');
    const status = dom.window.document.getElementById("status");

    status.textContent = runtime.t("file.reading", {
      filename: '<img src=x onerror="window.__executed = true">'
    });

    expect(status.textContent).toBe(
      'Reading <img src=x onerror="window.__executed = true">'
    );
    expect(status.querySelector("img")).toBeNull();
    expect(status.innerHTML).toBe(
      'Reading &lt;img src=x onerror="window.__executed = true"&gt;'
    );
  });

  test("throws key and token context for missing interpolation values", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });

    expect(() => runtime.t("file.reading")).toThrow(
      /Missing interpolation value: file\.reading\.filename/
    );
  });

  test("exposes the locale identity from the runtime JSON", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });

    expect(runtime.locale).toBe("en");
  });

  test("freezes the exposed runtime API", async () => {
    const runtime = await loadRuntimeI18n({
      locale: "en",
      messages: {
        "file.reading": "Reading {filename}"
      }
    });

    expect(Object.isFrozen(runtime)).toBe(true);
    expect(() => {
      Object.defineProperty(runtime, "locale", { value: "es" });
    }).toThrow(TypeError);
  });

  test("fails clearly when the runtime JSON script is missing", async () => {
    await expect(
      loadRuntimeI18n(
        {
          locale: "en",
          messages: {
            "file.reading": "Reading {filename}"
          }
        },
        { includeScript: false }
      )
    ).rejects.toThrow(/runtime-i18n/);
  });

  test("fails clearly when the runtime JSON is invalid", async () => {
    await expect(loadRuntimeI18n(null, { rawText: "{" })).rejects.toThrow(
      /Invalid runtime translation JSON/
    );
  });

  test("fails clearly when locale identity is missing", async () => {
    await expect(
      loadRuntimeI18n({
        messages: {
          "file.reading": "Reading {filename}"
        }
      })
    ).rejects.toThrow(/locale.*missing/i);
  });

  test("fails clearly when messages are not a plain object", async () => {
    await expect(
      loadRuntimeI18n({
        locale: "en",
        messages: []
      })
    ).rejects.toThrow(/messages.*plain object/i);
  });
});

describe("runtime translation key contract", () => {
  test("runtime key registry is sorted and contains no duplicates", () => {
    expect(RUNTIME_KEYS).toEqual([...RUNTIME_KEYS].sort());
    expect(new Set(RUNTIME_KEYS).size).toBe(RUNTIME_KEYS.length);
    expect(Object.isFrozen(RUNTIME_KEYS)).toBe(true);
  });

  test("content validation rejects missing and unknown runtime keys against the registry", async () => {
    const runtime = await loadValidRuntime();
    expect(() => validateRuntime(runtime)).not.toThrow();

    const missing = { ...runtime };
    delete missing["file.reading"];
    expect(() => validateRuntime(missing)).toThrow(
      /runtime\.file\.reading is missing; required by the runtime key registry/
    );

    const unknown = { ...runtime, "file.extra": "Extra" };
    expect(() => validateRuntime(unknown)).toThrow(
      /runtime\.file\.extra is unknown in the runtime key registry/
    );
  });
});
