# Project guidance

## Testing

- Run all tests with `npm test`.
- Tests live in `tests/`; see `TESTING.md` for fixtures and conventions.
- 100% test coverage is the goal because tests make fast iteration safe.
- Add a corresponding test for every new function.
- Add a regression test whenever a bug is fixed.
- Trigger and assert new error-handling paths.
- Cover both branches of every new conditional.
- Never commit code that makes the existing test suite fail.
