import http from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, test } from "vitest";
import { checkSitemapHttp } from "../scripts/check-sitemap-http.mjs";

const servers = [];

async function startServer(handler) {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  servers.push(server);
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

describe("sitemap HTTP release gate", () => {
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) => new Promise((resolve) => server.close(resolve))
      )
    );
  });

  test("rejects sitemap URLs that redirect instead of returning 200 directly", async () => {
    let origin;
    origin = await startServer((request, response) => {
      if (request.url === "/sitemap.xml") {
        response.setHeader("content-type", "application/xml");
        response.end(
          `<?xml version="1.0"?><urlset><url><loc>${origin}/</loc></url></urlset>`
        );
        return;
      }
      response.writeHead(301, { location: `${origin}/` });
      response.end();
    });

    await expect(checkSitemapHttp(`${origin}/sitemap.xml`)).rejects.toThrow(
      /301.*redirect/i
    );
  });

  test("returns the number of canonical URLs when every response is 200", async () => {
    let origin;
    origin = await startServer((request, response) => {
      if (request.url === "/sitemap.xml") {
        response.setHeader("content-type", "application/xml");
        response.end(
          `<?xml version="1.0"?><urlset><url><loc>${origin}/one</loc></url><url><loc>${origin}/two</loc></url></urlset>`
        );
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end("ok");
    });

    await expect(checkSitemapHttp(`${origin}/sitemap.xml`)).resolves.toEqual({
      sitemapUrl: `${origin}/sitemap.xml`,
      checked: 2
    });
  });

  test("rejects an unavailable sitemap before probing page URLs", async () => {
    const origin = await startServer((_request, response) => {
      response.writeHead(503);
      response.end("unavailable");
    });

    await expect(checkSitemapHttp(`${origin}/sitemap.xml`)).rejects.toThrow(
      /sitemap request failed: 503/i
    );
  });

  test("rejects a sitemap with no canonical locations", async () => {
    const origin = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/xml" });
      response.end("<?xml version=\"1.0\"?><urlset></urlset>");
    });

    await expect(checkSitemapHttp(`${origin}/sitemap.xml`)).rejects.toThrow(
      /contains no <loc>/i
    );
  });

  test("reports non-redirect HTTP failures and network errors", async () => {
    let origin;
    origin = await startServer((request, response) => {
      if (request.url === "/sitemap.xml") {
        response.writeHead(200, { "content-type": "application/xml" });
        response.end(
          `<urlset><url><loc>${origin}/missing</loc></url><url><loc>http://127.0.0.1:1/unreachable</loc></url></urlset>`
        );
        return;
      }
      response.writeHead(404);
      response.end("missing");
    });

    await expect(checkSitemapHttp(`${origin}/sitemap.xml`)).rejects.toThrow(
      /404.*missing[\s\S]*ERROR.*unreachable/i
    );
  });

  test("checks every URL across multiple concurrency batches", async () => {
    let origin;
    let pageRequests = 0;
    origin = await startServer((request, response) => {
      if (request.url === "/sitemap.xml") {
        const urls = Array.from(
          { length: 21 },
          (_, index) => `<url><loc>${origin}/page-${index}</loc></url>`
        ).join("");
        response.writeHead(200, { "content-type": "application/xml" });
        response.end(`<urlset>${urls}</urlset>`);
        return;
      }
      pageRequests += 1;
      response.writeHead(200);
      response.end("ok");
    });

    await expect(
      checkSitemapHttp(`${origin}/sitemap.xml`, { concurrency: 4 })
    ).resolves.toMatchObject({ checked: 21 });
    expect(pageRequests).toBe(21);
  });
});
