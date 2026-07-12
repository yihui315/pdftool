import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const PUBLIC_PAGES = [
  "index.html", "upload-ready.html", "merge.html", "split.html", "manage.html", "compress.html",
  "pdf-to-jpg.html", "jpg-to-pdf.html", "pdf-rotate.html", "pdf-unlock.html", "about.html", "privacy.html",
  "blog-merge-pdf.html", "blog-pdf-tips.html", "blog-jpg-to-pdf.html"
];

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("release configuration", () => {
  it("deploys only the verified immutable dist artifact", async () => {
    const powershell = await source("deploy/deploy.ps1");
    const bash = await source("deploy/deploy.sh");

    for (const deploy of [powershell, bash]) {
      expect(deploy).toContain("dist/release-manifest.json");
      expect(deploy).toContain("npm run verify:release");
      expect(deploy).toContain(".release-commit");
      expect(deploy).toContain("previousRelease");
      expect(deploy).not.toContain("git add .");
      expect(deploy).not.toContain("git push origin main");
    }

    expect(powershell).toContain('tar -C "dist" -cf');
    expect(powershell).not.toContain("$deployFiles");
    expect(bash).toContain("tar -C dist -cf - .");
    expect(bash).not.toContain("find . -maxdepth 1 -name '*.html'");
  });
  it("blocks deployment on build and browser gates unless an explicit emergency switch is used", async () => {
    const deploy = await source("deploy/deploy.ps1");
    expect(deploy).toContain("[switch]$EmergencySkipTests");
    expect(deploy).toContain("npm run test:unit");
    expect(deploy).toContain("npm run test:browser");
    expect(deploy.indexOf("npm run test:browser")).toBeLessThan(deploy.indexOf("& scp"));
    expect(deploy).toContain("upload-ready.html");
    expect(deploy).toContain("previousRelease");
    expect(deploy).toContain("Post-deploy smoke checks failed");
    expect(deploy).toContain("find '$remoteRelease' -type d -exec chmod 755 {} \\;");
    expect(deploy).toContain("find '$remoteRelease' -type f -exec chmod 644 {} \\;");
  });

  it("declares production MIME handling for every PDF.js support type", async () => {
    const nginx = await source("deploy/nginx/pdftool.work");
    expect(nginx.match(/{/g)).toHaveLength(nginx.match(/}/g).length);
    expect(nginx).toMatch(/location ~\* \\\.mjs\$ \{[^}]*application\/javascript;[^}]*}/);
    expect(nginx).toMatch(/location ~\* \\\.wasm\$ \{[^}]*application\/wasm;[^}]*}/);
    expect(nginx).toMatch(/location ~\* \\\.bcmap\$ \{[^}]*application\/octet-stream;[^}]*}/);
    expect(nginx).toMatch(/location ~\* \\\.\(\?:ttf\|pfb\)\$ \{[^}]*font\/ttf;[^}]*}/);
    expect(nginx).toMatch(/location ~\* \\\.icc\$ \{[^}]*application\/vnd\.iccprofile;[^}]*}/);
  });

  it("installs release browsers and runs build before separate test gates in CI", async () => {
    const workflow = await source(".github/workflows/test.yml");
    expect(workflow).toContain("playwright install --with-deps chromium msedge");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run test:unit");
    expect(workflow).toContain("npm run test:browser");
  });
  it("makes npm test self-contained by building the browser release first", async () => {
    const packageJson = JSON.parse(await source("package.json"));
    const testScript = packageJson.scripts.test;

    expect(testScript).toContain("npm run build");
    expect(testScript.indexOf("npm run build")).toBeLessThan(
      testScript.indexOf("npm run test:unit")
    );
    expect(testScript.indexOf("npm run test:unit")).toBeLessThan(
      testScript.indexOf("npm run test:browser")
    );
  });
  it("uses system Chrome locally while CI keeps the installed Chromium runtime", async () => {
    const config = await source("playwright.config.js");
    expect(config).toContain('process.env.CI && process.env.PLAYWRIGHT_USE_SYSTEM_CHROME !== "1"');
    expect(config).toContain('{ channel: "chrome" }');
  });

  it("keeps production AdSense identifiers consistent across every public page", async () => {
    for (const page of PUBLIC_PAGES) {
      const html = await source(page);
      expect(html, page).toContain("ca-pub-2913395948188969");
      expect(html, page).not.toContain("ca-pub-XXXXXXXXXXXXXXXX");
      expect(html, page).toContain('data-ad-slot="6363231932"');
    }
    expect(await source("ads.txt")).toContain("google.com, pub-2913395948188969, DIRECT");
  });

  it("keeps navigation targets unique within each public-page navigation area", async () => {
    const areas = ["header nav [data-nav-link]", "[data-mobile-menu] [data-nav-link]", "footer .footer-link"];
    for (const page of PUBLIC_PAGES) {
      const dom = new JSDOM(await source(page));
      for (const selector of areas) {
        const targets = [...dom.window.document.querySelectorAll(selector)].map((link) => link.getAttribute("href"));
        expect(targets.length, `${page}: ${selector}`).toBeGreaterThan(0);
        expect(new Set(targets).size, `${page}: ${selector}`).toBe(targets.length);
      }
      dom.window.close();
    }
  });

});
