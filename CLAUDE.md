# CLAUDE.md

AI agents & contributors working in this repo: **read [README.md](./README.md)** first.

The **[Conventions & architecture](./README.md#conventions--architecture)** section is the
rulebook — it covers the data flow, the do/don't rules, gotchas to not reintroduce, and the
build order for adding a test (data → Page Object → spec → gates).

Key reminders:

- Selectors live only in Page Objects; specs compose pages. Read data via `data<T>('name')`.
- Tag every `it()` (`@smoke` / `@regression`, plus `@manual` / `@visual`).
- Env is selected by `TEST_ENV` (not `CYPRESS_ENV`); secrets live in `cypress.env.json`.
- Scaffold new tests with `npm run new:test -- <Name> [--data]`.
- **Before declaring work done:** `npm run typecheck && npm run lint && npm test` (all green).
