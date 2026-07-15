import { LOCALES, getLocale } from "./locales.mjs";

const ALL_LOCALE_CODES = Object.freeze(LOCALES.map(({ code }) => code));
const NON_CHINESE_LOCALE_CODES = Object.freeze(
  ALL_LOCALE_CODES.filter((code) => code !== "zh-CN")
);
const NO_SCRIPTS = Object.freeze([]);

/**
 * A route script descriptor. `type` is explicit so the layout can preserve
 * module execution without inspecting filenames.
 *
 * @param {string} src Root-absolute public asset URL.
 * @param {"classic" | "module"} [type="classic"] Script execution type.
 */
function routeScript(src, type = "classic") {
  return Object.freeze({ src, type });
}

/**
 * @param {string} key Stable route identifier used by locale content.
 * @param {string} chineseFilename Existing root-level Chinese filename.
 * @param {string} localizedFilename Stable filename below a locale prefix.
 * @param {string} fragment Page fragment filename below site/templates/pages.
 * @param {ReadonlyArray<Readonly<{src: string, type: string}>>} [scripts]
 */
function coreRoute(
  key,
  chineseFilename,
  localizedFilename,
  fragment,
  scripts = NO_SCRIPTS
) {
  return Object.freeze({
    key,
    chineseFilename,
    localizedFilename,
    fragment,
    scripts: scripts === NO_SCRIPTS ? scripts : Object.freeze(scripts),
    locales: ALL_LOCALE_CODES
  });
}

/**
 * @param {string} key Stable route identifier used by locale content.
 * @param {string} localizedFilename Stable filename below a locale prefix.
 */
function landingRoute(key, localizedFilename) {
  return Object.freeze({
    key,
    chineseFilename: null,
    localizedFilename,
    fragment: null,
    scripts: NO_SCRIPTS,
    locales: NON_CHINESE_LOCALE_CODES
  });
}

const PDF_LIB = routeScript("/assets/vendor/pdf-lib.min.js");

export const CORE_ROUTES = Object.freeze([
  coreRoute("home", "index.html", "index.html", "home.html"),
  coreRoute("tools", "pdf-tools.html", "pdf-tools.html", "tools.html"),
  coreRoute(
    "uploadReady",
    "upload-ready.html",
    "upload-ready.html",
    "upload-ready.html",
    [routeScript("/assets/js/upload-ready.js", "module")]
  ),
  coreRoute("merge", "merge.html", "merge-pdf.html", "merge.html", [
    PDF_LIB,
    routeScript("/assets/js/merge.js")
  ]),
  coreRoute("split", "split.html", "split-pdf.html", "split.html", [
    PDF_LIB,
    routeScript("/assets/js/split.js")
  ]),
  coreRoute("manage", "manage.html", "manage-pdf.html", "manage.html", [
    PDF_LIB,
    routeScript("/assets/js/manage.js", "module")
  ]),
  coreRoute("compress", "compress.html", "compress-pdf.html", "compress.html", [
    PDF_LIB,
    routeScript("/assets/js/compress.js")
  ]),
  coreRoute(
    "pdfToJpg",
    "pdf-to-jpg.html",
    "pdf-to-jpg.html",
    "pdf-to-jpg.html",
    [PDF_LIB, routeScript("/assets/js/pdf-to-jpg.js", "module")]
  ),
  coreRoute(
    "jpgToPdf",
    "jpg-to-pdf.html",
    "jpg-to-pdf.html",
    "jpg-to-pdf.html",
    [PDF_LIB, routeScript("/assets/js/jpg-to-pdf.js")]
  ),
  coreRoute("rotate", "pdf-rotate.html", "rotate-pdf.html", "rotate.html", [
    PDF_LIB,
    routeScript("/assets/js/pdf-rotate.js")
  ]),
  coreRoute("unlock", "pdf-unlock.html", "unlock-pdf.html", "unlock.html", [
    PDF_LIB,
    routeScript("/assets/js/unlock.js")
  ]),
  coreRoute("about", "about.html", "about.html", "about.html"),
  coreRoute("privacy", "privacy.html", "privacy.html", "privacy.html"),
  coreRoute("contact", "contact.html", "contact.html", "contact.html"),
  coreRoute("terms", "terms.html", "terms.html", "terms.html")
]);

export const LANDING_ROUTES = Object.freeze([
  landingRoute("compress1mb", "compress-pdf-to-1mb.html"),
  landingRoute("compress500kb", "compress-pdf-to-500kb.html"),
  landingRoute("compressReadable", "compress-pdf-without-quality-loss.html"),
  landingRoute("tooLargeToUpload", "pdf-too-large-to-upload.html")
]);

const ROUTES = Object.freeze([...CORE_ROUTES, ...LANDING_ROUTES]);
const ROUTE_BY_KEY = new Map(ROUTES.map((route) => [route.key, route]));

/** Return immutable metadata for a route key. */
export function getRoute(key) {
  const route = ROUTE_BY_KEY.get(key);
  if (!route) throw new Error(`Unsupported route: ${key}`);
  return route;
}

/** Return the immutable route list available in a locale. */
export function routesForLocale(code) {
  getLocale(code);
  return Object.freeze(ROUTES.filter(({ locales }) => locales.includes(code)));
}

function availableRoute(code, key) {
  const locale = getLocale(code);
  const route = getRoute(key);
  if (!route.locales.includes(code)) {
    throw new Error(`Route ${key} is not available for locale: ${code}`);
  }
  return { locale, route };
}

/**
 * Return a repository-relative output filename. Public URL construction must
 * use `canonicalPath` instead of treating this filesystem path as a URL.
 */
export function outputPath(code, key) {
  const { locale, route } = availableRoute(code, key);
  const filename = code === "zh-CN" ? route.chineseFilename : route.localizedFilename;
  return locale.prefix ? `${locale.prefix}/${filename}` : filename;
}

/** Return the root-absolute canonical URL path for a locale route. */
export function canonicalPath(code, key) {
  const { locale, route } = availableRoute(code, key);
  if (route.key === "home") return locale.prefix ? `/${locale.prefix}/` : "/";
  return `/${outputPath(code, key)}`;
}

/**
 * Return immutable reciprocal alternate records in locale registry order.
 * Landing pages omit Chinese because no equivalent Chinese route is emitted.
 */
export function alternatePaths(key) {
  const route = getRoute(key);
  return Object.freeze(
    route.locales.map((code) => {
      const locale = getLocale(code);
      return Object.freeze({
        locale: code,
        hrefLang: locale.hrefLang,
        path: canonicalPath(code, key)
      });
    })
  );
}

/** Return all 98 immutable, unique repository-relative launch output paths. */
export function allOutputPaths() {
  return Object.freeze(
    LOCALES.flatMap(({ code }) =>
      routesForLocale(code).map(({ key }) => outputPath(code, key))
    )
  );
}
