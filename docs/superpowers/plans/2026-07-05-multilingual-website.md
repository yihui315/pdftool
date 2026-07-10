# pdftool.work Multilingual Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship pdftool.work as a tested six-locale static PDF tool site with a shared Editorial Utility interface, 98 localized launch routes, correct international SEO, and a reproducible production release.

**Architecture:** Keep PDF processing client-side and add a build-time Node.js site generator. Shared HTML fragments, locale JSON, a route manifest, and a strict validator render immutable files into `dist/`; the same manifest generates alternate links, sitemap entries, and the release file list. Existing PDF algorithms remain shared, while a small runtime dictionary layer localizes dynamic progress and error text.

**Tech Stack:** Node.js 24 ESM, static HTML, Tailwind CSS 3.4, plain CSS/JavaScript, jsdom 29, Vitest 4, Playwright 1.61, pdf-lib 1.17.1, PDF.js 6.1.200, Nginx, PowerShell/Bash deployment scripts.

---

## Delivery milestones

1. **Foundation and green baseline:** fix current CI, extract locale-safe tool scripts, establish route/content contracts, generate Chinese and English core pages into `dist/`.
2. **Six-language product and acquisition content:** add Spanish, Brazilian Portuguese, Japanese, and Indonesian, localize runtime messages, and add 20 reviewed search-intent pages.
3. **SEO, release, and production:** audit legacy pages, generate sitemap/release manifests, harden canonical redirects, run full verification, merge, deploy, and smoke-test.

Stop after each milestone and run the complete test suite. Do not start the next milestone from a red build.

## File responsibility map

### New site-generation files

- `site/config/locales.mjs` — supported locale metadata and lookup helpers.
- `site/config/routes.mjs` — route keys, localized output filenames, scripts, and locale availability.
- `site/config/legacy-pages.json` — explicit retain/noindex classifications for non-core legacy HTML.
- `site/content/<locale>/common.json` — navigation, footer, global trust copy, and shared labels.
- `site/content/<locale>/runtime.json` — dynamic tool, progress, validation, and error messages.
- `site/content/<locale>/pages/<route>.json` — localized SEO fields and text for one public route.
- `site/templates/layout.mjs` — document head, header, language menu, footer, scripts, and shared schema.
- `site/templates/landing.mjs` — the four curated search-intent page layouts.
- `site/templates/pages/*.html` — the 13 shared core-page body fragments with stable `data-i18n` keys.
- `site/lib/html.mjs` — HTML, attribute, and JSON escaping helpers.
- `site/lib/content.mjs` — locale file loading and schema/key validation.
- `site/lib/paths.mjs` — output, canonical, alternate, and root-absolute asset URL helpers.
- `site/lib/render-fragment.mjs` — safe application of locale strings to HTML fragments.
- `site/lib/seo.mjs` — canonical, reciprocal alternate, Open Graph, and JSON-LD rendering.
- `site/lib/sitemap.mjs` — sitemap XML generated from the same route manifest.
- `scripts/build-site.mjs` — clean temporary output, copy static files, render routes, and promote `dist.next` to `dist` only after validation.
- `scripts/audit-legacy-pages.mjs` — report duplicate metadata, word counts, and generated-page families before classification.

### Existing files to modify

- `package.json`, `.gitignore`, `tailwind.config.js`, `playwright.config.js` — build and test `dist/`.
- `scripts/copy-vendor.mjs`, `scripts/verify-release.mjs` — accept an output root and validate manifest-driven releases.
- `assets/css/styles.css`, `src/tailwind.css` — Editorial Utility tokens, responsive header, language menu, and locale-safe typography.
- `assets/js/site.js` — accessible language menu and route-aware active navigation.
- `assets/js/*.js`, `assets/js/*.mjs` — root-absolute assets and localized runtime strings.
- `deploy/deploy.ps1`, `deploy/deploy.sh`, `deploy/preflight.ps1`, `deploy/nginx/pdftool.work` — deploy only tested `dist/` artifacts and enforce the canonical host.
- `.github/workflows/test.yml` — build once, verify generated output, then run unit and browser suites.
- `README.md`, `TESTING.md`, `CHANGELOG.md`, `VERSION` — document and identify the release.

### New tests

- `tests/site-manifest.test.js` — route and locale contract.
- `tests/content-validation.test.js` — required locale data and interpolation token parity.
- `tests/rendering.test.js` — safe fragment rendering and shared layout.
- `tests/runtime-i18n.test.js` — runtime dictionary lookup and complete tool-message coverage.
- `tests/build-output.test.js` — 98 routes, files, sitemap, release manifest, and atomic build behavior.
- `tests/seo-alternates.test.js` — self-canonical and reciprocal alternates.
- `tests/locale-quality.test.js` — locale identity, prohibited claims, and translation smoke assertions.
- `tests/browser/locales.spec.js` — language switching, overflow, keyboard access, and localized assets.
- `tests/browser/localized-tools.spec.js` — representative PDF workflows in all six locales.

## Milestone 1 — Foundation and green baseline

### Task 1: Restore a green responsive-header baseline

**Files:**
- Modify: `tests/browser/release-assets.spec.js:35`
- Modify: `index.html`, `pdf-tools.html`, `upload-ready.html`, `merge.html`, `split.html`, `manage.html`, `compress.html`, `pdf-to-jpg.html`, `jpg-to-pdf.html`, `pdf-rotate.html`, `pdf-unlock.html`, `about.html`, `privacy.html`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Expand the existing overflow regression to all 13 core routes and five viewport widths**

Replace the current route and width arrays with:

```js
const CORE_ROUTES = [
  "/", "/pdf-tools.html", "/upload-ready.html", "/merge.html", "/split.html",
  "/manage.html", "/compress.html", "/pdf-to-jpg.html", "/jpg-to-pdf.html",
  "/pdf-rotate.html", "/pdf-unlock.html", "/about.html", "/privacy.html"
];
const VIEWPORT_WIDTHS = [320, 375, 768, 1024, 1280];
```

Keep the current `documentOverflow`, `navOverflow`, `left`, and `right` assertions and use the new constants in both loops.

- [ ] **Step 2: Run the browser regression and confirm the existing failure**

Run:

```powershell
npm ci --no-audit --no-fund
npx playwright install chromium msedge
npm run build
npx playwright test tests/browser/release-assets.spec.js --project=chromium
```

Expected: FAIL at `1280px /` because the `xl:flex` desktop navigation and duplicated language links exceed the viewport.

- [ ] **Step 3: Move the full desktop navigation breakpoint from `xl` to `2xl` on every core source page**

On the 13 files listed above, make these exact class changes:

```text
hidden ... xl:flex  -> hidden ... 2xl:flex
xl:hidden           -> 2xl:hidden
```

Remove standalone inline-styled `EN`, `EN 中文`, or `中文 EN` anchors from the brand row and desktop link list. Retain one ordinary English link in the mobile menu until the shared language menu replaces it in Task 5.

- [ ] **Step 4: Include locale sources in Tailwind scanning**

Set `tailwind.config.js` content to:

```js
content: [
  "./*.html",
  "./en/**/*.html",
  "./site/**/*.{html,mjs,json}",
  "./assets/js/**/*.{js,mjs}"
],
```

- [ ] **Step 5: Rebuild and rerun the regression**

Run:

```powershell
npm run build
npx playwright test tests/browser/release-assets.spec.js --project=chromium
```

Expected: PASS for all 65 route/width combinations.

- [ ] **Step 6: Commit the baseline repair**

```powershell
git add tests/browser/release-assets.spec.js tailwind.config.js index.html pdf-tools.html upload-ready.html merge.html split.html manage.html compress.html pdf-to-jpg.html jpg-to-pdf.html pdf-rotate.html pdf-unlock.html about.html privacy.html assets/css/tailwind.min.css
git commit -m "fix: keep core navigation within responsive viewports"
```

### Task 2: Extract inline tool logic and make assets locale-safe

**Files:**
- Create: `assets/js/pdf-to-jpg.js`
- Create: `assets/js/jpg-to-pdf.js`
- Create: `assets/js/pdf-rotate.js`
- Modify: `pdf-to-jpg.html:367`
- Modify: `jpg-to-pdf.html:351`
- Modify: `pdf-rotate.html:345`
- Modify: `assets/js/upload-ready.js:231`
- Modify: `tests/browser/pdf-to-jpg.spec.js`
- Modify: `tests/browser/upload-ready.spec.js`
- Create: `tests/browser/locale-assets.spec.js`

- [ ] **Step 1: Add a failing nested-locale asset test**

Create `tests/browser/locale-assets.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("tool scripts use root-absolute first-party runtime URLs", async ({ request }) => {
  for (const path of [
    "/assets/js/pdf-to-jpg.js",
    "/assets/js/jpg-to-pdf.js",
    "/assets/js/pdf-rotate.js",
    "/assets/js/upload-ready-worker.mjs"
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
```

- [ ] **Step 2: Run the test and verify the three extracted scripts are missing**

Run:

```powershell
npx playwright test tests/browser/locale-assets.spec.js --project=chromium
```

Expected: FAIL with 404 for `/assets/js/pdf-to-jpg.js`.

- [ ] **Step 3: Move each inline implementation verbatim into its named asset file**

Keep each page's existing behavior and selectors. Replace document-relative module and worker URLs with root-absolute URLs:

```js
await import("/assets/js/pdfjs-polyfills.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/js/pdf-worker-entry.mjs";
```

In `assets/js/upload-ready.js`, replace the worker construction with:

```js
worker = new Worker("/assets/js/upload-ready-worker.mjs", { type: "module" });
```

- [ ] **Step 4: Replace inline blocks with external script tags**

Use:

```html
<script type="module" src="/assets/js/pdf-to-jpg.js"></script>
<script src="/assets/js/jpg-to-pdf.js" defer></script>
<script src="/assets/js/pdf-rotate.js" defer></script>
```

The shared site and vendor scripts also become root-absolute (`/assets/...`) so the same fragments work at every locale depth.

- [ ] **Step 5: Run targeted tool and asset tests**

```powershell
npm run build
npx playwright test tests/browser/locale-assets.spec.js tests/browser/pdf-to-jpg.spec.js tests/browser/upload-ready.spec.js --project=chromium
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add assets/js/pdf-to-jpg.js assets/js/jpg-to-pdf.js assets/js/pdf-rotate.js assets/js/upload-ready.js pdf-to-jpg.html jpg-to-pdf.html pdf-rotate.html tests/browser/locale-assets.spec.js tests/browser/pdf-to-jpg.spec.js tests/browser/upload-ready.spec.js
git commit -m "refactor: make PDF tool assets locale-safe"
```

### Task 3: Define the locale and route contract

**Files:**
- Create: `site/config/locales.mjs`
- Create: `site/config/routes.mjs`
- Create: `tests/site-manifest.test.js`

- [ ] **Step 1: Write the failing manifest tests**

Create tests that assert:

```js
expect(LOCALES.map(({ code }) => code)).toEqual(["zh-CN", "en", "es", "pt-BR", "ja", "id"]);
expect(routesForLocale("zh-CN")).toHaveLength(13);
for (const code of ["en", "es", "pt-BR", "ja", "id"]) {
  expect(routesForLocale(code)).toHaveLength(17);
}
expect(allOutputPaths()).toHaveLength(98);
expect(new Set(allOutputPaths()).size).toBe(98);
expect(canonicalPath("zh-CN", "home")).toBe("/");
expect(canonicalPath("pt-BR", "compress")).toBe("/pt-br/compress-pdf.html");
```

- [ ] **Step 2: Run the tests and verify imports fail**

```powershell
npx vitest run tests/site-manifest.test.js
```

Expected: FAIL because `site/config/locales.mjs` does not exist.

- [ ] **Step 3: Create the complete locale registry**

`site/config/locales.mjs` exports frozen entries with these exact values:

```js
export const LOCALES = Object.freeze([
  { code: "zh-CN", prefix: "", hrefLang: "zh-CN", label: "简体中文", dir: "ltr" },
  { code: "en", prefix: "en", hrefLang: "en", label: "English", dir: "ltr" },
  { code: "es", prefix: "es", hrefLang: "es", label: "Español", dir: "ltr" },
  { code: "pt-BR", prefix: "pt-br", hrefLang: "pt-BR", label: "Português (Brasil)", dir: "ltr" },
  { code: "ja", prefix: "ja", hrefLang: "ja", label: "日本語", dir: "ltr" },
  { code: "id", prefix: "id", hrefLang: "id", label: "Bahasa Indonesia", dir: "ltr" }
]);

export const LOCALE_BY_CODE = new Map(LOCALES.map((locale) => [locale.code, locale]));

export function getLocale(code) {
  const locale = LOCALE_BY_CODE.get(code);
  if (!locale) throw new Error(`Unsupported locale: ${code}`);
  return locale;
}
```

- [ ] **Step 4: Create the complete route registry**

Define 13 `CORE_ROUTES` with keys `home`, `tools`, `uploadReady`, `merge`, `split`, `manage`, `compress`, `pdfToJpg`, `jpgToPdf`, `rotate`, `unlock`, `about`, and `privacy`. Each entry contains a Chinese filename, a non-Chinese filename, a fragment filename, and its script list.

Define four `LANDING_ROUTES` with keys and files:

```js
[
  ["compress1mb", "compress-pdf-to-1mb.html"],
  ["compress500kb", "compress-pdf-to-500kb.html"],
  ["compressReadable", "compress-pdf-without-quality-loss.html"],
  ["tooLargeToUpload", "pdf-too-large-to-upload.html"]
]
```

Landing routes support `en`, `es`, `pt-BR`, `ja`, and `id`; core routes support all locales. Export `routesForLocale`, `outputPath`, `canonicalPath`, `alternatePaths`, and `allOutputPaths`. Use `index.html` as the output file but `/` or `/<prefix>/` as the homepage canonical.

- [ ] **Step 5: Run and pass the tests**

```powershell
npx vitest run tests/site-manifest.test.js
```

Expected: 6 locale assertions, 98 unique paths, and canonical-path assertions pass.

- [ ] **Step 6: Commit**

```powershell
git add site/config/locales.mjs site/config/routes.mjs tests/site-manifest.test.js
git commit -m "feat: define multilingual route manifest"
```

### Task 4: Add strict locale content loading and validation

**Files:**
- Create: `site/lib/content.mjs`
- Create: `tests/content-validation.test.js`
- Create: `tests/fixtures/content/valid/common.json`
- Create: `tests/fixtures/content/valid/runtime.json`
- Create: `tests/fixtures/content/valid/pages/home.json`
- Create: `tests/fixtures/content/invalid/pages/home.json`

- [ ] **Step 1: Write failing validation tests**

Cover these behaviors:

```js
await expect(loadLocaleFixture("valid")).resolves.toMatchObject({ locale: "en" });
await expect(loadLocaleFixture("invalid")).rejects.toThrow(/home\.seo\.description/);
expect(interpolationTokens("Reading {filename}: {size}")).toEqual(["filename", "size"]);
expect(() => assertTokenParity("{filename}", "{file}", "runtime.reading")).toThrow(/token mismatch/);
```

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/content-validation.test.js
```

Expected: FAIL because the loader is missing.

- [ ] **Step 3: Implement JSON loading with explicit required fields**

`site/lib/content.mjs` must:

- parse UTF-8 JSON with the filename included in parse errors;
- require `common.locale`, navigation labels, footer labels, and language-menu labels;
- require `runtime` to be a flat object of non-empty strings;
- require each page to contain `seo.title`, `seo.description`, `h1`, `lead`, and `strings`;
- compare interpolation tokens against the English source for every runtime key;
- reject unknown route keys and empty strings;
- return immutable objects to prevent render-time mutation.

Use a single helper for nested field errors:

```js
function requireString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing non-empty translation: ${path}`);
  }
  return value;
}
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run tests/content-validation.test.js
```

Expected: PASS, including the named missing-field and token-mismatch errors.

- [ ] **Step 5: Commit**

```powershell
git add site/lib/content.mjs tests/content-validation.test.js tests/fixtures/content
git commit -m "feat: validate multilingual content contracts"
```

### Task 5: Build the safe fragment, SEO, and shared layout renderers

**Files:**
- Create: `site/lib/html.mjs`
- Create: `site/lib/paths.mjs`
- Create: `site/lib/render-fragment.mjs`
- Create: `site/lib/seo.mjs`
- Create: `site/templates/layout.mjs`
- Create: `tests/rendering.test.js`
- Create: `tests/seo-alternates.test.js`

- [ ] **Step 1: Write failing rendering tests**

Test that:

```js
expect(escapeHtml(`<script>&"`)).toBe("&lt;script&gt;&amp;&quot;");
expect(assetUrl("assets/js/site.js")).toBe("/assets/js/site.js");
expect(() => renderFragment('<h1 data-i18n="missing"></h1>', {})).toThrow(/missing/);
expect(renderFragment('<h1 data-i18n="title"></h1>', { title: "PDF & files" }))
  .toContain("PDF &amp; files");
```

Render one English page and assert one self-canonical, six reciprocal alternates, one `x-default` pointing to `/en/`, one H1, root-absolute assets, and valid JSON-LD.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/rendering.test.js tests/seo-alternates.test.js
```

Expected: FAIL because render modules are missing.

- [ ] **Step 3: Implement escaping and path helpers**

`html.mjs` exports `escapeHtml`, `escapeAttribute`, and `safeJson`. `safeJson` must replace `<`, `>`, `&`, U+2028, and U+2029 after `JSON.stringify` so JSON-LD cannot end a script element.

`paths.mjs` exports `assetUrl`, `absoluteUrl`, `outputPath`, and canonical helpers backed only by `routes.mjs`.

- [ ] **Step 4: Implement fragment localization**

Use jsdom to fill only declared locations:

```js
for (const node of document.querySelectorAll("[data-i18n]")) {
  const key = node.dataset.i18n;
  if (!(key in strings)) throw new Error(`Missing fragment translation: ${key}`);
  node.textContent = strings[key];
}
```

Support `data-i18n-attr="aria-label:key,title:key"` with escaped attribute assignment. Do not support arbitrary localized HTML. Lists and FAQ entries are rendered by template functions that escape each item.

- [ ] **Step 5: Implement the Editorial Utility layout**

`layout.mjs` renders:

- `<html lang>` and `dir`;
- localized metadata and safe JSON-LD;
- canonical plus reciprocal alternates and `x-default`;
- skip link, compact desktop navigation, mobile menu, and one language-menu button;
- a language list of names without flags;
- root-absolute CSS, favicon, analytics, ad, shared-site, translator, vendor, and route scripts;
- localized footer and privacy links.

Use these language-menu hooks: `data-language-toggle`, `data-language-menu`, `data-language-option`, and `aria-expanded`.

- [ ] **Step 6: Run and pass renderer tests**

```powershell
npx vitest run tests/rendering.test.js tests/seo-alternates.test.js
```

Expected: PASS with six alternates plus `x-default` on a core route.

- [ ] **Step 7: Commit**

```powershell
git add site/lib site/templates/layout.mjs tests/rendering.test.js tests/seo-alternates.test.js
git commit -m "feat: render safe localized page layouts"
```

### Task 6: Create an atomic `dist/` build and manifest-driven verification

**Files:**
- Create: `scripts/build-site.mjs`
- Create: `site/lib/sitemap.mjs`
- Create: `tests/build-output.test.js`
- Modify: `scripts/copy-vendor.mjs`
- Modify: `scripts/verify-release.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Add failing output tests**

The test imports `buildSite` and injects one English homepage route plus fixture content into a temporary directory. It asserts:

```js
expect(manifest.routes).toHaveLength(1);
expect(manifest.files).toContain("en/index.html");
expect(manifest.files).toContain("assets/vendor/pdfjs/pdf.worker.mjs");
expect(sitemapUrls).toHaveLength(1);
```

The manifest contract test from Task 3 remains responsible for the full 98-route count. Also inject an invalid locale fixture and assert that the previous output marker remains unchanged after a failed build.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/build-output.test.js
```

Expected: FAIL because `scripts/build-site.mjs` is missing.

- [ ] **Step 3: Implement the build sequence**

`scripts/build-site.mjs` exports `buildSite({ routes, locales, contentRoot, outDir })` for tests and provides a CLI that uses all production routes/locales by default. It must:

1. remove and recreate `dist.next` inside the repository;
2. copy first-party static assets, `ads.txt`, and generated `robots.txt`;
3. load and validate every supported locale before rendering any route;
4. render all 98 routes into `dist.next`;
5. generate sitemap XML from the injected route alternates;
6. write `release-manifest.json` with sorted paths, byte sizes, SHA-256 hashes, Git commit, and UTC build time;
7. run `verify-release.mjs dist.next`;
8. replace `dist/` only after all previous steps succeed.

Reject any output path that resolves outside the chosen output directory.

- [ ] **Step 4: Make vendor and release scripts output-root aware**

Accept `--out dist.next` in `copy-vendor.mjs`. Accept the release root as the first positional argument in `verify-release.mjs`. Both default to the project root only when no argument is provided, preserving direct developer use.

- [ ] **Step 5: Ignore generated output**

Add `dist/`, `dist.next/`, and `.superpowers/` to `.gitignore`. Do not switch the default build or Playwright server yet; production content is not complete until Task 14.

- [ ] **Step 6: Run fixture-driven build tests**

```powershell
npx vitest run tests/build-output.test.js tests/vendor-assets.test.js tests/release-config.test.js
```

Expected: PASS; the temporary release manifest identifies the current commit and failed fixture builds preserve the prior output marker.

- [ ] **Step 7: Commit**

```powershell
git add scripts/build-site.mjs site/lib/sitemap.mjs scripts/copy-vendor.mjs scripts/verify-release.mjs .gitignore tests/build-output.test.js tests/vendor-assets.test.js tests/release-config.test.js
git commit -m "feat: build immutable multilingual releases"
```

### Task 7: Add the runtime translation layer

**Files:**
- Create: `assets/js/i18n.js`
- Create: `site/config/runtime-keys.mjs`
- Create: `tests/runtime-i18n.test.js`

- [ ] **Step 1: Write translator contract tests**

Test exact interpolation and missing-key behavior:

```js
expect(t("file.reading", { filename: "a.pdf" })).toBe("Reading a.pdf");
expect(() => t("missing.key")).toThrow(/Missing runtime translation/);
```

Use the valid runtime fixture from Task 4 to test interpolation, HTML-safe text insertion, missing keys, missing interpolation values, and locale identity. Assert the runtime key registry is sorted and contains no duplicates. Task 8 creates Chinese and English runtime dictionaries; Tasks 10–13 add the remaining locales, and `content.mjs` requires exact parity with this registry.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/runtime-i18n.test.js
```

Expected: FAIL because `assets/js/i18n.js` and locale runtime files are absent.

- [ ] **Step 3: Implement the browser translator**

`assets/js/i18n.js` reads JSON from `#runtime-i18n`, freezes it, and exposes:

```js
window.PDFToolI18n = Object.freeze({
  locale,
  t(key, values = {}) {
    if (!(key in messages)) throw new Error(`Missing runtime translation: ${key}`);
    return messages[key].replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) => {
      if (!(token in values)) throw new Error(`Missing interpolation value: ${key}.${token}`);
      return String(values[token]);
    });
  }
});
```

Create `site/config/runtime-keys.mjs` as the sorted, frozen list of every key that the shared and tool scripts will use. Update `content.mjs` to reject missing or unknown runtime keys.

- [ ] **Step 4: Run translator tests without changing production tool scripts**

```powershell
npx vitest run tests/runtime-i18n.test.js tests/content-validation.test.js
```

Expected: PASS. Existing root tool scripts remain unchanged and functional until all six runtime dictionaries exist.

- [ ] **Step 5: Commit**

```powershell
git add assets/js/i18n.js site/config/runtime-keys.mjs site/lib/content.mjs tests/runtime-i18n.test.js
git commit -m "feat: define browser runtime translation contract"
```

### Task 8: Migrate the shared informational pages in Chinese and English

**Files:**
- Create: `site/templates/pages/home.html`, `tools.html`, `about.html`, `privacy.html`
- Create: `site/content/zh-CN/common.json`, `runtime.json`, `pages/home.json`, `pages/tools.json`, `pages/about.json`, `pages/privacy.json`
- Create: matching files under `site/content/en/`
- Modify: `assets/css/styles.css`
- Modify: `src/tailwind.css`
- Modify: `tests/site.test.js`
- Modify: `tests/rendering.test.js`

- [ ] **Step 1: Add failing Chinese/English page assertions**

Render the eight routes into a temporary test directory and parse `index.html`, `en/index.html`, `pdf-tools.html`, `en/pdf-tools.html`, `about.html`, `en/about.html`, `privacy.html`, and `en/privacy.html`. Assert localized H1 text, `html[lang]`, one language menu, one canonical, no unsupported English claims, and no inline-styled language anchors.

- [ ] **Step 2: Run and verify missing content failure**

```powershell
npx vitest run tests/rendering.test.js tests/site.test.js
```

Expected: FAIL naming `site/content/zh-CN/common.json`.

- [ ] **Step 3: Extract the four body fragments**

Move each current `<main>` into its named fragment. Remove headers, footers, analytics, ads loader, and global scripts because `layout.mjs` owns them. Add `data-i18n` and `data-i18n-attr` to every user-visible text and accessible label. Preserve semantic headings, ad containers, FAQ hooks, and IDs used by links.

- [ ] **Step 4: Add complete Chinese and English content**

Use the current Chinese pages as the policy and feature source. Rewrite the English copy to remove these unsupported claims:

```text
no file size limits
files of any size
up to 90%
API access
batch processing feature
complete privacy and security
most operations complete in under 10 seconds
```

English must state that practical limits depend on browser memory and PDF structure, and that file contents remain local while normal analytics/advertising requests may occur.

- [ ] **Step 5: Apply Editorial Utility design tokens**

Replace the primary palette with:

```css
:root {
  --paper: #f6f0e4;
  --paper-bright: #fffaf1;
  --ink: #18323a;
  --muted: #637076;
  --line: #d8d0c2;
  --primary: #e5483f;
  --primary-dark: #bd302b;
  --focus: #1f6f78;
}
```

Use an editorial serif stack for headings and a locale-aware sans stack for controls. Implement paper texture with CSS gradients only, respect `prefers-reduced-motion`, retain visible focus, and keep ad slots visually separate from tool actions.

- [ ] **Step 6: Build and test**

```powershell
npx vitest run tests/rendering.test.js tests/site.test.js tests/content-validation.test.js
```

Expected: eight generated routes pass metadata and content tests. Responsive generated-output testing starts in Task 17 after Task 14 switches the production server to `dist/`.

- [ ] **Step 7: Commit**

```powershell
git add site/templates/pages site/content/zh-CN site/content/en assets/css/styles.css src/tailwind.css tests/site.test.js tests/rendering.test.js
git commit -m "feat: launch shared Chinese and English site shell"
```

### Task 9: Migrate all nine PDF tool fragments in Chinese and English

**Files:**
- Create: `site/templates/pages/upload-ready.html`, `merge.html`, `split.html`, `manage.html`, `compress.html`, `pdf-to-jpg.html`, `jpg-to-pdf.html`, `rotate.html`, `unlock.html`
- Create: matching page JSON under `site/content/zh-CN/pages/` and `site/content/en/pages/`
- Modify: `tests/rendering.test.js`

- [ ] **Step 1: Add failing generated-tool tests**

For every Chinese and English tool route, render into a temporary directory and assert the page contains its required script and all required data hooks. Assert English static and runtime text contains no Chinese UI text.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/rendering.test.js tests/runtime-i18n.test.js
```

Expected: FAIL because generated English tool content is incomplete or absent.

- [ ] **Step 3: Extract merge, split, compress, and unlock fragments**

Preserve every existing `data-*` hook. Replace all static labels and accessible names with declared locale keys. Keep vendor and route scripts in the route manifest, not in the fragment.

- [ ] **Step 4: Extract upload-ready and manage fragments**

Preserve the privacy proof marker, canvas, page grid, cancellation, diagnostic, retry, and download hooks exactly. Keep privacy wording consistent with the approved Chinese privacy page.

- [ ] **Step 5: Extract conversion and rotate fragments**

Use only the external scripts created in Task 2. Ensure all module, worker, vendor, and stylesheet paths remain root-absolute.

- [ ] **Step 6: Add complete Chinese and English page JSON**

For each route, include localized SEO, H1, lead, fragment strings, FAQ content, status labels, and download filenames. Keep interpolation tokens identical to the English runtime source.

- [ ] **Step 7: Run milestone 1 verification**

```powershell
npx vitest run tests/rendering.test.js tests/runtime-i18n.test.js tests/content-validation.test.js tests/pdf-tools.test.js tests/upload-ready-state.test.js tests/manage-state.test.js
npm run build
npx playwright test tests/browser/release-assets.spec.js tests/browser/pdf-to-jpg.spec.js tests/browser/upload-ready.spec.js --project=chromium
```

Expected: generated-route unit tests pass, and the still-root-served baseline browser suite remains green. The default build does not switch to generated `dist/` until all locale content exists in Task 14.

- [ ] **Step 8: Commit**

```powershell
git add site/templates/pages site/content/zh-CN site/content/en tests/rendering.test.js
git commit -m "feat: generate bilingual core PDF tools"
```

## Milestone 2 — Six-language product and acquisition content

### Task 10: Add Spanish core content and runtime messages

**Files:**
- Create: `site/content/es/common.json`
- Create: `site/content/es/runtime.json`
- Create: 13 files under `site/content/es/pages/`
- Create: `tests/locale-quality.test.js`

- [ ] **Step 1: Add failing Spanish identity assertions**

Assert `nav.allTools` is `Todas las herramientas`, the privacy H1 is `Privacidad`, the merge CTA is `Combinar PDF`, and the Spanish pages do not equal the English source for H1, lead, FAQ, or runtime values.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/locale-quality.test.js
```

Expected: FAIL because Spanish content is missing.

- [ ] **Step 3: Write Spanish common and runtime content**

Use neutral international Spanish. Use `MB`, `KB`, decimal comma only where `Intl.NumberFormat("es")` produces it, and imperative labels familiar to web-tool users. Keep product name and PDF abbreviations unchanged.

- [ ] **Step 4: Write all 13 Spanish core page files**

Translate meaning, constraints, privacy details, FAQ, accessible labels, and SEO intent. Do not introduce guarantees or features absent from the Chinese/English sources.

- [ ] **Step 5: Build and test Spanish routes**

```powershell
npx vitest run tests/content-validation.test.js tests/locale-quality.test.js tests/rendering.test.js
```

Expected: 13 Spanish core pages render into the temporary test directory with valid metadata and no missing runtime keys.

- [ ] **Step 6: Commit**

```powershell
git add site/content/es tests/locale-quality.test.js
git commit -m "feat: add Spanish PDF tools"
```

### Task 11: Add Brazilian Portuguese core content and runtime messages

**Files:**
- Create: `site/content/pt-BR/common.json`
- Create: `site/content/pt-BR/runtime.json`
- Create: 13 files under `site/content/pt-BR/pages/`
- Modify: `tests/locale-quality.test.js`

- [ ] **Step 1: Add failing locale assertions**

Assert `nav.allTools` is `Todas as ferramentas`, privacy is `Privacidade`, merge is `Juntar PDFs`, and the canonical prefix is `/pt-br/` while `hreflang` remains `pt-BR`.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/locale-quality.test.js tests/seo-alternates.test.js
```

Expected: FAIL because Portuguese content is missing.

- [ ] **Step 3: Write common, runtime, and 13 core page files**

Use Brazilian Portuguese conventions and natural search terms such as `comprimir PDF`, `juntar PDF`, and `dividir PDF`. Keep the same feature boundaries and interpolation tokens as English.

- [ ] **Step 4: Build and test**

```powershell
npx vitest run tests/content-validation.test.js tests/locale-quality.test.js tests/seo-alternates.test.js tests/rendering.test.js
```

Expected: PASS for 13 rendered Portuguese core pages and reciprocal `pt-BR` alternates.

- [ ] **Step 5: Commit**

```powershell
git add site/content/pt-BR tests/locale-quality.test.js
git commit -m "feat: add Brazilian Portuguese PDF tools"
```

### Task 12: Add Japanese core content and runtime messages

**Files:**
- Create: `site/content/ja/common.json`
- Create: `site/content/ja/runtime.json`
- Create: 13 files under `site/content/ja/pages/`
- Modify: `tests/locale-quality.test.js`

- [ ] **Step 1: Add failing Japanese assertions**

Assert `nav.allTools` is `すべてのツール`, privacy is `プライバシー`, merge is `PDFを結合`, document language is `ja`, and layout remains left-to-right.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/locale-quality.test.js
```

Expected: FAIL because Japanese content is missing.

- [ ] **Step 3: Write common, runtime, and 13 core page files**

Use concise Japanese UI labels, full-width Japanese punctuation in prose, ASCII file-size units, and polite but direct help text. Preserve Latin interpolation tokens exactly.

- [ ] **Step 4: Add a Japanese content-shape check**

In `tests/locale-quality.test.js`, assert Japanese button labels are non-empty, do not equal English values, and contain no unexpected interpolation tokens. Browser wrapping coverage is added in Task 17 after Task 14 switches the production server to `dist/`.

- [ ] **Step 5: Render and test**

```powershell
npx vitest run tests/content-validation.test.js tests/locale-quality.test.js tests/rendering.test.js
```

Expected: PASS for all 13 rendered Japanese core pages and runtime key checks.

- [ ] **Step 6: Commit**

```powershell
git add site/content/ja tests/locale-quality.test.js
git commit -m "feat: add Japanese PDF tools"
```

### Task 13: Add Indonesian core content and runtime messages

**Files:**
- Create: `site/content/id/common.json`
- Create: `site/content/id/runtime.json`
- Create: 13 files under `site/content/id/pages/`
- Modify: `tests/locale-quality.test.js`

- [ ] **Step 1: Add failing Indonesian assertions**

Assert `nav.allTools` is `Semua alat`, privacy is `Privasi`, merge is `Gabungkan PDF`, and the language label is `Bahasa Indonesia`.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/locale-quality.test.js
```

Expected: FAIL because Indonesian content is missing.

- [ ] **Step 3: Write common, runtime, and 13 core page files**

Use standard Indonesian, concise verb-first button labels, common search phrases such as `kompres PDF`, and the same honest browser-memory limitations as the English source.

- [ ] **Step 4: Build and test**

```powershell
npx vitest run tests/content-validation.test.js tests/locale-quality.test.js tests/rendering.test.js
```

Expected: PASS for 13 rendered Indonesian core pages.

- [ ] **Step 5: Commit**

```powershell
git add site/content/id tests/locale-quality.test.js
git commit -m "feat: add Indonesian PDF tools"
```

### Task 14: Add 20 localized search-intent pages

**Files:**
- Create: `site/templates/landing.mjs`
- Create: four landing JSON files under each of `site/content/en/pages/`, `es/pages/`, `pt-BR/pages/`, `ja/pages/`, and `id/pages/`
- Modify: `package.json`
- Modify: `playwright.config.js`
- Modify: `.github/workflows/test.yml`
- Modify: `tests/locale-quality.test.js`
- Modify: `tests/build-output.test.js`

- [ ] **Step 1: Write failing landing-page tests**

For each of the five new-language locales, assert four route files, unique title/description/H1 values, a visible limitations section, a visible privacy section, a locale-matched FAQ, and a primary link to that locale's upload-ready or compress tool.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/build-output.test.js tests/locale-quality.test.js
```

Expected: FAIL with 78 routes instead of 98.

- [ ] **Step 3: Implement the landing template**

Render these sections in order: localized breadcrumb, intent-specific H1/lead, direct tool CTA, three-step instructions, honest target-size limitations, privacy explanation, related tools, and visible FAQ. Escape every content field and render JSON-LD only from the same visible FAQ entries.

- [ ] **Step 4: Write English and Spanish landing content**

Each page must use a distinct scenario and avoid duplicated paragraphs. English and Spanish 1 MB/500 KB pages explain that the tool attempts the target but cannot guarantee it for every PDF.

- [ ] **Step 5: Write Portuguese, Japanese, and Indonesian landing content**

Use each market's natural query wording and examples. Do not copy English sentence order mechanically; keep feature and privacy claims equivalent.

- [ ] **Step 6: Switch the production build and browser server to `dist/`**

Set these package scripts:

```json
{
  "build": "npm run build:css && node scripts/build-site.mjs",
  "build:css": "tailwindcss -i ./src/tailwind.css -o ./assets/css/tailwind.min.css --minify",
  "serve": "python -m http.server 8080 --directory dist",
  "verify:release": "node scripts/verify-release.mjs dist"
}
```

Keep Playwright's server command as `npm run serve`; it now serves generated output. In CI, retain installation and run `npm run build`, `npm run verify:release`, `npm run test:unit`, then `npm run test:browser`.

- [ ] **Step 7: Run full content and artifact validation**

```powershell
npm run build
npm run verify:release
npx vitest run tests/build-output.test.js tests/content-validation.test.js tests/locale-quality.test.js tests/seo-alternates.test.js
```

Expected: `dist/` contains 98 unique indexable routes, the release manifest identifies all files, and no locale contains duplicate title/H1 pairs.

- [ ] **Step 8: Commit**

```powershell
git add site/templates/landing.mjs site/content/en/pages site/content/es/pages site/content/pt-BR/pages site/content/ja/pages site/content/id/pages package.json playwright.config.js .github/workflows/test.yml tests/build-output.test.js tests/locale-quality.test.js
git commit -m "feat: add localized PDF search guides"
```

### Task 15: Replace hard-coded runtime UI text with locale keys

**Files:**
- Modify: `assets/js/site.js`
- Modify: `assets/js/merge.js`, `split.js`, `compress.js`, `unlock.js`
- Modify: `assets/js/manage.js`, `upload-ready.js`, `upload-ready-state.js`
- Modify: `assets/js/pdf-to-jpg.js`, `jpg-to-pdf.js`, `pdf-rotate.js`
- Modify: `tests/runtime-i18n.test.js`
- Modify: `tests/upload-ready-state.test.js`, `tests/pdf-tools.test.js`

- [ ] **Step 1: Add a failing production-script coverage test**

Scan all tool scripts for `t("key")` calls and assert every key exists in `site/config/runtime-keys.mjs`. Reject user-facing Chinese literals in production tool scripts; allow protocol constants, developer comments, and fixture data only when explicitly listed in the test.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/runtime-i18n.test.js
```

Expected: FAIL on the first hard-coded Chinese progress or error message in `merge.js`.

- [ ] **Step 3: Refactor simple tool scripts**

At the top of each classic script, bind:

```js
const { t } = window.PDFToolI18n;
```

Replace every user-facing progress, validation, error, action, and result string in `merge.js`, `split.js`, `compress.js`, and `unlock.js` with a named runtime key. Keep stable error codes, DOM hooks, and algorithm branches unchanged.

- [ ] **Step 4: Refactor complex and extracted tool scripts**

Apply the same rule to `manage.js`, `upload-ready.js`, `upload-ready-state.js`, `pdf-to-jpg.js`, `jpg-to-pdf.js`, and `pdf-rotate.js`. `upload-ready-state.js` continues to export stable error codes; the UI resolves `uploadReady.errors.<code>` through `t()`.

- [ ] **Step 5: Add accessible language-menu behavior to `site.js`**

Implement toggle, outside-click close, Escape close, focus return, and `aria-expanded` updates for `data-language-toggle` and `data-language-menu`. Preserve the mobile menu, FAQ, current-year, active-route, and ad initialization behavior.

- [ ] **Step 6: Run unit and PDF regression tests**

```powershell
npm run build
npx vitest run tests/runtime-i18n.test.js tests/pdf-tools.test.js tests/upload-ready-state.test.js tests/manage-state.test.js
```

Expected: PASS with no hard-coded Chinese user-facing strings in production tool scripts and all six dictionaries covering every runtime key.

- [ ] **Step 7: Commit**

```powershell
git add assets/js tests/runtime-i18n.test.js tests/upload-ready-state.test.js tests/pdf-tools.test.js
git commit -m "feat: localize PDF tool runtime messages"
```

### Task 16: Gate Google tags behind consent and certified-CMP readiness

Reference requirements: [Google Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode) and [Google AdSense certified-CMP requirements](https://support.google.com/adsense/answer/13554116).

**Files:**
- Create: `assets/js/consent.js`
- Create: `site/config/third-parties.mjs`
- Modify: `site/templates/layout.mjs`
- Modify: all six `site/content/<locale>/common.json` files
- Modify: `privacy.html` locale content files
- Modify: `docs/ADSENSE_SUBMISSION.md`
- Create: `tests/consent-config.test.js`
- Create: `tests/browser/consent.spec.js`

- [ ] **Step 1: Write failing consent tests**

Open `/es/` in a fresh browser context and record requests to Google Analytics, Tag Manager, DoubleClick, and AdSense domains. Before a choice, require zero requests and a visible Spanish consent panel. Reject consent and require zero requests. In a second fresh context, accept analytics and assert the Google tag is injected once with Consent Mode v2 values.

Add a build test that rejects `ads.enabled: true` unless `ads.certifiedCmpConfigured: true`.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/consent-config.test.js
npx playwright test tests/browser/consent.spec.js --project=chromium
```

Expected: FAIL because the current layout loads Analytics and AdSense before user interaction.

- [ ] **Step 3: Create the third-party feature gate**

`site/config/third-parties.mjs` exports immutable analytics and advertising settings. Analytics may be enabled behind explicit consent. Advertising defaults to disabled until a Google-certified CMP is configured for EEA, UK, and Switzerland traffic. The build throws when advertising is enabled without the certified-CMP flag.

- [ ] **Step 4: Implement basic Consent Mode v2 for analytics**

`assets/js/consent.js` initializes the local `dataLayer` and sets these states to `denied` before loading any Google tag:

```js
{
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
}
```

After an explicit analytics acceptance, update `analytics_storage` to `granted` and inject the configured Google tag exactly once. Rejection sends no Google request. Persist the choice locally, provide a footer control to reopen settings, and never store PDF names, sizes, hashes, or content in consent state.

- [ ] **Step 5: Render localized consent controls and stop unconditional tag loading**

Remove unconditional Google Analytics and AdSense loaders from `layout.mjs`. Add localized accept, reject, settings, purpose, and privacy-link text to all six `common.json` files. Keep the consent panel keyboard accessible, focus-contained while open, and dismissible only after an explicit choice.

- [ ] **Step 6: Document the certified-CMP production gate**

Update `docs/ADSENSE_SUBMISSION.md` with the requirement to configure a Google-certified CMP integrated with the IAB TCF before personalized AdSense is enabled for EEA, UK, or Switzerland users. Keep advertising disabled in `third-parties.mjs` until that external configuration is verified.

- [ ] **Step 7: Run consent and privacy tests**

```powershell
npm run build
npx vitest run tests/consent-config.test.js tests/content-validation.test.js
npx playwright test tests/browser/consent.spec.js --project=chromium
```

Expected: no Google requests occur before consent; rejection remains network-silent; analytics acceptance loads one consent-aware tag; AdSense stays disabled without the certified-CMP flag.

- [ ] **Step 8: Commit**

```powershell
git add assets/js/consent.js site/config/third-parties.mjs site/templates/layout.mjs site/content docs/ADSENSE_SUBMISSION.md tests/consent-config.test.js tests/browser/consent.spec.js
git commit -m "feat: gate Google tags behind consent"
```

### Task 17: Complete six-locale browser behavior and accessibility coverage

**Files:**
- Create: `tests/browser/locales.spec.js`
- Modify: `tests/browser/localized-tools.spec.js`
- Modify: `tests/browser/release-assets.spec.js`

- [ ] **Step 1: Add reciprocal language-switch tests**

For each locale on the merge route, open the language menu, assert six options and one current-language marker, select the next locale, and verify the resulting URL is that locale's merge route rather than its homepage.

- [ ] **Step 2: Add keyboard tests**

Tab to the language toggle, press Enter, use ArrowDown to reach an option, press Escape, and assert focus returns to the toggle and `aria-expanded="false"`.

- [ ] **Step 3: Add five-width overflow coverage for representative long-copy routes**

Test home, upload-ready, manage, privacy, and one landing page in all six locales at 320, 375, 768, 1024, and 1280 px. Assert document, header, and primary action bounds remain within the viewport.

- [ ] **Step 4: Add representative PDF flows per locale**

Run one small generated PDF through this matrix:

```text
zh-CN: merge
en: split
es: compress
pt-BR: rotate
ja: manage preview
id: upload-ready validation
```

Assert localized progress or result text and a downloadable result where the flow generates one.

- [ ] **Step 5: Run milestone 2 verification**

```powershell
npm run build
npm run test:unit
npm run test:browser
```

Expected: all Chromium and Edge tests pass; no locale route has missing assets or viewport overflow.

- [ ] **Step 6: Commit**

```powershell
git add tests/browser/locales.spec.js tests/browser/localized-tools.spec.js tests/browser/release-assets.spec.js
git commit -m "test: cover multilingual navigation and PDF flows"
```

## Milestone 3 — SEO, release, and production

### Task 18: Audit and classify legacy generated pages

**Files:**
- Create: `scripts/audit-legacy-pages.mjs`
- Create: `reports/legacy-content-audit.json`
- Create: `site/config/legacy-pages.json`
- Create: `site/templates/unavailable.mjs`
- Create: `site/content/en/pages/unavailable.json`, `site/content/es/pages/unavailable.json`, `site/content/pt-BR/pages/unavailable.json`, `site/content/ja/pages/unavailable.json`, `site/content/id/pages/unavailable.json`
- Modify: `scripts/build-site.mjs`
- Create: `tests/legacy-pages.test.js`

- [ ] **Step 1: Write failing classification tests**

Require every root HTML file not owned by `CORE_ROUTES` to have exactly one status: `retain`, `noindex`, or `exclude`. Reject duplicate paths and unknown files. Assert `seo-*.html` defaults are never indexable without an explicit `retain` entry.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/legacy-pages.test.js
```

Expected: FAIL because the classification file is missing.

- [ ] **Step 3: Implement the audit report**

For each root HTML source, report path, title, H1, canonical, visible word count, internal-link count, generated-family prefix, and a SHA-256 hash of normalized visible text. Group duplicate hashes and duplicate title/H1 pairs.

- [ ] **Step 4: Generate and review the report**

```powershell
node scripts/audit-legacy-pages.mjs
```

Expected: `reports/legacy-content-audit.json` lists every non-core root HTML file once.

- [ ] **Step 5: Commit an explicit classification**

Classify authored blog and guide pages with unique content as `retain`. Classify mass `seo-*` families as `noindex` unless the report shows unique, useful content and the file is explicitly retained. Classify obsolete English generator outputs and duplicate entry pages as `exclude` because the generated locale routes replace them.

- [ ] **Step 6: Add explicit unavailable-in-language pages**

Generate one `noindex,follow` availability page for each non-Chinese locale at `/<prefix>/unavailable.html`. It explains that the requested legacy article is not translated, links to the selected locale's tool index, and never pretends the locale homepage is an equivalent translation.

- [ ] **Step 7: Apply classifications during build**

Copy retained pages with the canonical apex host and an injected language menu whose non-Chinese options point to the localized availability page with the source route in the query string. Copy `noindex` pages with `meta[name=robots]` set to `noindex,follow` and omit them from the sitemap. Do not copy excluded pages. Fail the build when a new unclassified root HTML appears.

- [ ] **Step 8: Test and commit**

```powershell
npm run build
npx vitest run tests/legacy-pages.test.js tests/build-output.test.js
git add scripts/audit-legacy-pages.mjs reports/legacy-content-audit.json site/config/legacy-pages.json site/templates/unavailable.mjs site/content/*/pages/unavailable.json scripts/build-site.mjs tests/legacy-pages.test.js
git commit -m "chore: classify legacy SEO content"
```

### Task 19: Finalize sitemap, robots, and international SEO validation

**Files:**
- Modify: `site/lib/sitemap.mjs`
- Modify: `scripts/build-site.mjs`
- Modify: `tests/seo-alternates.test.js`
- Create: `tests/browser/seo.spec.js`

- [ ] **Step 1: Add failing sitemap reciprocity tests**

Parse `dist/sitemap.xml` and assert each of the 98 canonical routes has locale alternates matching the page head, every URL is unique, every route exists on disk, and no `noindex` legacy URL appears.

- [ ] **Step 2: Add browser HTTP checks**

Request every sitemap URL through the local server and require HTTP 200 with `text/html`. Parse every JSON-LD block. Require exactly one H1, one canonical, and one self alternate.

- [ ] **Step 3: Implement XHTML sitemap alternates**

Use the namespaces:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
```

Generate `<xhtml:link rel="alternate" hreflang="...">` entries from `alternatePaths`; include `x-default` pointing to `/en/`.

- [ ] **Step 4: Generate robots from code**

Write a UTF-8 `robots.txt` containing `Allow: /` and `Sitemap: https://pdftool.work/sitemap.xml`. Preserve deliberate bot-specific policy only after confirming it does not block the search engines intended for international acquisition.

- [ ] **Step 5: Run and commit**

```powershell
npm run build
npx vitest run tests/seo-alternates.test.js tests/build-output.test.js
npx playwright test tests/browser/seo.spec.js --project=chromium
git add site/lib/sitemap.mjs scripts/build-site.mjs tests/seo-alternates.test.js tests/browser/seo.spec.js
git commit -m "feat: generate reciprocal international SEO metadata"
```

### Task 20: Deploy only the tested release artifact

**Files:**
- Modify: `deploy/deploy.ps1`
- Modify: `deploy/deploy.sh`
- Modify: `tests/release-config.test.js`

- [ ] **Step 1: Add failing deploy-contract tests**

Assert both deploy scripts reference `dist/release-manifest.json`, verify the release before upload, archive only `dist/` contents, record the Git commit in the remote release, and keep the existing previous-release rollback path.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/release-config.test.js
```

Expected: FAIL because deploy scripts still contain hand-maintained HTML arrays.

- [ ] **Step 3: Replace file arrays with the immutable artifact**

PowerShell creates a tar archive from `dist/`, uploads it, verifies hashes from `release-manifest.json` on the server, extracts into the versioned release directory, applies directory/file permissions, then atomically switches `current`.

Bash uses `tar -C dist -cf - .` over SSH and performs the same manifest, permissions, activation, health, and rollback steps. Neither script reads root HTML or source assets.

- [ ] **Step 4: Expand health checks**

Check all six locale homepages, one tool in each locale, sitemap, robots, ads, translator script, PDF worker, one CMap, one font, and one WASM file. Require expected MIME types and the release commit marker.

- [ ] **Step 5: Run tests and a dry artifact inspection**

```powershell
npm run build
npm run verify:release
npx vitest run tests/release-config.test.js
$archive = Join-Path $env:TEMP 'pdftool-release-inspection.tar'
tar -C dist -cf $archive .
tar -tf $archive
Remove-Item -LiteralPath $archive
```

Expected: unit test PASS. The archive contains `release-manifest.json` and locale directories, and does not contain `node_modules`, `site`, `tests`, or source root HTML.

- [ ] **Step 6: Commit**

```powershell
git add deploy/deploy.ps1 deploy/deploy.sh tests/release-config.test.js
git commit -m "build: deploy verified dist artifacts"
```

### Task 21: Enforce HTTPS apex canonicalization

**Files:**
- Modify: `deploy/nginx/pdftool.work`
- Modify: `deploy/preflight.ps1`
- Modify: `tests/release-config.test.js`

- [ ] **Step 1: Add failing Nginx assertions**

Require a dedicated `www` server block that returns `301 https://pdftool.work$request_uri`, an HTTP apex redirect to HTTPS, and an HTTPS apex content server. Preserve PDF.js MIME types and security headers.

- [ ] **Step 2: Run and verify failure**

```powershell
npx vitest run tests/release-config.test.js
```

Expected: FAIL because the current combined server block can serve duplicate `www` content.

- [ ] **Step 3: Split canonical redirect and content server blocks**

The configuration must preserve path and query, keep `try_files $uri $uri/ =404`, and serve only `pdftool.work` from `/var/www/pdftool.work/current`. Do not add HSTS until production HTTPS and renewal checks pass.

- [ ] **Step 4: Expand preflight**

Check that apex and `www` resolve to the intended address, HTTPS apex returns 200, HTTP apex redirects to HTTPS, and HTTPS `www` redirects to the apex with the same path.

- [ ] **Step 5: Test and commit**

```powershell
npx vitest run tests/release-config.test.js
powershell -ExecutionPolicy Bypass -File .\deploy\preflight.ps1
git add deploy/nginx/pdftool.work deploy/preflight.ps1 tests/release-config.test.js
git commit -m "fix: enforce canonical HTTPS host"
```

Expected: local configuration tests PASS. Preflight may report the old production redirect until the new Nginx configuration is installed; it must clearly distinguish that external state from local config validity.

### Task 22: Final documentation, release identifier, and complete verification

**Files:**
- Modify: `README.md`
- Modify: `TESTING.md`
- Modify: `CHANGELOG.md`
- Modify: `VERSION`
- Modify: `docs/INDEXING.md`
- Create: `scripts/export-locale-review.mjs`
- Create: `reports/locale-review.json`
- Create: `tests/locale-review.test.js`

- [ ] **Step 1: Update documentation**

Document the six locales, source/content/template structure, `dist/` build, translation key rules, route addition process, content-review rule, test commands, artifact deployment, and rollback.

- [ ] **Step 2: Export and record the linguistic review gate**

`scripts/export-locale-review.mjs` writes a UTF-8 review table containing locale, route, field, English source, and target text for every non-English page and runtime message. Reviewers check natural language, feature accuracy, privacy meaning, search phrasing, and interpolation tokens.

Record one entry per locale in `reports/locale-review.json` with `status: "approved"`, a non-empty reviewer identifier, and an ISO-8601 review time. `tests/locale-review.test.js` rejects missing locales, non-approved status, and a review timestamp older than the current content files. Do not proceed to production when any locale lacks recorded human approval.

- [ ] **Step 3: Set the release identifier**

Set `VERSION` to `2.0.0` and add a dated changelog entry listing the six-locale core site, 20 intent pages, generated SEO, runtime localization, Editorial Utility redesign, CI coverage, and canonical-host fix.

- [ ] **Step 4: Run clean-room verification**

```powershell
npm ci --no-audit --no-fund
npx playwright install chromium msedge
npm run build
npm run verify:release
npm run test:unit
npm run test:browser
npx vitest run tests/locale-review.test.js
git diff --check
git status --short
```

Expected: build and all tests PASS; `git diff --check` emits nothing; only intended documentation/version changes remain unstaged.

- [ ] **Step 5: Inspect the generated route count and claims**

```powershell
node -e "const m=require('./dist/release-manifest.json'); console.log(m.routes.length)"
rg -n -i "no file size limits|files of any size|up to 90%|API access|complete privacy and security" dist
```

Expected: route count `98`; prohibited-claim search returns no matches.

- [ ] **Step 6: Commit**

```powershell
git add README.md TESTING.md CHANGELOG.md VERSION docs/INDEXING.md scripts/export-locale-review.mjs reports/locale-review.json tests/locale-review.test.js
git commit -m "docs: prepare multilingual v2 release"
```

### Task 23: Publish, merge, deploy, and verify production

**Files:**
- No source changes expected unless a release-blocking defect is found and covered by a regression test.

- [ ] **Step 1: Push the branch and open a pull request**

```powershell
git push -u origin codex/multilingual-site-upgrade
gh pr create --base main --head codex/multilingual-site-upgrade --title "feat: launch six-language pdftool.work" --body-file docs/superpowers/specs/2026-07-04-multilingual-website-design.md
```

Expected: GitHub returns the pull-request URL.

- [ ] **Step 2: Confirm required checks are green**

```powershell
gh pr checks --watch
```

Expected: build, unit, and browser checks all PASS. Do not merge a red or pending PR.

- [ ] **Step 3: Review the production diff and merge**

```powershell
git fetch origin main
git diff --stat origin/main...HEAD
gh pr merge --squash --delete-branch
```

Expected: PR merged into `main`. This is the explicit production-release checkpoint; do not run the merge command without the user's confirmation in the execution session.

- [ ] **Step 4: Install and validate Nginx configuration**

```powershell
scp .\deploy\nginx\pdftool.work root@154.217.241.238:/etc/nginx/sites-available/pdftool.work
ssh root@154.217.241.238 "nginx -t && systemctl reload nginx"
```

Expected: `nginx -t` succeeds and reload exits 0.

- [ ] **Step 5: Run preflight and deploy the tested main artifact**

```powershell
git fetch origin main
git switch --detach origin/main
npm ci --no-audit --no-fund
npm run build
npm run verify:release
npm run test:unit
npm run test:browser
powershell -ExecutionPolicy Bypass -File .\deploy\preflight.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1
```

Expected: the merged `origin/main` commit passes the complete clean build and test suite, followed by `PREFLIGHT_OK`, an activated release identifier, and passing post-deploy smoke checks. Any failed health check automatically restores the previous release.

- [ ] **Step 6: Verify production routes and canonical redirects**

```powershell
$urls = @(
  'https://pdftool.work/',
  'https://pdftool.work/en/',
  'https://pdftool.work/es/',
  'https://pdftool.work/pt-br/',
  'https://pdftool.work/ja/',
  'https://pdftool.work/id/',
  'https://pdftool.work/sitemap.xml'
)
foreach ($url in $urls) { curl.exe -fsSIL --max-time 20 $url }
curl.exe -fsSIL --max-time 20 https://www.pdftool.work/es/compress-pdf.html
```

Expected: locale URLs return 200; `www` returns 301 to the same apex path; sitemap returns XML.

- [ ] **Step 7: Align GitHub repository metadata**

```powershell
gh repo edit yihui315/pdftool --homepage "https://pdftool.work" --description "Private, browser-based PDF tools in six languages"
```

Expected: repository homepage and description reflect the production site.

- [ ] **Step 8: Record release evidence**

Add the merged commit, deployed release identifier, smoke-test timestamp, and rollback release identifier to the PR's final comment. Do not include server credentials, file contents, user filenames, or analytics identifiers.

---

## Plan completion checks

Before declaring the implementation complete, verify all of the following together:

- 78 localized core routes and 20 localized intent routes exist in `dist/`.
- Every route has a self-canonical, reciprocal locale alternates, and `x-default`.
- Language switching preserves the current core route.
- Dynamic tool text is localized and PDF algorithms remain shared.
- No supported width overflows in Chromium or Edge.
- Sitemap, release manifest, and files agree exactly.
- Legacy generated pages are explicitly classified and non-indexable by default.
- CI is green on the merged commit.
- Production apex, HTTPS, `www` redirect, six locale homes, workers, fonts, CMaps, and WASM pass smoke tests.
- The deployed release is tied to a Git commit and a known rollback release remains available.
