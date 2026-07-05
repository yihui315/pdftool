import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import {
  alternateLinkEntries,
  canonicalUrl,
  renderAlternateLinks,
  renderCanonicalLink,
  xDefaultUrl
} from "../site/lib/seo.mjs";

describe("SEO canonical and alternate helpers", () => {
  test("renders one self canonical and reciprocal homepage alternates", () => {
    const head = new JSDOM(
      `<head>${renderCanonicalLink("en", "home")}${renderAlternateLinks("home")}</head>`
    ).window.document;

    expect(head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head.querySelector('link[rel="canonical"]').getAttribute("href")).toBe(
      "https://pdftool.work/en/"
    );

    const alternates = [...head.querySelectorAll('link[rel="alternate"]')];
    expect(alternates).toHaveLength(7);
    expect(alternates.map((link) => link.getAttribute("hreflang"))).toEqual([
      "zh-CN",
      "en",
      "es",
      "pt-BR",
      "ja",
      "id",
      "x-default"
    ]);
    expect(
      new URL(alternates.at(-1).getAttribute("href")).pathname
    ).toBe("/en/");
  });

  test("builds English x-default URLs for non-home routes", () => {
    expect(canonicalUrl("en", "compress")).toBe(
      "https://pdftool.work/en/compress-pdf.html"
    );
    expect(new URL(xDefaultUrl("compress")).pathname).toBe("/en/compress-pdf.html");
    expect(alternateLinkEntries("compress")).toHaveLength(7);
  });
});
