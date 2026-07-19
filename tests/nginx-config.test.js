import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");

function serverBlocks(config) {
  const blocks = [];
  let start = -1;
  let depth = 0;
  for (let index = 0; index < config.length; index += 1) {
    if (start === -1 && config.startsWith("server {", index)) {
      start = index;
    }
    if (start === -1) continue;
    if (config[index] === "{") depth += 1;
    const closesBlock = config[index] === "}";
    if (closesBlock) depth -= 1;
    if (closesBlock && depth === 0) {
      blocks.push(config.slice(start, index + 1));
      start = -1;
    }
  }
  return blocks;
}

describe("production Nginx host routing", () => {
  test("serves the HTTPS apex host without a self-redirect", async () => {
    const config = await readFile(
      path.join(repoRoot, "deploy", "nginx", "pdftool.work"),
      "utf8"
    );

    const blocks = serverBlocks(config);
    const http = blocks.find((block) => /listen\s+80;/u.test(block));
    const www = blocks.find((block) => /server_name\s+www\.pdftool\.work;/u.test(block));
    const apex = blocks.find((block) => /server_name\s+pdftool\.work;/u.test(block));

    expect(blocks).toHaveLength(3);
    expect(config).not.toMatch(/if\s*\(\s*\$host/u);
    expect(http).toMatch(/server_name\s+pdftool\.work\s+www\.pdftool\.work;/u);
    expect(http).toMatch(/return\s+301\s+https:\/\/pdftool\.work\$request_uri;/u);
    expect(www).toMatch(/listen\s+443\s+ssl/u);
    expect(www).toMatch(/return\s+301\s+https:\/\/pdftool\.work\$request_uri;/u);
    expect(apex).toMatch(/listen\s+443\s+ssl/u);
    expect(apex).not.toMatch(/return\s+30[128]/u);
    expect(apex).toMatch(/root\s+\/var\/www\/pdftool\.work\/current;/u);
    expect(apex).toMatch(/try_files\s+\$uri\s+\$uri\/\s+=404;/u);
    for (const tlsBlock of [www, apex]) {
      expect(tlsBlock).toContain(
        "ssl_certificate /etc/letsencrypt/live/pdftool.work/fullchain.pem;"
      );
      expect(tlsBlock).toContain(
        "ssl_certificate_key /etc/letsencrypt/live/pdftool.work/privkey.pem;"
      );
    }
  });
});
