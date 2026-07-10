import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { CORE_ROUTES, getRoute } from "../config/routes.mjs";
import { getLocale } from "../config/locales.mjs";
import { RUNTIME_KEYS } from "../config/runtime-keys.mjs";

const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const TOKEN_PATTERN = /\{([A-Za-z0-9_]+)\}/g;
const OBJECT_TAG = "[object Object]";
const NATIVE_OBJECT_SOURCE = Function.prototype.toString.call(Object);
const NATIVE_ARRAY_SOURCE = Function.prototype.toString.call(Array);
const RUNTIME_KEY_SET = new Set(RUNTIME_KEYS);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Object.prototype.toString.call(value) !== OBJECT_TAG) return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;
  if (Object.getPrototypeOf(prototype) !== null) return false;
  if (!Object.prototype.hasOwnProperty.call(prototype, "constructor")) return false;

  const constructor = prototype.constructor;
  return (
    typeof constructor === "function" &&
    constructor.prototype === prototype &&
    Function.prototype.toString.call(constructor) === NATIVE_OBJECT_SOURCE
  );
}

function isOrdinaryArray(value) {
  if (!Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype)) return false;
  if (!Object.prototype.hasOwnProperty.call(prototype, "constructor")) return false;

  const constructor = prototype.constructor;
  return (
    typeof constructor === "function" &&
    constructor.prototype === prototype &&
    Function.prototype.toString.call(constructor) === NATIVE_ARRAY_SOURCE
  );
}

function requirePlainObject(value, fieldPath) {
  if (!isPlainObject(value)) {
    throw new Error(`${fieldPath} must be a plain object`);
  }
  return value;
}

function requireString(value, fieldPath) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing non-empty translation: ${fieldPath}`);
  }
  return value;
}

function assertSafeKey(key, keyPath) {
  if (UNSAFE_OBJECT_KEYS.has(key)) {
    throw new Error(`${keyPath} is an unsafe object key`);
  }
}

function isArrayIndexKey(key) {
  if (typeof key !== "string" || key.trim() === "") return false;
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < 2 ** 32 - 1 &&
    String(index) === key
  );
}

function propertyPath(parentPath, key, parentIsArray = false) {
  if (typeof key === "symbol") {
    return `${parentPath}.${String(key)}`;
  }
  if (parentIsArray && isArrayIndexKey(key)) {
    return `${parentPath}[${key}]`;
  }
  return `${parentPath}.${key}`;
}

function assertSafeJsonData(value, fieldPath, ancestors = new WeakSet()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const parentIsArray = Array.isArray(value);
  if (parentIsArray) {
    if (!isOrdinaryArray(value)) {
      throw new Error(`${fieldPath} must be an ordinary array`);
    }
  } else {
    requirePlainObject(value, fieldPath);
  }

  if (ancestors.has(value)) {
    throw new Error(`${fieldPath} contains a cycle`);
  }
  ancestors.add(value);

  for (const key of Reflect.ownKeys(value)) {
    if (parentIsArray && key === "length") continue;

    const keyPath = propertyPath(fieldPath, key, parentIsArray);
    if (typeof key === "symbol") {
      throw new Error(`${fieldPath} has a symbol key: ${String(key)}`);
    }
    assertSafeKey(key, keyPath);

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable) {
      throw new Error(`${keyPath} is a non-enumerable property`);
    }
    if (!("value" in descriptor)) {
      throw new Error(`${keyPath} is an accessor property`);
    }

    assertSafeJsonData(descriptor.value, keyPath, ancestors);
  }

  ancestors.delete(value);
  return value;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/** Read and parse a UTF-8 JSON file, preserving its filename in failures. */
export async function readJson(filename) {
  let source;
  try {
    source = await readFile(filename, "utf8");
  } catch (error) {
    throw new Error(`Unable to read JSON file ${filename}: ${error.message}`, {
      cause: error
    });
  }

  try {
    return JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Invalid JSON in ${filename}: ${error.message}`, {
      cause: error
    });
  }
}

/** Return unique, sorted interpolation names from `{asciiToken}` markers. */
export function interpolationTokens(message) {
  if (typeof message !== "string") {
    throw new Error("Interpolation source must be a string");
  }

  const tokens = [];
  const remainder = message.replace(TOKEN_PATTERN, (_match, token) => {
    tokens.push(token);
    return "";
  });
  if (/[{}]/.test(remainder)) {
    throw new Error(`Malformed interpolation token in: ${message}`);
  }
  return [...new Set(tokens)].sort();
}

/** Require translated text to retain exactly the reference interpolation set. */
export function assertTokenParity(reference, translation, fieldPath) {
  let referenceTokens;
  let translationTokens;
  try {
    referenceTokens = interpolationTokens(reference);
  } catch (error) {
    throw new Error(`${fieldPath} reference: ${error.message}`, { cause: error });
  }
  try {
    translationTokens = interpolationTokens(translation);
  } catch (error) {
    throw new Error(`${fieldPath} candidate: ${error.message}`, { cause: error });
  }
  if (JSON.stringify(referenceTokens) !== JSON.stringify(translationTokens)) {
    throw new Error(
      `${fieldPath} token mismatch: expected ${referenceTokens.join(", ") || "none"}; ` +
        `received ${translationTokens.join(", ") || "none"}`
    );
  }
}

/** Validate the shared strings needed by the site layout. */
export function validateCommon(common, expectedLocale) {
  assertSafeJsonData(common, "common");
  requirePlainObject(common, "common");
  const locale = requireString(common.locale, "common.locale");
  try {
    getLocale(locale);
  } catch {
    throw new Error(`Unsupported locale at common.locale: ${locale}`);
  }
  if (expectedLocale !== undefined && locale !== expectedLocale) {
    throw new Error(
      `Locale identity mismatch at common.locale: expected ${expectedLocale}, received ${locale}`
    );
  }

  requirePlainObject(common.navigation, "common.navigation");
  for (const { key } of CORE_ROUTES) {
    requireString(common.navigation[key], `common.navigation.${key}`);
  }

  requirePlainObject(common.languageMenu, "common.languageMenu");
  requireString(common.languageMenu.label, "common.languageMenu.label");
  requireString(
    common.languageMenu.currentLanguage,
    "common.languageMenu.currentLanguage"
  );

  requirePlainObject(common.footer, "common.footer");
  requireString(common.footer.tagline, "common.footer.tagline");
  requireString(common.footer.copyright, "common.footer.copyright");
  requireString(common.footer.privacy, "common.footer.privacy");
  return common;
}

/** Validate one flat runtime translation dictionary. */
export function validateRuntime(runtime, fieldPath = "runtime") {
  assertSafeJsonData(runtime, fieldPath);
  requirePlainObject(runtime, fieldPath);

  for (const key of RUNTIME_KEYS) {
    if (!Object.hasOwn(runtime, key)) {
      throw new Error(
        `${fieldPath}.${key} is missing; required by the runtime key registry`
      );
    }
  }

  for (const [key, value] of Object.entries(runtime)) {
    assertSafeKey(key, propertyPath(fieldPath, key));
    if (!RUNTIME_KEY_SET.has(key)) {
      throw new Error(`${fieldPath}.${key} is unknown in the runtime key registry`);
    }
    requireString(value, `${fieldPath}.${key}`);
    try {
      interpolationTokens(value);
    } catch (error) {
      throw new Error(`${fieldPath}.${key}: ${error.message}`, { cause: error });
    }
  }
  return runtime;
}

/** Require a runtime dictionary to match the English keys and token sets. */
export function assertRuntimeParity(runtime, englishRuntime) {
  validateRuntime(runtime, "runtime");
  validateRuntime(englishRuntime, "englishRuntime");

  const runtimeKeys = Object.keys(runtime);
  const referenceKeys = RUNTIME_KEYS;
  for (const key of referenceKeys) {
    if (!Object.hasOwn(runtime, key)) {
      throw new Error(`runtime.${key} is missing; required by the English reference`);
    }
  }
  for (const key of runtimeKeys) {
    if (!Object.hasOwn(englishRuntime, key)) {
      throw new Error(`runtime.${key} is unknown in the English reference key set`);
    }
  }
  for (const key of referenceKeys) {
    assertTokenParity(englishRuntime[key], runtime[key], `runtime.${key}`);
  }
  return runtime;
}

/** Validate the localized content contract for one route. */
export function validatePage(routeKey, page, locale) {
  let route;
  try {
    route = getRoute(routeKey);
  } catch {
    throw new Error(`Unknown route key: ${routeKey}`);
  }
  if (locale !== undefined) {
    getLocale(locale);
    if (!route.locales.includes(locale)) {
      throw new Error(`Route ${routeKey} is not available for locale: ${locale}`);
    }
  }

  assertSafeJsonData(page, routeKey);
  requirePlainObject(page, routeKey);
  requirePlainObject(page.seo, `${routeKey}.seo`);
  requireString(page.seo.title, `${routeKey}.seo.title`);
  requireString(page.seo.description, `${routeKey}.seo.description`);
  requireString(page.h1, `${routeKey}.h1`);
  requireString(page.lead, `${routeKey}.lead`);
  requirePlainObject(page.strings, `${routeKey}.strings`);
  for (const [key, value] of Object.entries(page.strings)) {
    assertSafeKey(key, propertyPath(`${routeKey}.strings`, key));
    requireString(value, `${routeKey}.strings.${key}`);
  }
  return page;
}

/**
 * Load one locale directory containing common.json, runtime.json, and pages/*.json.
 * Non-English callers must pass the already-loaded English runtime dictionary.
 */
export async function loadLocaleContent(
  localeDirectory,
  { expectedLocale, englishRuntime } = {}
) {
  const common = await readJson(path.join(localeDirectory, "common.json"));
  validateCommon(common, expectedLocale);

  const runtime = await readJson(path.join(localeDirectory, "runtime.json"));
  validateRuntime(runtime);
  const referenceRuntime = common.locale === "en" ? runtime : englishRuntime;
  if (referenceRuntime === undefined) {
    throw new Error(`English runtime reference is required for locale: ${common.locale}`);
  }
  assertRuntimeParity(runtime, referenceRuntime);

  const pagesDirectory = path.join(localeDirectory, "pages");
  const entries = await readdir(pagesDirectory, { withFileTypes: true });
  const pageEntries = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  const pages = {};
  for (const entry of pageEntries) {
    const routeKey = entry.name.slice(0, -".json".length);
    const page = await readJson(path.join(pagesDirectory, entry.name));
    validatePage(routeKey, page, common.locale);
    pages[routeKey] = page;
  }

  return deepFreeze({
    locale: common.locale,
    common,
    runtime,
    pages
  });
}
