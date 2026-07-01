import { afterEach, describe, expect, it } from "vitest";
import { loadPage } from "./helpers/page.js";

describe("shared site interactions", () => {
  let dom;

  afterEach(() => dom?.window.close());

  it("keeps navigation and disclosure controls accessible", () => {
    dom = loadPage("index.html", "site.js");
    const { document } = dom.window;
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-mobile-menu]");
    const firstFaq = document.querySelector("[data-faq-button]");

    expect(document.querySelector('a[href="index.html"][aria-current="page"]')).not.toBeNull();

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(menu.classList.contains("hidden")).toBe(false);

    firstFaq.click();
    expect(firstFaq.getAttribute("aria-expanded")).toBe("false");
    expect(firstFaq.closest(".faq-item").classList.contains("is-open")).toBe(false);
  });

  it("hides placeholder advertising containers", () => {
    dom = loadPage("index.html", "site.js", {
      transformHtml: (html) =>
        html.replaceAll(/ca-pub-\d+/g, "ca-pub-XXXXXXXXXXXXXXXX")
    });
    const placeholders = dom.window.document.querySelectorAll(
      '.adsbygoogle[data-ad-client*="XXXXXXXXXXXXXXXX"]'
    );

    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((slot) => {
      expect(slot.closest("[data-ad-container]").classList.contains("hidden")).toBe(true);
    });
  });

  it("keeps configured advertising containers available", () => {
    dom = loadPage("index.html", "site.js");
    const configured = dom.window.document.querySelectorAll(
      '.adsbygoogle:not([data-ad-client*="XXXXXXXXXXXXXXXX"])'
    );

    expect(configured.length).toBeGreaterThan(0);
    configured.forEach((slot) => {
      expect(slot.closest("[data-ad-container]").classList.contains("hidden")).toBe(false);
    });
  });
});
