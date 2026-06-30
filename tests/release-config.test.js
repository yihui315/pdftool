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
  });

  it("declares production MIME handling for every PDF.js support type", async () => {
    const nginx = await source("deploy/nginx/pdftool.work");
    expect(nginx).toMatch(/\.mjs\$[\s\S]*application\/javascript/);
    expect(nginx).toMatch(/\.wasm\$[\s\S]*application\/wasm/);
    expect(nginx).toMatch(/\.bcmap\$[\s\S]*application\/octet-stream/);
    expect(nginx).toMatch(/ttf\|pfb[\s\S]*font\/ttf/);
    expect(nginx).toMatch(/\.icc\$[\s\S]*application\/vnd\.iccprofile/);
  });

  it("installs release browsers and runs build before separate test gates in CI", async () => {
    const workflow = await source(".github/workflows/test.yml");
    expect(workflow).toContain("playwright install --with-deps chromium msedge");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run test:unit");
    expect(workflow).toContain("npm run test:browser");
  });
});
