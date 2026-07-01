import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("release configuration", () => {
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
  it("uses system Chrome locally while CI keeps the installed Chromium runtime", async () => {
    const config = await source("playwright.config.js");
    expect(config).toContain('process.env.CI && process.env.PLAYWRIGHT_USE_SYSTEM_CHROME !== "1"');
    expect(config).toContain('{ channel: "chrome" }');
  });

  it("keeps production AdSense identifiers consistent across every public page", async () => {
    const pages = ["index.html", "upload-ready.html", "merge.html", "split.html", "manage.html", "compress.html", "about.html", "privacy.html"];
    for (const page of pages) {
      const html = await source(page);
      expect(html, page).toContain("ca-pub-2913395948188969");
      expect(html, page).not.toContain("ca-pub-XXXXXXXXXXXXXXXX");
      expect(html, page).toContain('data-ad-slot="6363231932"');
    }
    expect(await source("ads.txt")).toContain("google.com, pub-2913395948188969, DIRECT");
  });

});
