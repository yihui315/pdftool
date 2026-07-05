import { absoluteUrl, DEFAULT_ORIGIN } from "./paths.mjs";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteFirstPartyUrl(pathOrUrl, origin) {
  const value = String(pathOrUrl);
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return new URL(value).href;
  return absoluteUrl(value, origin);
}

export function sitemapUrl({ loc, path, alternates = [] }, { origin = DEFAULT_ORIGIN } = {}) {
  const url = loc ?? path;
  if (!url) throw new Error("Sitemap URL entries require loc or path.");

  const alternateLinks = alternates
    .map((alternate) => {
      const href = alternate.href ?? alternate.path;
      if (!alternate.hrefLang || !href) {
        throw new Error("Sitemap alternate entries require hrefLang and href/path.");
      }
      return `<xhtml:link rel="alternate" hreflang="${escapeXml(
        alternate.hrefLang
      )}" href="${escapeXml(absoluteFirstPartyUrl(href, origin))}" />`;
    })
    .join("");

  return [
    "<url>",
    `<loc>${escapeXml(absoluteFirstPartyUrl(url, origin))}</loc>`,
    alternateLinks,
    "</url>"
  ].join("");
}

export function generateSitemapXml(entries, { origin = DEFAULT_ORIGIN } = {}) {
  if (!Array.isArray(entries)) throw new Error("Sitemap entries must be an array.");
  const urls = entries.map((entry) => sitemapUrl(entry, { origin })).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    "</urlset>",
    ""
  ].join("\n");
}
