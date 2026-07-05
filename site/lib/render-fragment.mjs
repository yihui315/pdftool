import { JSDOM } from "jsdom";
import { escapeAttribute, escapeHtml } from "./html.mjs";

const BLOCKED_FRAGMENT_ELEMENTS = new Set([
  "base",
  "embed",
  "iframe",
  "link",
  "meta",
  "object",
  "script"
]);

const SAFE_LOCALIZED_ATTRIBUTE = /^(?:aria-[a-z0-9_-]+|alt|title|placeholder|data-[a-z0-9_-]+)$/i;

function requireStringDictionary(strings) {
  if (strings === null || typeof strings !== "object" || Array.isArray(strings)) {
    throw new Error("Fragment translations must be a string dictionary");
  }
  return strings;
}

function translationValue(strings, key) {
  if (!Object.hasOwn(strings, key)) {
    throw new Error(`Missing fragment translation: ${key}`);
  }
  const value = strings[key];
  if (typeof value !== "string") {
    throw new Error(`Fragment translation must be a string: ${key}`);
  }
  return value;
}

function assertSafeAttributeName(attributeName) {
  if (!SAFE_LOCALIZED_ATTRIBUTE.test(attributeName)) {
    throw new Error(`Unsupported localized attribute: ${attributeName}`);
  }
}

function assertSafeTemplate(content) {
  for (const element of content.querySelectorAll("*")) {
    if (BLOCKED_FRAGMENT_ELEMENTS.has(element.localName)) {
      throw new Error(`Unsupported fragment element: ${element.localName}`);
    }
    for (const attribute of element.getAttributeNames()) {
      if (/^on/i.test(attribute) || attribute === "srcdoc") {
        throw new Error(`Unsupported fragment attribute: ${attribute}`);
      }
    }
  }
}

function applyLocalizedAttributes(node, strings) {
  const declaration = node.getAttribute("data-i18n-attr");
  if (declaration === null || declaration.trim() === "") return;

  for (const entry of declaration.split(",")) {
    const [rawAttribute, rawKey, ...extra] = entry.split(":");
    const attributeName = rawAttribute?.trim();
    const key = rawKey?.trim();
    if (!attributeName || !key || extra.length > 0) {
      throw new Error(`Malformed data-i18n-attr entry: ${entry.trim()}`);
    }
    assertSafeAttributeName(attributeName);
    node.setAttribute(attributeName, translationValue(strings, key));
  }
}

/**
 * Fill declared text and attribute translation slots in a trusted page fragment.
 * Translation strings are assigned as DOM text/attribute values, never as HTML.
 */
export function renderFragment(fragmentHtml, strings) {
  const translations = requireStringDictionary(strings);
  const dom = new JSDOM(`<template>${fragmentHtml}</template>`);
  const template = dom.window.document.querySelector("template");

  assertSafeTemplate(template.content);

  for (const node of template.content.querySelectorAll("[data-i18n]")) {
    const key = node.dataset.i18n;
    node.textContent = translationValue(translations, key);
  }

  for (const node of template.content.querySelectorAll("[data-i18n-attr]")) {
    applyLocalizedAttributes(node, translations);
  }

  return template.innerHTML;
}

/** Render a safely escaped ordered or unordered list from plain strings. */
export function renderList(items, { ordered = false, className = "" } = {}) {
  if (!Array.isArray(items)) throw new Error("List items must be an array");
  const tagName = ordered ? "ol" : "ul";
  const classAttribute = className
    ? ` class="${escapeAttribute(className)}"`
    : "";
  const children = items
    .map((item) => {
      if (typeof item !== "string") throw new Error("List item must be a string");
      return `<li>${escapeHtml(item)}</li>`;
    })
    .join("");
  return `<${tagName}${classAttribute}>${children}</${tagName}>`;
}

/** Render FAQ disclosure entries from plain question and answer strings. */
export function renderFaqItems(items) {
  if (!Array.isArray(items)) throw new Error("FAQ items must be an array");
  return items
    .map((item) => {
      if (
        item === null ||
        typeof item !== "object" ||
        typeof item.question !== "string" ||
        typeof item.answer !== "string"
      ) {
        throw new Error("FAQ item must contain question and answer strings");
      }
      return [
        '<details class="faq-item">',
        `<summary>${escapeHtml(item.question)}</summary>`,
        `<p>${escapeHtml(item.answer)}</p>`,
        "</details>"
      ].join("");
    })
    .join("");
}
