import { getLocale } from "../config/locales.mjs";
import { alternatePaths, canonicalPath } from "../config/routes.mjs";
import { escapeAttribute, safeJson } from "./html.mjs";
import { absoluteUrl, DEFAULT_ORIGIN } from "./paths.mjs";

function requirePage(page) {
  if (
    page === null ||
    typeof page !== "object" ||
    page.seo === null ||
    typeof page.seo !== "object" ||
    typeof page.seo.title !== "string" ||
    typeof page.seo.description !== "string"
  ) {
    throw new Error("Page SEO metadata must include title and description");
  }
  return page;
}

export function canonicalUrl(locale, routeKey, origin = DEFAULT_ORIGIN) {
  return absoluteUrl(canonicalPath(locale, routeKey), origin);
}

export function xDefaultUrl(routeKey, origin = DEFAULT_ORIGIN) {
  try {
    return canonicalUrl("en", routeKey, origin);
  } catch {
    return absoluteUrl("/en/", origin);
  }
}

export function alternateLinkEntries(routeKey, origin = DEFAULT_ORIGIN) {
  return Object.freeze(
    [
      ...alternatePaths(routeKey).map((alternate) =>
        Object.freeze({
          rel: "alternate",
          locale: alternate.locale,
          hreflang: alternate.hrefLang,
          href: absoluteUrl(alternate.path, origin)
        })
      ),
      Object.freeze({
        rel: "alternate",
        locale: "x-default",
        hreflang: "x-default",
        href: xDefaultUrl(routeKey, origin)
      })
    ]
  );
}

export function renderCanonicalLink(locale, routeKey, origin = DEFAULT_ORIGIN) {
  return `<link rel="canonical" href="${escapeAttribute(
    canonicalUrl(locale, routeKey, origin)
  )}">`;
}

export function renderAlternateLinks(routeKey, origin = DEFAULT_ORIGIN) {
  return alternateLinkEntries(routeKey, origin)
    .map(
      ({ hreflang, href }) =>
        `<link rel="alternate" hreflang="${escapeAttribute(
          hreflang
        )}" href="${escapeAttribute(href)}">`
    )
    .join("\n");
}

export function pageStructuredData({
  locale,
  routeKey,
  page,
  origin = DEFAULT_ORIGIN
}) {
  const metadata = requirePage(page);
  const localeConfig = getLocale(locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    inLanguage: localeConfig.hrefLang,
    name: metadata.seo.title,
    description: metadata.seo.description,
    url: canonicalUrl(locale, routeKey, origin),
    isPartOf: {
      "@type": "WebSite",
      name: "PDFTool.work",
      url: absoluteUrl("/", origin)
    }
  };
}

export function renderJsonLd(value) {
  return `<script type="application/ld+json">${safeJson(value)}</script>`;
}

export function renderSeoHead({
  locale,
  routeKey,
  page,
  origin = DEFAULT_ORIGIN,
  structuredData
}) {
  const metadata = requirePage(page);
  const url = canonicalUrl(locale, routeKey, origin);
  const jsonLd =
    structuredData ??
    page.structuredData ??
    pageStructuredData({ locale, routeKey, page, origin });

  return [
    `<title>${escapeAttribute(metadata.seo.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(
      metadata.seo.description
    )}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeAttribute(metadata.seo.title)}">`,
    `<meta property="og:description" content="${escapeAttribute(
      metadata.seo.description
    )}">`,
    `<meta property="og:url" content="${escapeAttribute(url)}">`,
    renderCanonicalLink(locale, routeKey, origin),
    renderAlternateLinks(routeKey, origin),
    renderJsonLd(jsonLd)
  ].join("\n");
}
