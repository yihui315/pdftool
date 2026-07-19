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

  it("records a cookie consent decision and removes the generated banner", () => {
    dom = loadPage("index.html", "site.js");
    const { document } = dom.window;
    const banner = document.getElementById("cookie-consent-banner");
    const reject = banner.querySelector('[data-consent="reject"]');

    expect(banner).not.toBeNull();
    reject.click();
    expect(document.getElementById("cookie-consent-banner")).toBeNull();
    expect(document.cookie).toContain("pdft_cookie_consent=reject");
  });

  it("preserves generated language menu hooks without inline option styles", () => {
    dom = loadPage("index.html", "site.js", {
      transformHtml: (html) =>
        html.replace(
          "</body>",
          [
            '<div data-language-menu-root>',
            '<button type="button" aria-expanded="false" aria-controls="test-language-menu" data-language-toggle>Language</button>',
            '<ul id="test-language-menu" data-language-menu hidden>',
            '<li><a href="/" data-language-option>简体中文</a></li>',
            '<li><a href="/en/" data-language-option>English</a></li>',
            "</ul>",
            "</div>",
            "</body>"
          ].join("")
        )
    });
    const { document } = dom.window;
    const toggle = document.querySelector("[data-language-toggle]");
    const menu = document.querySelector("[data-language-menu]");

    expect(menu.hidden).toBe(true);
    expect(document.querySelectorAll("a[data-language-option][style]")).toHaveLength(0);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
