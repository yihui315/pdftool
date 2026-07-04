# pdftool.work Multilingual Website Upgrade Design

**Date:** 2026-07-04
**Status:** Approved
**Target branch:** `codex/multilingual-site-upgrade`, based on `origin/main`

## 1. Context and verified baseline

pdftool.work is a static, browser-only PDF tool website deployed to an Ubuntu/Nginx server. PDF files are processed locally with `pdf-lib` and PDF.js; the server only serves static assets and records ordinary access logs.

The audit on 2026-07-04 found:

- The local checkout was on `feature/initial-release`, while `origin/main` was 58 commits ahead of the local `main`. The upgrade must therefore start from `origin/main`, not from the stale working branch.
- `origin/main` contained 116 checked-in HTML files, only six English pages, and a sitemap containing 157 URLs. The generated sitemap and checked-in release output need a strict consistency check.
- The last three GitHub Actions runs on `main` failed. The latest failure was a horizontal overflow at 1280 px on the homepage in both Chromium and Edge after language-switcher changes.
- Production served the Chinese site, `/en/`, the PDF tools, sitemap, robots file, and ads file over HTTPS. Production content did not match the latest `main` commit, so repository, CI, and deployed release state had drifted apart.
- `www.pdftool.work` served a second copy of the site instead of consistently redirecting to the canonical apex domain.
- The existing English pages were informational shells rather than complete localized product flows. Some links returned to Chinese pages, the language switcher was inconsistent, and claims such as unlimited file sizes and available API access were not supported by the product.
- `main` included large batches of automatically generated SEO pages and automatic indexing/deployment scripts. Translating or publishing them wholesale would create quality, trust, and search-policy risk.

## 2. Goals

The upgrade will:

1. Deliver a production-quality site in six locales: Simplified Chinese, English, Spanish, Brazilian Portuguese, Japanese, and Indonesian.
2. Preserve existing Chinese URLs and indexed links while adding stable locale-prefixed URLs for the five new languages.
3. Make every core product flow fully localized, not merely translated landing-page copy.
4. Establish one maintainable source of truth for templates, routes, navigation, SEO metadata, and localized content.
5. Improve international discoverability with correct canonical URLs, reciprocal `hreflang`, localized structured data, and a sitemap that exactly matches release files.
6. Replace the current generic visual treatment with the approved **Editorial Utility** direction: warm paper surfaces, deep ink typography, and a restrained PDF-red accent.
7. Restore a green CI pipeline and align GitHub, release artifacts, and production.

## 3. Non-goals

- Translating every existing generated SEO page in the first release.
- Migrating the site to React, Next.js, Astro, or another application framework.
- Adding accounts, server-side PDF processing, cloud file storage, or a new API.
- Automatically redirecting visitors based on browser language or IP location.
- Automatically publishing AI-generated pages without content review and release tests.
- Adding German, French, Arabic, or other locales in this release. The architecture must allow them later without changing the URL or template model.

## 4. Selected architecture

### 4.1 Build-time static generation

The site remains static. A small Node.js build layer will render HTML from:

- a page manifest containing route keys, template types, asset requirements, and locale availability;
- shared layout and component renderers;
- one validated locale data file per language;
- page-specific localized content;
- explicit SEO metadata and alternate-route mappings.

No runtime translation library is required. Search engines and users receive complete localized HTML immediately, PDF processing remains client-side, and Nginx continues to serve ordinary static files.

The implementation should prefer small JavaScript render functions and existing project tooling over a framework migration or a large templating dependency.

### 4.2 Source boundaries

The generated-site layer will have four clear responsibilities:

1. **Route manifest:** defines what public pages exist and which localized URL belongs to each route key.
2. **Locale content:** contains user-visible text and metadata; it must not contain rendering logic.
3. **Templates and components:** render semantic HTML from validated data; they must not embed language-specific copy.
4. **Build validation:** rejects incomplete locales, broken alternate mappings, invalid structured data, duplicate URLs, and missing assets before writing release output.

PDF algorithms and workflow state remain in shared JavaScript modules. Generated localized pages bind the same scripts to the same stable data attributes, so the site does not acquire six copies of PDF logic.

## 5. Locale and URL policy

### 5.1 Supported locales

| Locale | Language | URL prefix | `hreflang` |
| --- | --- | --- | --- |
| `zh-CN` | 简体中文 | existing root URLs | `zh-CN` |
| `en` | English | `/en/` | `en` |
| `es` | Español | `/es/` | `es` |
| `pt-BR` | Português do Brasil | `/pt-br/` | `pt-BR` |
| `ja` | 日本語 | `/ja/` | `ja` |
| `id` | Bahasa Indonesia | `/id/` | `id` |

Existing Chinese URLs remain unchanged to protect backlinks and indexed history. Locale-prefixed pages use consistent ASCII filenames, such as `/es/compress-pdf.html` and `/ja/merge-pdf.html`. The route manifest, not string replacement, maps equivalent pages.

The English homepage canonical is `/en/`; `/en/index.html` redirects to `/en/`. The same rule applies to other locale homepages. Chinese `/index.html` redirects to `/` if the existing Nginx configuration can do so without breaking deployment.

### 5.2 Language selection

- The header language control displays language names, not country flags.
- Selecting a language opens the equivalent route for the current page.
- The site does not force a language redirect. It may remember an explicit selection in local storage and show a non-blocking suggestion on later visits.
- Every one of the 13 core routes has six complete locale versions.
- If a legacy or editorial route has no equivalent, the selector opens a localized, `noindex` availability page that explains the limitation and links to the selected locale's tool index. It must not silently return the user to Chinese.
- The selector is keyboard accessible, closes on Escape and outside click, exposes its expanded state, and never causes horizontal overflow.

## 6. Launch content scope

### 6.1 Core pages

The first production release includes these 13 pages in all six locales:

1. Homepage
2. All tools
3. Upload-ready assistant
4. Merge PDF
5. Split PDF
6. Manage PDF pages
7. Compress PDF
8. PDF to image
9. Image to PDF
10. Rotate PDF
11. Unlock PDF
12. About
13. Privacy

This produces 78 complete core routes.

### 6.2 Search landing pages

Each of the five new languages receives four high-intent landing pages at launch:

- compress PDF to 1 MB;
- compress PDF to 500 KB;
- compress PDF without losing readability;
- fix a PDF that is too large to upload.

These 20 pages use locale-specific query phrasing, examples, units, FAQ wording, and internal links. They must provide useful, unique instructions and must not be generated as simple sentence substitutions.

Existing Chinese SEO pages are audited into four states: retain, rewrite, redirect, or remove/noindex. Only retained and rewritten pages remain in navigation and the sitemap. The first release does not translate the remainder.

### 6.3 Content integrity

- Remove unsupported statements about unlimited file sizes, guaranteed compression ratios, API availability, processing times, or absolute security.
- Describe browser memory and PDF structure limits honestly.
- Keep the privacy promise precise: PDF file data stays local, while ordinary page, analytics, or advertising network requests may still occur.
- Localize content for natural language and search intent instead of direct machine translation.
- Require human review for Japanese, Spanish, Portuguese, and Indonesian public copy before final production deployment. Automated checks can verify structure, not linguistic quality.

## 7. Visual and interaction design

### 7.1 Approved direction: Editorial Utility

The approved design uses:

- warm off-white surfaces inspired by paper rather than a generic white SaaS canvas;
- deep ink blue-green for primary text and navigation;
- restrained PDF red for primary actions, active states, and important progress;
- fine rules, subtle print-like texture, and quiet shadows rather than purple gradients or glassmorphism;
- strong editorial headlines paired with highly readable interface typography;
- asymmetric hero compositions on large screens and a direct, single-column task flow on small screens.

Typography may use language-aware, self-hosted subsets: an editorial serif for Latin headings, compatible CJK serif fallbacks for Chinese and Japanese headings, and a readable sans family for interface text. Font payloads must be subsetted and measured so the design does not compromise loading performance.

### 7.2 Shared components

The generated layout provides:

- skip link;
- global header and responsive navigation;
- language menu;
- locale-aware breadcrumbs;
- tool hero and local-processing trust statement;
- upload/drop zone;
- progress and status region;
- result/download card;
- related tools and localized editorial links;
- FAQ disclosure pattern;
- advertising container that remains visually separate from tool actions;
- global footer and legal links.

All controls have visible focus states, adequate target sizes, semantic labels, and reduced-motion behavior. Locale changes must not change the core information hierarchy.

## 8. Localization data and runtime behavior

### 8.1 Data model

Each locale supplies:

- locale label and document language;
- shared navigation and footer copy;
- reusable form, status, progress, error, and download messages;
- route-specific headings and body content;
- metadata, social text, structured data, and FAQ content;
- formatting helpers for numbers, sizes, dates, and filenames.

Required keys use a shared schema. All six locale files must have parity for shared keys and every supported core route. Placeholders such as `{filename}`, `{pageCount}`, and `{size}` must match across locales.

### 8.2 Error handling

- A missing required translation, route, canonical, alternate, or asset fails the build.
- An optional editorial translation is omitted from output and from the sitemap rather than falling back silently.
- Runtime PDF failures use stable error codes mapped to localized messages; raw exceptions stay in local diagnostics and the console.
- Form validation, unsupported-PDF, damaged-PDF, memory, cancellation, and download errors remain recoverable and explain the next action.
- Language-menu failures leave the current page usable and show an ordinary link list as progressive enhancement.
- Generated output is written to a temporary build directory and promoted only after the entire build validates, preventing partial releases.

## 9. International SEO design

Every localized page includes:

- a self-referencing canonical URL on `https://pdftool.work`;
- reciprocal alternate links for every available locale;
- an `x-default` alternate pointing to `/en/` for international discovery;
- correct `<html lang>` values;
- localized title, description, Open Graph, and social metadata;
- localized, valid JSON-LD that describes only visible page content;
- locale-aware breadcrumbs and related-page links.

The sitemap uses the XHTML alternate-link namespace and is generated from the same route manifest as the HTML. It contains only canonical URLs whose release files exist. CI checks reciprocity, uniqueness, URL status, and manifest/sitemap parity.

`robots.txt` points to the generated sitemap. Search-engine blocking rules are reviewed separately from content-language work and must not accidentally block intended indexing.

Nginx enforces these canonical-host rules:

1. HTTP redirects to HTTPS.
2. `www.pdftool.work` redirects permanently to `https://pdftool.work` while preserving path and query.
3. Duplicate locale homepage filenames redirect to their directory canonical.

## 10. Testing strategy

### 10.1 Build and unit tests

- locale schema and required-key parity;
- placeholder parity;
- route uniqueness and output-path safety;
- canonical and alternate mapping;
- structured-data parsing;
- filename and unit formatting;
- release manifest and sitemap parity;
- rejection of incomplete locale data.

### 10.2 Browser tests

Playwright covers Chromium and Edge, with representative Safari-compatible behavior verified separately where available.

Tests include:

- all core routes return 200 for all six locales;
- navigation and language switching preserve the equivalent route;
- keyboard and screen-reader state for menus and disclosures;
- no document or header overflow at 320, 375, 768, 1024, and 1280 px;
- locale-specific text expansion does not clip controls;
- upload, validation, PDF processing, cancellation, result, and download flows still work through localized markup;
- first-party workers, fonts, CMaps, WASM, and scripts load from correct relative paths at every locale depth;
- production canonical-host redirects and security headers.

Shared PDF algorithms are tested once at the module level. Browser tests exercise representative tool flows in each locale without redundantly processing every fixture 78 times.

### 10.3 Content and SEO checks

- no untranslated Chinese text in non-Chinese core pages, excluding the language name `简体中文`;
- no unsupported API, unlimited-size, or guaranteed-result claims;
- every indexable route has one H1, one canonical, valid alternates, and valid metadata;
- every sitemap URL exists in the release and returns 200;
- no locale page links unexpectedly to a Chinese core page;
- no placeholder publisher IDs are enabled as real advertisements.

## 11. GitHub and deployment plan

Development occurs on `codex/multilingual-site-upgrade`, based on the latest `origin/main`, in a separate worktree so the user's modified `TODOS.md` and untracked video project remain untouched.

Implementation order:

1. Reproduce and fix the current responsive-header CI failure.
2. Introduce manifest, locale schema, templates, and atomic build output.
3. Rebuild the Chinese and English core shell from the shared system while preserving tool behavior.
4. Add Spanish, Brazilian Portuguese, Japanese, and Indonesian content.
5. Add curated landing pages and SEO generation.
6. Complete automated tests and content review.
7. Generate a release manifest and deploy the exact tested artifact.

The deployment script uploads files from the generated release manifest instead of maintaining a hand-written list. It runs build, unit tests, browser tests, and release verification before upload. The server receives a versioned release directory; health checks run before and after atomically switching the `current` symlink. A failed health check restores the previous release.

Production verification covers every locale homepage, representative tools, all first-party worker assets, sitemap, robots, ads, HTTP-to-HTTPS redirect, and `www` canonical redirect.

Automatic page generation, indexing, or deployment scripts do not bypass the normal build and test gates.

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Large batches of thin translated pages damage search trust | Launch only core pages and four reviewed intent pages per new locale; audit existing generated pages |
| Template migration breaks PDF tools | Preserve stable data attributes and shared algorithms; add localized browser-flow regression tests |
| Relative assets break under locale directories | Generate URLs from a path helper and test workers, fonts, CMaps, and WASM at locale depth |
| Long translations overflow navigation | Use a compact language menu, responsive breakpoints, text-expansion fixtures, and five-width overflow tests |
| CJK fonts inflate payload | Self-host subsetted WOFF2 only where justified; measure and retain system fallbacks |
| Repository and production drift again | Deploy only immutable, tested release artifacts and record the deployed commit/build identifier |
| Incorrect or risky marketing claims are replicated | Centralize claims in reviewed content data and block known unsupported phrases in CI |
| Legal/privacy copy differs by locale | Translate from one approved policy source, include revision metadata, and review before production |

## 13. Acceptance criteria

The multilingual upgrade is complete when:

1. All 78 core localized routes and 20 new localized intent pages build and return 200.
2. Chinese legacy URLs continue to work or have explicit permanent redirects.
3. Every core page has correct self-canonical, reciprocal `hreflang`, and `x-default` metadata.
4. The generated sitemap exactly matches indexable release output.
5. Language switching preserves route context for all core pages and clearly handles unavailable legacy content.
6. No supported viewport has horizontal document or header overflow.
7. Core PDF workflows pass unit and browser tests after template migration.
8. All GitHub Actions checks pass on the upgrade branch.
9. Production redirects HTTP and `www` traffic to the canonical HTTPS apex URL.
10. Production smoke tests pass for all six locale homepages, representative tool flows, and required PDF.js assets.
11. Unsupported English marketing claims are removed.
12. The deployed site exposes a build identifier tied to the tested Git commit and retains a verified rollback release.
