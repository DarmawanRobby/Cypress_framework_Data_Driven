# Backlog

Tracked improvements from the framework review. Ordered by priority.
Must-fix items from the review (junk data, generator regen, unused visual) are already done.

## Medium

### 1. `CYPRESS_ENV` collides with Cypress' reserved env prefix

Every run prints `The CYPRESS_env environment variable must be a valid JSON object, but received: dev`.
Cypress treats `CYPRESS_*` as config overrides, so `CYPRESS_ENV=dev` is misread as the `env` config object.
It's only a warning (we read `process.env.CYPRESS_ENV` ourselves in `config/env.ts`), but it's noise on every run.

- **Fix:** rename the selector var to `TEST_ENV` (non-reserved). Touch `config/env.ts`, all `package.json`
  scripts, `.env.example`, README, CLAUDE, CI.

### 2. No `cy.session` / auth caching

`cy.login` does a full UI login on every test. Fine for the saucedemo demo (client-side routing can't
deep-link), but it won't scale for a real app.

- **Fix:** for apps that support deep-linking/SSR, wrap the login body in
  `cy.session([user, pass], () => {...}, { cacheAcrossSpecs: true })`.

## Low–Medium

### 3. Data editor can delete core files

`tools/data-server.mjs` allows `DELETE` on any valid filename, including `env.json` / `users.json`.
One mis-click in the UI can break config.

- **Fix:** maintain a protected-files list (e.g. `env.json`) the server refuses to delete, and/or a
  confirm guard in the UI for those.

## Low

### 4. Doc drift in README "Test data editor"

That section still says data is read via `cy.fixture`. The real path is the `data()` auto-loader
(`support/data.ts`); `cy.fixture` is no longer used.

- **Fix:** update the section to describe `data()` / `findIn` / `filterIn`.

### 5. `login.cy.ts` and `login-cases.cy.ts` overlap

Both exercise login with overlapping scenarios — kept on purpose to demo the two data-driven styles
(roster-driven vs test-case-driven). In a real suite, pick one.

- **Fix:** consolidate when wiring a real app.

### 6. No `engines` field in `package.json`

`.nvmrc` pins Node for `nvm` users, but `npm install` won't warn on a wrong Node version.

- **Fix:** add `"engines": { "node": ">=18" }` (and optionally `engine-strict`).
