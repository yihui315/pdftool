# Testing

## Philosophy

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence. Without them, vibe coding is just yolo coding. With tests, it is a superpower.

## Framework

The project uses Vitest 4 with jsdom 29. Tests run the real browser scripts against the production HTML and use `pdf-lib` to generate small in-memory PDF fixtures.

## Commands

- `npm test` runs the complete test suite once.
- `npm run test:watch` reruns affected tests while files change.
- `npm run build` rebuilds Tailwind CSS and refreshes the vendored `pdf-lib` browser bundle.

## Test layers

- Unit and DOM interaction tests live in `tests/` and use the `*.test.js` suffix.
- Integration tests exercise complete upload, validation, PDF processing, and result-state flows in jsdom.
- Smoke coverage is provided by the production build in local runs and CI.
- End-to-end browser tests should be added when deployment behavior or browser-only APIs need verification.

## Conventions

- Assert visible user behavior, download state, or generated PDF behavior rather than implementation details.
- Generate PDF fixtures in memory; do not commit customer documents or sensitive files.
- Close each jsdom window after the test so event handlers and document state do not leak.
- Add a regression test for every bug fix and cover both branches of new conditionals.
