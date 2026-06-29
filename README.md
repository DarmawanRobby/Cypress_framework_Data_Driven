# Cypress Framework

E2E + Visual + Accessibility testing framework. **TypeScript · Page Object Model · multi-env · HTML reports · CI-ready.**

Demo target: [saucedemo.com](https://www.saucedemo.com) — login + inventory flow. Repoint via `data/env.json`.

## Quick start

**Prerequisites:** Node LTS (see `.nvmrc` — run `nvm use`), npm.

```bash
# 1. One-command bootstrap: install deps + Cypress binary + check the env is reachable
npm run setup

# 2. Run the whole suite headless against the dev env
npm test

# 3. Or open the interactive runner to watch tests in a browser
npm run open:dev

# 4. Open the HTML report after a run
npm run report:open
```

That's it — the demo specs run against saucedemo out of the box. To point at your own app,
edit `baseUrl` in `data/env.json` (or `npm run data` for the UI).

### Typical workflow (adding a feature test)

```bash
npm run new:test -- Cart --data   # 1. scaffold Page + spec (+ data file & type)
npm run data                       # 2. fill test data in the browser UI
#                                    3. open the new files, replace every // TODO
npm run typecheck && npm run lint && npm test   # 4. verify before committing
```

Day-to-day commands:

| Command                                  | What it does                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `npm test`                               | Full suite, headless, dev env                                          |
| `npm run open:dev`                       | Interactive runner (pick specs, time-travel, debug)                    |
| `npm run test:smoke` / `test:regression` | Run only `@smoke` / `@regression` tagged tests                         |
| `npm run test:manual`                    | Open GUI for `@manual` specs (human steps like PIN/eKYC)               |
| `npm run test:visual`                    | Run `@visual` regression specs (baselines under `cypress/snapshots/`)  |
| `npm run test:staging` / `test:prod`     | Run against another environment                                        |
| `npm run data`                           | Launch the test-data editor UI                                         |
| `npm run data:types`                     | Regenerate `data('...')` autocomplete types (after adding a data file) |
| `npm run new:test -- <Name> [--data]`    | Scaffold a new Page + spec                                             |
| `npm run report:open`                    | Open the HTML report                                                   |
| `npm run typecheck` / `lint` / `format`  | Quality gates (also run on pre-commit)                                 |

Reports land in `cypress/reports/index.html` after a headless run.

## Stack

| Concern       | Tool                                |
| ------------- | ----------------------------------- |
| Runner        | Cypress 15                          |
| Language      | TypeScript (strict)                 |
| Structure     | Page Object Model                   |
| Accessibility | cypress-axe + axe-core              |
| Visual        | @simonsmith/cypress-image-snapshot  |
| Reporting     | cypress-mochawesome-reporter (HTML) |
| Quality       | ESLint + Prettier                   |
| CI            | GitHub Actions                      |

## Structure

```
data/                 # ← single source of test data + env config (JSON, committed)
  env.json            # one row per environment (baseUrl/apiUrl) — editable in the UI
  users.json
config/
  env.ts              # env loader (reads data/env.json, picks row by CYPRESS_ENV)
tools/
  data-server.mjs     # zero-dep local server for the data editor
  data-editor.html    # browser UI to add/edit/delete data
cypress/
  e2e/                # *.cy.ts specs
  pages/              # Page Objects (BasePage + per-page classes)
  support/            # commands.ts, e2e.ts, types.ts, custom command types
  reports/            # HTML report + screenshots (gitignored)
  snapshots/          # visual baselines (committed)
cypress.config.ts     # fixturesFolder -> data/
```

## Test data editor

All test data lives in `data/*.json` (each file is an **array of objects**) and is read by
Cypress via `cy.fixture<T>('<file>')` (`fixturesFolder` points at `data/`).

Edit it through a browser UI — no manual JSON editing needed:

```bash
npm run data          # → http://localhost:5050
```

The editor lists every `data/*.json` file and lets you add/edit/delete records and fields,
create new files, and delete files — all changes write straight back to disk. Booleans render
as checkboxes, numbers as number inputs, types inferred from existing values.

## Environments

Switch with `CYPRESS_ENV` (`dev` | `staging` | `prod`). Each environment is a row in
`data/env.json` (`baseUrl` / `apiUrl`), editable via `npm run data`, and overridable at runtime:

```bash
CYPRESS_ENV=staging BASE_URL=https://my-app.local npm test
```

Copy `.env.example` → `.env` for local overrides.

## Scaffold a new test

Generate a Page + spec from the templates in one command:

```bash
npm run new:test -- Cart              # CartPage.ts + cart.cy.ts
npm run new:test -- CheckoutFlow --data
# → CheckoutFlowPage.ts + checkout-flow.cy.ts (data-driven)
#   + data/checkout-flow.json (seeded) + CheckoutFlowRow type in support/types.ts
```

PascalCase the name; file/spec/data names are derived (`CheckoutFlow` → `checkout-flow`).
Existing files are never overwritten. Then fill the `TODO`s and run the gates. Raw skeletons
live in `templates/` (also copy-pasteable by hand).

## Writing a test

1. Add a Page Object in `cypress/pages/` extending `BasePage`.
2. Keep selectors private inside the page; expose intent-revealing methods.
   Prefer `cy.getBySel('name')` over `cy.get('[data-test="name"]')` for `data-test` hooks.
3. Write the spec in `cypress/e2e/` — chain page methods, assert outcomes.

```ts
import { LoginPage } from '../pages/LoginPage'
import { InventoryPage } from '../pages/InventoryPage'

const login = new LoginPage()
const inventory = new InventoryPage()

it('logs in', { tags: ['@smoke'] }, () => {
  login.visit().login('standard_user', 'secret_sauce')
  inventory.assertLoaded()
  login.checkA11y({ includedImpacts: ['critical'] }) // a11y gate
})
```

## Tags & selective runs

Tests are tagged with `@bahmutov/cy-grep` so you can run a subset:

```ts
it('valid login', { tags: ['@smoke'] }, () => { ... })
describe('Checkout', { tags: '@regression' }, () => { ... })
```

```bash
npm run test:smoke         # only @smoke (fast happy-path gate)
npm run test:regression    # only @regression
npm test                   # everything

# ad-hoc combos:
npx cypress run --env grepTags="@smoke @critical"   # @smoke OR @critical
npx cypress run --env grepTags="@smoke+-@slow"      # @smoke AND NOT @slow
npx cypress run --env grep="login"                  # by title substring
```

CI runs `@smoke` on PRs (fast feedback) and the full suite on pushes to `main`.

> Requires both the plugin (`setupNodeEvents`) and `registerCyGrep()` in `support/e2e.ts` —
> the plugin bridges `--env grepTags` into the runner.

## Manual steps (PIN, eKYC, OTP)

For steps a human must do, pause the test with `cy.manualStep()` and tag the spec `@manual`:

```ts
describe('Login with eKYC', { tags: ['@manual'] }, () => {
  it('verifies identity', () => {
    login.visit().login('user', 'pass')
    cy.manualStep('Complete eKYC in the browser, then press ▶ Resume')
    dashboard.assertLoaded()
  })
})
```

```bash
npm run test:manual    # opens the GUI filtered to @manual — do the step, then Resume
```

- **Interactive** (`cypress open`): pauses; you do the step, then resume.
- **Headless** (`cypress run`): fails fast with a clear message — a manual step never silently passes.
- `@manual` specs are **excluded from `npm test` and CI** (`grepTags=-@manual`), so they never block the pipeline.

## Auth & test data

- `cy.login(username, password)` performs a UI login and lands on the inventory page.
- Users live in `data/users.json`, typed via `cypress/support/types.ts`
  (`User` / `UserRoster`). Load with `cy.fixture<UserRoster>('users')`, look up with
  `byRole(users, 'standard')`.
- The roster is the seed for data-driven tests (see below).

> saucedemo uses client-side routing (protected pages 404 on direct hit), so login goes
> through the UI. For apps with deep-linking/SSR, wrap `cy.login` in `cy.session(...)` to
> cache auth across tests.

## Data-driven tests

Specs generate one `it()` per record by iterating data at **load time**. Add a record via the
editor and its test case appears automatically — no spec changes.

```ts
import { users } from '../support/data' // static import (sync) — see note below

users.forEach((user) => {
  it(`${user.role}: ${user.canLogin ? 'logs in' : 'is rejected'}`, () => {
    login.login(user.username, user.password)
    user.canLogin ? inventory.assertLoaded() : login.assertError(user.error ?? '')
  })
})
```

### Data loader & helpers (`support/data.ts`)

Every `data/*.json` is auto-loaded at bundle time — **drop a file in `data/` and use it, no
wiring**. `cy.fixture` is async and can't drive `it()` titles, so generation uses these static
imports (same files the editor writes).

```ts
import { data, findIn, filterIn } from '../support/data'

data<User[]>('users') // whole file
findIn<User>('users', (u) => u.role === 'lockedOut') // one record (throws if none)
filterIn<User>('users', (u) => u.canLogin) // many records (search)
filterIn<User>('users', (u) => u.username.includes('glitch')) // substring search
```

- Dataset names are typed (`DataFile`, auto-generated by `npm run data:types`) — typos fail at
  compile time and names autocomplete. Re-run it after adding a `data/*.json` file.
- Pass the type via generic (`data<T>`) for autocomplete/checks on the result.
- Works on **any** data file the same way: `findIn<LoginCase>('login', (r) => r.TCID === 'TC001')`.
- `users` is also exported pre-typed for convenience: `import { users } from '../support/data'`.

See `cypress/e2e/data-helpers.cy.ts` for a runnable demo of each helper.

### Two data-driven styles (both runnable)

- **Roster-driven** (`login.cy.ts` over `data/users.json`) — one test per entity/user.
- **Test-case-driven** (`login-cases.cy.ts` over `data/login.json`) — one test per `TCID`,
  each row carrying its own input + expected result (`expectSuccess` / `error`). Add a TCID
  row via `npm run data` and a new test appears automatically.

## Visual & A11y notes

- **Visual:** tag specs `@visual` and run `npm run test:visual`. First run creates baselines
  under `cypress/snapshots/` (**commit them**); diffs land in `__diff_output__/` (gitignored).
  Threshold: 2% (`support/e2e.ts`). Excluded from default/CI runs because baselines are
  machine-specific (font rendering differs across OSes) — run them on a consistent environment.
- **A11y:** `cy.checkAccessibility(context?, options?)` injects axe and asserts.
  Gate by severity via `includedImpacts`; all violations are logged to the terminal.
