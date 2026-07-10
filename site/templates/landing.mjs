import { canonicalPath } from "../config/routes.mjs";
import { getLocale } from "../config/locales.mjs";
import { escapeAttribute, escapeHtml } from "../lib/html.mjs";

const PRIMARY_TOOL_ROUTES = new Set(["compress", "uploadReady"]);

function requireString(strings, key) {
  const value = strings[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Landing page string is required: ${key}`);
  }
  return value;
}

function toolHref(locale, routeKey) {
  if (!PRIMARY_TOOL_ROUTES.has(routeKey)) {
    throw new Error(`Unsupported landing primary tool route: ${routeKey}`);
  }
  return canonicalPath(locale, routeKey);
}

function faqEntries(page) {
  const { strings } = page;
  return [
    {
      question: requireString(strings, "faqOneQuestion"),
      answer: requireString(strings, "faqOneAnswer")
    },
    {
      question: requireString(strings, "faqTwoQuestion"),
      answer: requireString(strings, "faqTwoAnswer")
    },
    {
      question: requireString(strings, "faqThreeQuestion"),
      answer: requireString(strings, "faqThreeAnswer")
    }
  ];
}

function renderCard(title, text) {
  return [
    '<article class="editorial-paper-card">',
    `<h3>${escapeHtml(title)}</h3>`,
    `<p>${escapeHtml(text)}</p>`,
    "</article>"
  ].join("\n");
}

function renderRelatedTool(locale, routeKey, title, text, action) {
  return [
    `<a class="editorial-tool-card" href="${escapeAttribute(canonicalPath(locale, routeKey))}">`,
    '<span class="editorial-tool-mark" aria-hidden="true"></span>',
    `<h3>${escapeHtml(title)}</h3>`,
    `<p>${escapeHtml(text)}</p>`,
    `<span class="editorial-card-link">${escapeHtml(action)}</span>`,
    "</a>"
  ].join("\n");
}

export function landingStructuredData({ locale, page }) {
  const localeConfig = getLocale(locale);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: localeConfig.hrefLang,
    mainEntity: faqEntries(page).map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  };
}

export function renderLandingPage({ locale, common, page }) {
  const { strings } = page;
  const primaryToolRoute = requireString(strings, "primaryToolRoute");
  const primaryHref = toolHref(locale, primaryToolRoute);
  const faqs = faqEntries(page);

  return [
    '<section class="editorial-hero editorial-hero-compact">',
    '<div class="editorial-container">',
    `<nav class="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600" aria-label="${escapeAttribute(
      requireString(strings, "breadcrumbLabel")
    )}">`,
    `<a class="hover:text-red-700" href="${escapeAttribute(
      canonicalPath(locale, "home")
    )}">${escapeHtml(common.navigation.home)}</a>`,
    '<span aria-hidden="true">/</span>',
    `<span aria-current="page">${escapeHtml(
      requireString(strings, "breadcrumbCurrent")
    )}</span>`,
    "</nav>",
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "heroEyebrow"))}</p>`,
    `<h1 class="editorial-title">${escapeHtml(page.h1)}</h1>`,
    `<p class="editorial-lead">${escapeHtml(page.lead)}</p>`,
    "</div>",
    "</section>",

    '<section class="editorial-section pt-0" data-landing-section="cta">',
    '<div class="editorial-container editorial-two-column">',
    "<div>",
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "ctaEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "ctaTitle"))}</h2>`,
    `<p>${escapeHtml(requireString(strings, "ctaText"))}</p>`,
    "</div>",
    '<div class="editorial-paper-card">',
    `<h3>${escapeHtml(requireString(strings, "toolCardTitle"))}</h3>`,
    `<p>${escapeHtml(requireString(strings, "toolCardText"))}</p>`,
    `<a class="inline-flex rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-red-800" href="${escapeAttribute(
      primaryHref
    )}" data-landing-primary-cta>${escapeHtml(requireString(strings, "primaryCta"))}</a>`,
    "</div>",
    "</div>",
    "</section>",

    '<section class="editorial-section editorial-section-muted" data-landing-section="steps">',
    '<div class="editorial-container">',
    '<div class="editorial-section-heading">',
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "stepsEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "stepsTitle"))}</h2>`,
    `<p>${escapeHtml(requireString(strings, "stepsLead"))}</p>`,
    "</div>",
    '<div class="editorial-card-grid">',
    renderCard(requireString(strings, "stepOneTitle"), requireString(strings, "stepOneText")),
    renderCard(requireString(strings, "stepTwoTitle"), requireString(strings, "stepTwoText")),
    renderCard(requireString(strings, "stepThreeTitle"), requireString(strings, "stepThreeText")),
    "</div>",
    "</div>",
    "</section>",

    '<section class="editorial-section" data-landing-section="limitations">',
    '<div class="editorial-container editorial-two-column">',
    "<div>",
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "limitationsEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "limitationsTitle"))}</h2>`,
    `<p>${escapeHtml(requireString(strings, "limitationsText"))}</p>`,
    "</div>",
    '<ul class="editorial-stack">',
    `<li class="editorial-paper-card">${escapeHtml(requireString(strings, "limitationsItemOne"))}</li>`,
    `<li class="editorial-paper-card">${escapeHtml(requireString(strings, "limitationsItemTwo"))}</li>`,
    `<li class="editorial-paper-card">${escapeHtml(requireString(strings, "limitationsItemThree"))}</li>`,
    "</ul>",
    "</div>",
    "</section>",

    '<section class="editorial-section editorial-section-muted" data-landing-section="privacy">',
    '<div class="editorial-container editorial-two-column">',
    "<div>",
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "privacyEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "privacyTitle"))}</h2>`,
    `<p>${escapeHtml(requireString(strings, "privacyText"))}</p>`,
    "</div>",
    '<div class="editorial-stack">',
    renderCard(requireString(strings, "privacyItemOneTitle"), requireString(strings, "privacyItemOneText")),
    renderCard(requireString(strings, "privacyItemTwoTitle"), requireString(strings, "privacyItemTwoText")),
    "</div>",
    "</div>",
    "</section>",

    '<section class="editorial-section" data-landing-section="related">',
    '<div class="editorial-container">',
    '<div class="editorial-section-heading">',
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "relatedEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "relatedTitle"))}</h2>`,
    `<p>${escapeHtml(requireString(strings, "relatedLead"))}</p>`,
    "</div>",
    '<div class="editorial-card-grid editorial-card-grid-wide">',
    renderRelatedTool(locale, "compress", requireString(strings, "relatedCompressTitle"), requireString(strings, "relatedCompressText"), requireString(strings, "relatedAction")),
    renderRelatedTool(locale, "uploadReady", requireString(strings, "relatedUploadTitle"), requireString(strings, "relatedUploadText"), requireString(strings, "relatedAction")),
    renderRelatedTool(locale, "manage", requireString(strings, "relatedManageTitle"), requireString(strings, "relatedManageText"), requireString(strings, "relatedAction")),
    "</div>",
    "</div>",
    "</section>",

    '<section class="editorial-section editorial-section-muted" data-landing-section="faq">',
    '<div class="editorial-container">',
    '<div class="editorial-section-heading">',
    `<p class="editorial-kicker">${escapeHtml(requireString(strings, "faqEyebrow"))}</p>`,
    `<h2>${escapeHtml(requireString(strings, "faqTitle"))}</h2>`,
    "</div>",
    '<div class="editorial-stack">',
    ...faqs.map(({ question, answer }) =>
      [
        '<article class="editorial-paper-card">',
        `<h3 data-landing-faq-question>${escapeHtml(question)}</h3>`,
        `<p>${escapeHtml(answer)}</p>`,
        "</article>"
      ].join("\n")
    ),
    "</div>",
    "</div>",
    "</section>"
  ].join("\n");
}
