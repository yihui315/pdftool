import { LOCALES, getLocale } from "../config/locales.mjs";
import {
  CORE_ROUTES,
  alternatePaths,
  canonicalPath,
  getRoute
} from "../config/routes.mjs";
import { escapeAttribute, escapeHtml, safeJson } from "../lib/html.mjs";
import { assetUrl } from "../lib/paths.mjs";
import { renderSeoHead } from "../lib/seo.mjs";

const ANALYTICS_ID = "G-3GQPKP7FYH";

function requireLayoutInput({ locale, routeKey, common, page, runtime, fragment }) {
  if (typeof locale !== "string") throw new Error("Layout locale is required");
  if (typeof routeKey !== "string") throw new Error("Layout routeKey is required");
  getLocale(locale);
  getRoute(routeKey);
  if (common === null || typeof common !== "object") {
    throw new Error("Layout common content is required");
  }
  if (common.locale !== locale) {
    throw new Error(
      `Layout common locale mismatch: expected ${locale}, received ${common.locale}`
    );
  }
  if (page === null || typeof page !== "object") {
    throw new Error("Layout page content is required");
  }
  if (runtime === null || typeof runtime !== "object" || Array.isArray(runtime)) {
    throw new Error("Layout runtime content is required");
  }
  if (typeof fragment !== "string") {
    throw new Error("Layout fragment must be rendered HTML");
  }
}

function navigationRoutes(locale) {
  return CORE_ROUTES.filter((route) => route.locales.includes(locale));
}

function renderNavigationLinks({ locale, common, mobile = false }) {
  const className = mobile
    ? "block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    : "rounded-full px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100";
  return navigationRoutes(locale)
    .filter((route) => typeof common.navigation?.[route.key] === "string")
    .map((route) => {
      const href = canonicalPath(locale, route.key);
      return `<a class="${className}" href="${escapeAttribute(
        href
      )}" data-nav-link>${escapeHtml(common.navigation[route.key])}</a>`;
    })
    .join("\n");
}

function renderLanguageMenu({ routeKey, common }) {
  const alternateByLocale = new Map(
    alternatePaths(routeKey).map((alternate) => [alternate.locale, alternate.path])
  );
  const options = LOCALES.filter(({ code }) => alternateByLocale.has(code))
    .map((locale) => {
      const href = alternateByLocale.get(locale.code);
      return [
        '<li>',
        `<a class="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" href="${escapeAttribute(
          href
        )}" lang="${escapeAttribute(locale.hrefLang)}" dir="${escapeAttribute(
          locale.dir
        )}" data-language-option>`,
        escapeHtml(locale.label),
        "</a>",
        "</li>"
      ].join("");
    })
    .join("\n");

  return [
    '<div class="relative" data-language-menu-root>',
    `<button class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" type="button" aria-expanded="false" aria-controls="language-menu" data-language-toggle>${escapeHtml(
      common.languageMenu.label
    )}: <span>${escapeHtml(common.languageMenu.currentLanguage)}</span></button>`,
    '<ul id="language-menu" class="absolute right-0 z-50 mt-2 min-w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft" data-language-menu hidden>',
    options,
    "</ul>",
    "</div>"
  ].join("\n");
}

function renderHead({ locale, routeKey, page, origin, structuredData }) {
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>',
    '<link rel="preconnect" href="https://www.google-analytics.com" crossorigin>',
    '<link rel="dns-prefetch" href="https://www.googletagmanager.com">',
    '<link rel="dns-prefetch" href="https://www.google-analytics.com">',
    `<link rel="icon" href="${assetUrl(
      "assets/favicon.svg"
    )}" type="image/svg+xml">`,
    `<link rel="stylesheet" href="${assetUrl("assets/css/tailwind.min.css")}">`,
    `<link rel="stylesheet" href="${assetUrl("assets/css/styles.css")}">`,
    renderSeoHead({ locale, routeKey, page, origin, structuredData }),
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttribute(
      ANALYTICS_ID
    )}"></script>`,
    "<script>",
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js', new Date());",
    `gtag('config', '${ANALYTICS_ID}');`,
    "</script>",
  ].join("\n");
}

function renderComplianceLinks(locale) {
  if (locale !== "zh-CN") return "";
  return [
    '<a class="hover:text-red-700" href="/terms.html">服务条款</a>',
    '<a class="hover:text-red-700" href="/contact.html">联系我们</a>'
  ].join("\n");
}

function renderConsentBanner({ common }) {
  const c = common.consent;
  if (!c) return "";
  return [
    '<div id="cmp-consent-banner" class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-lg" role="dialog" aria-labelledby="consent-title" aria-modal="false">',
    '<div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">',
    `<p class="text-sm text-slate-600" id="consent-title">${escapeHtml(c.message)}</p>`,
    '<div class="flex shrink-0 flex-wrap gap-2">',
    `<button class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" type="button" id="cmp-accept-all">${escapeHtml(c.acceptAll)}</button>`,
    `<button class="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="button" id="cmp-reject-all">${escapeHtml(c.rejectAll)}</button>`,
    '</div>',
    '</div>',
    '</div>'
  ].join("\n");
}

function renderFooter({ locale, common }) {
  return [
    '<footer class="border-t border-slate-200 bg-white">',
    '<div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">',
    `<p>${escapeHtml(common.footer.tagline)}</p>`,
    '<div class="flex flex-wrap items-center gap-4">',
    `<p>${escapeHtml(common.footer.copyright)} <span data-current-year></span></p>`,
    `<a class="hover:text-red-700" href="${escapeAttribute(
      canonicalPath(locale, "privacy")
    )}">${escapeHtml(common.footer.privacy)}</a>`,
    renderComplianceLinks(locale),
    "</div>",
    "</div>",
    "</footer>"
  ].join("\n");
}

function renderRuntimePayload({ locale, runtime }) {
  return `<script id="runtime-i18n" type="application/json">${safeJson({
    locale,
    messages: runtime
  })}</script>`;
}

function renderScripts(routeKey, { locale, runtime }) {
  const route = getRoute(routeKey);
  return [
    renderRuntimePayload({ locale, runtime }),
    `<script src="${assetUrl("assets/js/site.js")}" defer></script>`,
    `<script src="${assetUrl("assets/js/i18n.js")}" defer></script>`,
    ...route.scripts.map((script) => {
      const type = script.type === "module" ? ' type="module"' : "";
      return `<script src="${assetUrl(script.src)}"${type} defer></script>`;
    })
  ].join("\n");
}

export function renderLayout({
  locale,
  routeKey,
  common,
  page,
  runtime,
  fragment,
  origin,
  structuredData
}) {
  requireLayoutInput({ locale, routeKey, common, page, runtime, fragment });
  const localeConfig = getLocale(locale);
  const desktopNavigation = renderNavigationLinks({ locale, common });
  const mobileNavigation = renderNavigationLinks({ locale, common, mobile: true });

  return [
    "<!doctype html>",
    `<html lang="${escapeAttribute(localeConfig.hrefLang)}" dir="${escapeAttribute(
      localeConfig.dir
    )}">`,
    "<head>",
    renderHead({ locale, routeKey, page, origin, structuredData }),
    "</head>",
    '<body class="bg-[#f8f3ea] text-slate-950 antialiased">',
    '<!-- Static HTML cookie consent banner (visible in source code) -->',
    `<div id="cookie-consent-banner" role="dialog" aria-modal="true" aria-label="Cookie Consent" data-consent-banner>
  <div class="cookie-consent-inner">
    <p class="cookie-consent-text">${escapeHtml(common.consent.text)} <a href="${escapeHtml(canonicalPath(locale, 'privacy'))}" target="_blank" class="cookie-consent-link">${escapeHtml(common.consent.learnMore)}</a></p>
    <div class="cookie-consent-buttons">
      <button class="cookie-btn cookie-btn-accept" data-consent="accept" data-consent-accept>${escapeHtml(common.consent.accept)}</button>
      <button class="cookie-btn cookie-btn-reject" data-consent="reject" data-consent-reject>${escapeHtml(common.consent.reject)}</button>
    </div>
  </div>
</div>`,
    `<a class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-slate-950" href="#main-content">${escapeHtml(
      common.accessibility.skipToContent
    )}</a>`,
    '<header class="sticky top-0 z-50 border-b border-slate-200 bg-[#f8f3ea]/95 backdrop-blur">',
    '<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">',
    `<a class="text-lg font-extrabold tracking-tight text-slate-950" href="${escapeAttribute(
      canonicalPath(locale, "home")
    )}">PDFTool.work</a>`,
    `<nav class="hidden flex-wrap items-center gap-1 lg:flex" aria-label="${escapeAttribute(
      common.accessibility.primaryNavigation
    )}" data-primary-navigation>${desktopNavigation}</nav>`,
    '<div class="flex items-center gap-2">',
    renderLanguageMenu({ routeKey, common }),
    `<button class="inline-flex rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 lg:hidden" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle><span class="menu-open">${escapeHtml(
      common.accessibility.openMenu
    )}</span><span class="menu-close hidden">${escapeHtml(
      common.accessibility.closeMenu
    )}</span></button>`,
    "</div>",
    "</div>",
    `<nav id="mobile-menu" class="hidden border-t border-slate-200 bg-white px-4 py-3 lg:hidden" aria-label="${escapeAttribute(
      common.accessibility.mobileNavigation
    )}" data-mobile-menu>${mobileNavigation}</nav>`,
    "</header>",
    '<main id="main-content" tabindex="-1">',
    fragment,
    "</main>",
    renderFooter({ locale, common }),
    renderConsentBanner({ common }),
    renderScripts(routeKey, { locale, runtime }),
    "</body>",
    "</html>"
  ].join("\n");
}
