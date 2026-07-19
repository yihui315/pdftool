import { pathToFileURL } from "node:url";

const DEFAULT_SITEMAP_URL = "https://pdftool.work/sitemap.xml";

function sitemapLocations(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)].map(
    (match) => match[1]
  );
}

async function fetchWithoutRedirect(fetchImpl, url) {
  return fetchImpl(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(20_000)
  });
}

export async function checkSitemapHttp(
  sitemapUrl = DEFAULT_SITEMAP_URL,
  { fetchImpl = fetch, concurrency = 16 } = {}
) {
  const sitemapResponse = await fetchWithoutRedirect(fetchImpl, sitemapUrl);
  if (sitemapResponse.status !== 200) {
    throw new Error(
      `Sitemap request failed: ${sitemapResponse.status} ${sitemapUrl}`
    );
  }

  const locations = sitemapLocations(await sitemapResponse.text());
  if (locations.length === 0) {
    throw new Error(`Sitemap contains no <loc> URLs: ${sitemapUrl}`);
  }

  const failures = [];
  for (let index = 0; index < locations.length; index += concurrency) {
    const batch = locations.slice(index, index + concurrency);
    const responses = await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetchWithoutRedirect(fetchImpl, url);
          return { url, status: response.status, location: response.headers.get("location") };
        } catch (error) {
          return { url, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );
    failures.push(...responses.filter(({ status }) => status !== 200));
  }

  if (failures.length > 0) {
    const details = failures
      .map(({ url, status, location, error }) => {
        if (error) return `ERROR ${url}: ${error}`;
        const redirect = location ? ` redirect -> ${location}` : "";
        return `${status} ${url}${redirect}`;
      })
      .join("\n");
    throw new Error(
      `Sitemap HTTP gate failed for ${failures.length}/${locations.length} URLs:\n${details}`
    );
  }

  return Object.freeze({ sitemapUrl, checked: locations.length });
}

async function main() {
  const sitemapUrl = process.argv[2] || process.env.SITEMAP_URL || DEFAULT_SITEMAP_URL;
  const result = await checkSitemapHttp(sitemapUrl);
  console.log(`Sitemap HTTP gate passed: ${result.checked} URLs returned 200.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
