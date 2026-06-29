# Cypress Framework

E2E + Visual + Accessibility testing framework. **TypeScript · Page Object Model · multi-env · HTML reports · CI-ready.**

Demo target: [saucedemo.com](https://www.saucedemo.com) — login + inventory flow. Repoint via `data/env.json`.

## Contents

1. [Setup](#setup) · [Usage](#usage)
2. [Stack](#stack) · [Structure](#structure)
3. [Test data editor](#test-data-editor) · [Environments](#environments) · [Secrets & API](#secrets--api-helper)
4. [Scaffold a new test](#scaffold-a-new-test) · [Writing a test](#writing-a-test)
5. [Tags & selective runs](#tags--selective-runs) · [Manual steps](#manual-steps-pin-ekyc-otp)
6. [Data-driven tests](#data-driven-tests) · [Visual & A11y](#visual--a11y-notes)
7. [Conventions & architecture](#conventions--architecture) — **read this if you're an AI agent or new contributor**

## Setup

**Prerequisites:** [Node LTS](https://nodejs.org) (the version in `.nvmrc`), npm, Git.

```bash
# 1. Clone
git clone https://github.com/DarmawanRobby/Cypress_framework_Data_Driven.git
cd Cypress_framework_Data_Driven

# 2. Match the Node version (optional, if you use nvm)
nvm use

# 3. Bootstrap: installs deps + the Cypress binary + checks the env is reachable
npm run setup
```

That's the whole setup. The demo specs run against saucedemo out of the box.
To point at your own app, edit `baseUrl` in `data/env.json` (or `npm run data` for the UI).

## Usage

```bash
npm test               # run the whole suite headless (dev env)
npm run open:dev       # interactive runner — watch tests in a browser, debug, time-travel
npm run report:open    # open the HTML report after a headless run
```

Then add your own test:

```bash
npm run new:test -- Cart --data   # 1. scaffold Page + spec (+ data file & type)
npm run data                       # 2. fill test data in the browser UI
#                                    3. open the new files, replace every // TODO
npm run typecheck && npm run lint && npm test   # 4. verify before committing
```

### All commands

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
| Tagging       | @bahmutov/cy-grep                   |
| Git hooks     | husky + lint-staged (pre-commit)    |
| CI            | GitHub Actions                      |

## Structure

```
data/                 # ← single source of test data + env config (JSON, committed)
  env.json            # one row per environment (baseUrl/apiUrl) — editable in the UI
  users.json          # user roster (roster-driven specs)
  login.json          # login test cases (test-case-driven specs)
config/
  env.ts              # env loader (reads data/env.json, picks row by TEST_ENV)
tools/
  data-server.mjs     # zero-dep local server for the data editor
  data-editor.html    # browser UI to add/edit/delete data
templates/            # skeletons used by `npm run new:test`
scripts/              # setup, data:types, new:test, report:open helpers
cypress/
  e2e/                # *.cy.ts specs
  pages/              # Page Objects (BasePage + per-page classes)
  support/            # commands.ts, e2e.ts, types.ts, data.ts, *.d.ts
  reports/            # HTML report + screenshots (gitignored)
  snapshots/          # visual baselines (committed)
cypress.config.ts
.github/ · .husky/    # CI workflow · pre-commit hook
BACKLOG.md            # tracked follow-up improvements
```

## Test data editor

All test data lives in `data/*.json` (each file is an **array of objects**) and is read in specs
through the typed `data()` loader (see [Data-driven tests](#data-driven-tests)).

Edit it through a browser UI — no manual JSON editing needed:

```bash
npm run data          # → http://localhost:5050
```

The editor lists every `data/*.json` file and lets you add/edit/delete records and fields,
create new files, and delete files — all changes write straight back to disk. Booleans render
as checkboxes, numbers as number inputs, types inferred from existing values.

## Environments

Switch with `TEST_ENV` (`dev` | `staging` | `prod`). Each environment is a row in
`data/env.json` (`baseUrl` / `apiUrl`), editable via `npm run data`, and overridable at runtime:

```bash
TEST_ENV=staging BASE_URL=https://my-app.local npm test
```

Copy `.env.example` → `.env` for local overrides.

## Secrets & API helper

**Secrets** (credentials, tokens) go in `cypress.env.json` (gitignored) — never in code or `data/`:

```bash
cp cypress.env.example.json cypress.env.json   # then fill it in
```

Cypress auto-loads it into `Cypress.env()`. Read it typed via `secret()`:

```ts
import { secret } from '../support/secrets'
secret('apiPassword') // typed from cypress.env.json
```

**API helper** — drive state through the API instead of the UI where you can (faster, less
flaky). `support/api.ts` wraps `cy.request` (base URL from `data/env.json`, bearer token from
secrets):

```ts
import { api, auth } from '../support/api'
import { secret } from '../support/secrets'

before(() => auth.login(secret('apiUser')!, secret('apiPassword')!)) // cached programmatic login
api.post('/cart', { items: [] }) // seed state for a test
api.del('/cart/123') // teardown
```

> `auth.login` is a **skeleton** — adapt the endpoint and how the token is persisted
> (localStorage/cookie) to your app. Use API setup for state you don't want to test through the UI.

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
  (`User` / `UserRoster`). Load with `data<UserRoster>('users')` (or the pre-typed `users`
  export), look up with `byRole(users, 'standard')`.
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

## Conventions & architecture

> **If you're an AI agent generating code in this repo, this section is the rulebook.**
> Follow it so new tests match the existing structure.

### How it fits together (data flow)

```
data/*.json ──> support/data.ts (typed data() loader) ──> specs (cypress/e2e/*.cy.ts)
   ▲                                                            │ compose
   │ edited by                                                  ▼
npm run data (browser UI)                            Page Objects (cypress/pages/*)
                                                       │ only place selectors live
data/env.json ──> config/env.ts (picks row by TEST_ENV) ──> baseUrl / Cypress.env()
cypress.env.json (secrets) ──> secret() ──> support/api.ts (cy.request setup/teardown)
```

- **Test data + env config** live in `data/*.json` (arrays of objects). Specs read them through
  the typed `data()` loader (`support/data.ts`), **not** `cy.fixture`. The editor and tests share
  the same files.
- **Specs** compose **Page Objects** — a spec describes _behavior_; a page encapsulates
  _interaction_. Selectors live only in pages.
- **Env** is chosen by `TEST_ENV`; `config/env.ts` reads the matching row from `data/env.json`.
  **Secrets** come from `cypress.env.json` (gitignored) via `secret()`.

### Rules — do

- Put selectors **only** in Page Objects; expose intent-revealing methods that `return this`.
- Use `cy.getBySel('x')` for `data-test` hooks.
- Read data with `data<T>('name')` / `findIn<T>` / `filterIn<T>` — always pass the generic `<T>`.
- Tag every `it()`: `@smoke` (critical happy path) or `@regression`; `@manual` / `@visual` for those.
- Derive data-driven test titles from a stable field (`user.role`, `tc.TCID`).
- Use `support/api.ts` for setup/teardown of state you aren't testing through the UI.
- Run `npm run data:types` after adding/removing a `data/*.json` file.
- **Before done:** `npm run typecheck && npm run lint && npm test` — all green.

### Rules — don't

- Don't put test data in specs or a `fixtures/` folder — it goes in `data/`.
- Don't use `cy.fixture` to drive `it()` generation (async — use `data()`).
- Don't use `CYPRESS_ENV` (reserved prefix) — use `TEST_ENV`.
- Don't commit secrets — use `cypress.env.json`.
- Don't hand-edit `cypress/support/data-files.d.ts` (auto-generated).
- Don't bypass the pre-commit hook with `--no-verify` unless intentional.

### Gotchas — don't reintroduce

- Grep is **`@bahmutov/cy-grep`**, NOT `@cypress/grep` v6 (broken `--expose`). Tags need **both**
  `cyGrepPlugin(config)` (in `cypress.config.ts`) and `registerCyGrep()` (in `support/e2e.ts`).
- Visual lib is **`@simonsmith/cypress-image-snapshot` v10** → `cy.matchImageSnapshot` (not the
  old `compareSnapshot`); baselines go to `cypress/snapshots/` via `customSnapshotsDir`.
- `package.json` is `"type": "module"` → no `__dirname` (use `process.cwd()`); tsconfig uses
  `moduleResolution: "bundler"`.

### Add a new test (build order)

1. (data-driven) add `data/<name>.json` + a type in `support/types.ts`
2. Page Object in `cypress/pages/` (extends `BasePage`)
3. Spec in `cypress/e2e/` (compose page + `data()`, tag the `it()`)
4. `npm run typecheck && npm run lint && npm test`

Or scaffold steps 1–3: `npm run new:test -- <Name> [--data]`.
