# Backlog

Tracked improvements from the framework review. Ordered by priority.
Must-fix items from the review (junk data, generator regen, unused visual) are already done.

## Medium

### 1. No `cy.session` / auth caching

`cy.login` does a full UI login on every test. Fine for the saucedemo demo (client-side routing can't
deep-link), but it won't scale for a real app.

- **Fix:** for apps that support deep-linking/SSR, wrap the login body in
  `cy.session([user, pass], () => {...}, { cacheAcrossSpecs: true })`.

## Low–Medium

### 2. Data editor can delete core files

`tools/data-server.mjs` allows `DELETE` on any valid filename, including `env.json` / `users.json`.
One mis-click in the UI can break config.

- **Fix:** maintain a protected-files list (e.g. `env.json`) the server refuses to delete, and/or a
  confirm guard in the UI for those.

## Low

### 3. `login.cy.ts` and `login-cases.cy.ts` overlap

Both exercise login with overlapping scenarios — kept on purpose to demo the two data-driven styles
(roster-driven vs test-case-driven). In a real suite, pick one.

- **Fix:** consolidate when wiring a real app.

### 4. No `engines` field in `package.json`

`.nvmrc` pins Node for `nvm` users, but `npm install` won't warn on a wrong Node version.

- **Fix:** add `"engines": { "node": ">=18" }` (and optionally `engine-strict`).
