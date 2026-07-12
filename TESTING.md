# Testing

## Philosophy

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence. Without them, vibe coding is just yolo coding. With tests, it is a superpower.

## Framework

The project uses Vitest 4 with jsdom 29 for unit and DOM tests, plus Playwright 1.61 for Chromium and Microsoft Edge browser coverage. Tests exercise the generated `dist/` release and use `pdf-lib` to generate small in-memory PDF fixtures.

## Commands

- `npm test` rebuilds `dist/`, then runs all Vitest and Playwright tests once.
- `npm run test:unit` runs the Vitest suite only.
- `npm run test:browser` runs the Playwright suite in Chromium and Microsoft Edge.
- `npm run test:browser:headed` runs the browser suite with visible browser windows.
- `npm run test:watch` reruns affected tests while files change.
- `npm run build` rebuilds Tailwind CSS, generates all localized pages into `dist/`, copies locked PDF runtime assets, writes the release manifest and verifies the release.
- `npm run verify:release` verifies an existing `dist/` directory without rebuilding it.

## Test layers

- Unit, content, rendering, manifest, sitemap and DOM interaction tests live in `tests/` and use the `*.test.js` suffix.
- AI/SEO tests live in `tests/ai/`.
- Browser tests live in `tests/browser/` and use the `*.spec.js` suffix. They exercise real Worker, Canvas, PDF.js and download behavior.
- Locale coverage verifies all 98 generated routes, reciprocal hreflang links, canonical URLs, root-absolute assets and language-isolated navigation/runtime strings.
- Release coverage verifies the immutable manifest, file hashes, approved legacy pages, first-party PDF dependencies and required PDF.js support directories.
- CI and local `npm test` both test the generated release rather than serving source HTML directly.

## Conventions

- Assert visible user behavior, download state, or generated PDF behavior rather than implementation details.
- Generate PDF fixtures in memory; do not commit customer documents or sensitive files.
- Close each jsdom window after the test so event handlers and document state do not leak.
- Add a regression test for every bug fix and cover both branches of new conditionals.
- Add or update locale fixtures when a shared template or runtime key changes; never patch generated files in `dist/` by hand.
- Run browser tests through HTTP. `file://` does not reproduce module, Worker or nested-route behavior.
