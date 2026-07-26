# Cypress Framework

E2E + Visual + Accessibility testing framework. **TypeScript · Page Object Model · multi-env · HTML reports · CI-ready.**

Target: [practicetestautomation.com](https://practicetestautomation.com/practice/) — a public
practice site. The suite drives its **Test Login Page** (valid/invalid credential cases) end to
end. Repoint via `data/env.json`.

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

That's the whole setup. The demo login specs run against practicetestautomation.com out of the box
(`npm test`). To target your own app, edit `baseUrl` in `data/env.json` (or `npm run data` for the
UI) and add specs — see [Scaffold a new test](#scaffold-a-new-test).

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
| `npx cypress open`                       | Open interactive runner; each spec generates an updated report         |
| `npm run test:smoke` / `test:regression` | Run only `@smoke` / `@regression` tagged tests                         |
| `npm run test:manual`                    | Open GUI for `@manual` specs (human steps like PIN/eKYC)               |
| `npm run test:visual`                    | Run `@visual` regression specs (baselines under `cypress/snapshots/`)  |
| `npm run test:staging` / `test:prod`     | Run against another environment                                        |
| `npm run data`                           | Launch the test-data editor UI                                         |
| `npm run data:types`                     | Regenerate `data('...')` autocomplete types (after adding a data file) |
| `npm run new:test -- <Name> [--data]`    | Scaffold a new Page + spec                                             |
| `npm run report:open`                    | Open the HTML report                                                   |
| `npm run test:report`                    | Run the suite and open the generated HTML report                       |
| `npm run typecheck` / `lint` / `format`  | Quality gates (also run on pre-commit)                                 |

Reports land in `cypress/reports/index.html`.

## Reports

Two report paths write to the same `cypress/reports/index.html` ("the latest report"), so
`npm run report:open` always opens whichever ran last:

| Mode                          | Report                                                                               | Contents                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `cypress run` (headless / CI) | **mochawesome**                                                                      | tests, charts, screenshots on failure, **video** per spec                                                  |
| `cypress open` (interactive)  | **custom bridge** ([scripts/open-report-writer.mjs](scripts/open-report-writer.mjs)) | per-test command log grouped into phases, embedded screenshots, filters; auto-opens when you close Cypress |

Why two: Cypress only runs the configured `reporter` in `cypress run`, **never** in `cypress open`.
So in open mode [cypress/support/e2e.ts](cypress/support/e2e.ts) collects each test's command log in
the browser and hands it to the `recordOpenReport` task, which renders the HTML. Video records only
in `cypress run` (`video: true`) — Cypress can't record in open mode.

> **Gotcha — don't reintroduce:** do **not** enable `experimentalInteractiveRunEvents` + the
> reporter's `after:run` in open mode. It crashes the Electron/Chrome tab with "Expected DataContext
> to already have been set via setCtx" ([cypress-io/cypress#27335](https://github.com/cypress-io/cypress/issues/27335)) — browser-independent, not an app bug.

### `Step()` — labelled steps in the report

Mark phases in a spec (or Page Object) so the interactive report reads as human steps instead of raw
commands — ideal for manual flows (OTP / eKYC):

```ts
import { Step } from '../support/step' // '../../support/step' from cypress/pages/**

Step('Add products to cart') // phase marker in the command log
Step('Enter OTP', { shot: true }) // + a viewport screenshot embedded in the report
```

`Step` is queued (via `cy.then`) so it logs in execution order; call it as a statement (it returns
`void`, not chainable). Screenshots land in the report's right-hand "Capture" column, each labelled
with its phase.

## Stack

| Concern       | Tool                                                                  |
| ------------- | --------------------------------------------------------------------- |
| Runner        | Cypress 15                                                            |
| Language      | TypeScript (strict)                                                   |
| Structure     | Page Object Model                                                     |
| Accessibility | cypress-axe + axe-core                                                |
| Visual        | @simonsmith/cypress-image-snapshot                                    |
| Reporting     | cypress-mochawesome-reporter (run) + custom interactive report (open) |
| Quality       | ESLint + Prettier                                                     |
| Tagging       | @bahmutov/cy-grep                                                     |
| Git hooks     | husky + lint-staged (pre-commit)                                      |
| CI            | GitHub Actions                                                        |

## Structure

```
data/                 # ← single source of test data + env config (JSON, committed)
  env.json            # one row per environment (baseUrl/apiUrl) — editable in the UI, pinned at root
  login.json          # login test cases (test-case-driven spec)
  <folder>/*.json     # optional subfolders to organize data — data<T>('folder/name')
config/
  env.ts              # env loader (reads data/env.json, picks row by TEST_ENV)
tools/
  data-server.mjs     # zero-dep local server for the data editor
  data-editor.html    # browser UI: folder tree, search, add/rename/move/delete data
templates/            # skeletons used by `npm run new:test`
scripts/              # setup, data:types, new:test, report:open helpers
  cypress.mjs         # launcher: strips ELECTRON_RUN_AS_NODE, GPU flags, auto-opens report
  open-report-writer.mjs  # renders the interactive (cypress open) HTML report
cypress/
  e2e/                # *.cy.ts specs
  pages/              # Page Objects (BasePage + per-page classes)
  support/            # commands.ts, e2e.ts, types.ts, data.ts, step.ts, *.d.ts
  reports/            # HTML report + screenshots (gitignored)
  snapshots/          # visual baselines (committed)
cypress.config.ts
.github/ · .husky/    # CI workflow · pre-commit hook
BACKLOG.md            # tracked follow-up improvements
```

## Test data editor

All test data lives in `data/**/*.json` (each file is an **array of objects**, optionally nested
in subfolders) and is read in specs through the typed `data()` loader (see
[Data-driven tests](#data-driven-tests)).

Edit it through a browser UI — no manual JSON editing needed:

```bash
npm run data          # → http://localhost:5050
```

The sidebar shows a collapsible folder tree with a search box for files and another for rows.
Click **⋮** on a folder for **+ Add file** / **✎ Rename or Move** / **✕ Delete** (folders must be
empty to delete); click **⋮** on a file for **✎ Rename or Move** / **✕ Delete**. New files/folders
can also be created by typing a `dir/name` path in the **+ File** / **+ Folder** forms at the
bottom — nesting is created automatically. Records and fields are edited inline: booleans render
as checkboxes, numbers as number inputs, types inferred from existing values. All changes write
straight back to disk.

> `data/env.json` is pinned at the top level — the editor blocks renaming, moving, or deleting it
> because `config/env.ts` hardcodes that path.

**Adding a new file** (not just a new row)? Run `npm run data:types` afterward so
`data<T>('name')` recognizes it — see [Data loader & helpers](#data-loader--helpers-supportdatats).

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

npm run new:test -- checkout/CheckoutFlow --data
# → same Page/spec as above (flat) but data/checkout/checkout-flow.json —
#   a folder prefix only affects where the data file lands
```

PascalCase the name; file/spec/data names are derived (`CheckoutFlow` → `checkout-flow`).
A `<dir>/<Name>` prefix nests **only the data file** (`data<T>('checkout/checkout-flow')`) —
Page Objects and specs stay flat since only `data/` supports subfolders. Existing files are
never overwritten. Then fill the `TODO`s and run the gates. Raw skeletons live in `templates/`
(also copy-pasteable by hand).

## Writing a test

1. Add a Page Object in `cypress/pages/` extending `BasePage`.
2. Keep selectors private inside the page; expose intent-revealing methods.
   Prefer `cy.getBySel('name')` over `cy.get('[data-test="name"]')` for `data-test` hooks.
3. Write the spec in `cypress/e2e/` — chain page methods, assert outcomes.

```ts
import { HomePage } from '../pages/HomePage'

const home = new HomePage()

it('loads the homepage', { tags: ['@smoke'] }, () => {
  home.visit().assertLoaded()
  home.checkA11y({ includedImpacts: ['critical'] }) // a11y gate
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
describe('Checkout with 3-D Secure', { tags: ['@manual'] }, () => {
  it('pauses for a manual OTP step, then continues', () => {
    checkout.visit().submitPayment(card)
    cy.manualStep('Complete the 3-D Secure / OTP step in the browser, then press ▶ Resume')
    checkout.assertOrderConfirmed()
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

The login flow is encapsulated in `cypress/pages/LoginPage.ts` (`login(username, password)` +
`assertError`) and `SecureAreaPage.ts` (the logged-in page). Specs compose them; the test cases
live in `data/login.json` (typed by `LoginCase` in `cypress/support/types.ts`).

- Reusable UI actions belong on the Page Object (`return this` for chaining). Promote one to a
  `cy.login()` custom command in `support/commands.ts` only if many specs need it.
- Keep credentials/account fixtures in `data/*.json` — same pattern as any other data-driven
  dataset (see below).
- If the app supports deep-linking/SSR, wrap login in `cy.session([user, pass], () => {...},
{ cacheAcrossSpecs: true })` to cache auth instead of logging in through the UI every test.

## Data-driven tests

Specs generate one `it()` per record by iterating data at **load time**. Add a record via the
editor and its test case appears automatically — no spec changes.

This is exactly how `cypress/e2e/login-cases.cy.ts` works over `data/login.json`:

```ts
import { data } from '../support/data'
import type { LoginCase } from '../support/types'

const cases = data<LoginCase[]>('login') // static import (sync) — see note below

cases.forEach((tc) => {
  it(`${tc.TCID} — ${tc.desc}`, { tags: tc.expectSuccess ? ['@smoke'] : ['@regression'] }, () => {
    login.login(tc.username, tc.password)
    tc.expectSuccess ? secure.assertLoaded() : login.assertError(tc.error ?? '')
  })
})
```

### Data loader & helpers (`support/data.ts`)

Every `data/**/*.json` (subfolders included) is auto-loaded at bundle time — **drop a file
anywhere under `data/` and use it, no wiring**. A nested file is addressed by its path relative to
`data/`, e.g. `data<T>('checkout/cases')` for `data/checkout/cases.json`. `cy.fixture` is async
and can't drive `it()` titles, so generation uses these static imports (same files the editor
writes).

```ts
import { data, findIn, filterIn } from '../support/data'

data<LoginCase[]>('login') // whole file
findIn<LoginCase>('login', (r) => r.TCID === 'TC001') // one record (throws if none)
filterIn<LoginCase>('login', (r) => !r.expectSuccess) // many records (search)
filterIn<LoginCase>('login', (r) => r.username.includes('student')) // substring search
```

- Dataset names are typed (`DataFile`, auto-generated by `npm run data:types`) — typos fail at
  compile time and names autocomplete. Re-run it after adding a `data/*.json` file (nested too).
- Pass the type via generic (`data<T>`) for autocomplete/checks on the result.
- Works on **any** data file the same way, including nested ones: `data<T>('checkout/cases')`.

### Choosing a data-driven style

- **Roster-driven** — one JSON file of entities (users, products…), one test per entity.
- **Test-case-driven** — one JSON file of `{ TCID, ...input, ...expected }` rows, one test per
  `TCID`, each row carrying its own input + expected result. Add a row via `npm run data` and a
  new test appears automatically — no spec changes.

Both use the same `data<T>('name')` loader; pick whichever matches the scenario. `login-cases.cy.ts`
is the test-case-driven example — copy its shape for new datasets.

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
- Run `npm run data:types` after adding/removing a `data/*.json` file (nested subfolders too).
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

## **Notes For Claude**

- **Root cause of the "report never generated" bug (solved):** the real culprit was **not** the
  reporter config — it was the `ELECTRON_RUN_AS_NODE=1` env var that VSCode's extension-host
  terminals (incl. Claude Code / Cursor integrated shells) inject. That flag forces Cypress's
  bundled Electron to boot as plain Node, which surfaces as a cryptic `MODULE_NOT_FOUND` and no
  HTML report. Fixed by [scripts/cypress.mjs](scripts/cypress.mjs) — a thin launcher that strips
  the var before spawning Cypress; **all `cypress` npm scripts now route through it**. In a VSCode
  terminal always use `npm run cy:open` / `npm run open:dev` (not a bare `npx cypress open`, which
  bypasses the wrapper and still inherits the bad env var). A normal Terminal.app/iTerm shell
  never has the var, so raw `npx` works there.

- **Report generation:** see [Reports](#reports) for the full picture. Short version: `cypress run`
  uses **mochawesome**; `cypress open` uses a **custom bridge** — the mochawesome reporter never runs
  in open mode, so [cypress/support/e2e.ts](cypress/support/e2e.ts) collects the command log per test
  and the `recordOpenReport` task renders [scripts/open-report-writer.mjs](scripts/open-report-writer.mjs).
  The earlier `experimentalInteractiveRunEvents` + `afterRunHook()` approach was removed — it crashed
  the tab (cypress-io/cypress#27335). `e2e.ts` flushes the report after **every test** (not just once
  per spec) so completed tests survive closing the browser mid-spec, and drops setup-only `route`
  (cy.intercept) logs from the report.

- **Quick verification commands** (all green as of last check — 10/10 specs, report at
  `cypress/reports/index.html`):

```bash
npm run typecheck
npm run lint
npm test                # headless run (generates cypress/reports/index.html)
npm run cy:open         # interactive runner — report regenerates after each spec
```

1. (data-driven) add `data/<name>.json` + a type in `support/types.ts`
2. Page Object in `cypress/pages/` (extends `BasePage`)
3. Spec in `cypress/e2e/` (compose page + `data()`, tag the `it()`)
4. `npm run typecheck && npm run lint && npm test`

Or scaffold steps 1–3: `npm run new:test -- <Name> [--data]`.
