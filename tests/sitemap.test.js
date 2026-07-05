import { describe, expect, test } from "vitest";
import { generateSitemapXml } from "../site/lib/sitemap.mjs";

describe("sitemap XML generation", () => {
  test("renders first-party root-relative URLs", () => {
    expect(generateSitemapXml([{ path: "/en/" }])).toContain(
      "<loc>https://pdftool.work/en/</loc>"
    );
  });

  test("rejects external absolute URL entries", () => {
    expect(() =>
      generateSitemapXml([{ path: "https://evil.example/en/" }])
    ).toThrow(/first-party|root-relative|protocol/i);
    expect(() =>
      generateSitemapXml([
        {
          path: "/en/",
          alternates: [{ hrefLang: "en", href: "https://evil.example/en/" }]
        }
      ])
    ).toThrow(/first-party|root-relative|protocol/i);
  });
});
