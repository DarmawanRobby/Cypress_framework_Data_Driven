# Upgrading Cypress — compatibility checklist

This framework leans on a few Cypress touchpoints that are **not covered by semver**
(internal events, experimental/deprecation-tied config flags, an Electron/OS
workaround, and plugin peer ranges). Most of them fail **silently or only on a new
major**, so run through this list on every Cypress bump — especially a major.

Two safety nets already catch the highest-risk breakage automatically:

- **Runtime self-check** — `cypress/support/e2e.ts` emits a probe log once per spec in
  `cypress open` and shouts (`[report-bridge] ⚠`) if the internal log events stopped
  feeding the report.
- **Smoke test** — `cypress/e2e/framework-compat.cy.ts` (`@smoke`, runs in `npm test`)
  asserts the internal log + screenshot APIs the report bridge depends on still fire,
  so **CI goes red** if an upgrade quietly kills them.

Run `npm run typecheck && npm run lint && npm test` after any upgrade.

---

## 1. Interactive report bridge — internal APIs (🔴 highest risk)

**Where:** `cypress/support/e2e.ts`, `scripts/open-report-writer.mjs`
**Depends on (unversioned):**

- `Cypress.on('log:added')` / `Cypress.on('log:changed')` — internal command-log events.
- `Cypress.log({ name, message })` — shape of the emitted log entry.
- `Cypress.Screenshot.defaults({ onAfterScreenshot })` — screenshot path callback.
- String literals for log names: `'screenshot'` (pairing) and `'route'` (noise filter).

**Symptom if broken:** tests stay green but the `cypress open` report loses all
steps/screenshots. The self-check + smoke test above are designed to make this loud.

**On upgrade:** run a spec in `cypress open`, confirm no `[report-bridge] ⚠` in the
console and that steps/screenshots still render in `cypress/reports/index.html`.

## 2. Experimental / deprecation-tied config flags (🟡)

**Where:** `cypress.config.ts`

- `experimentalMemoryManagement: true` — experimental flags get renamed/removed/graduated
  between majors.
- `allowCypressEnv: true` — a deprecation-path flag (kept because
  `@simonsmith/cypress-image-snapshot` still reads `Cypress.env()` internally).

**Symptom if broken:** Cypress **fails config validation on startup** (loud, easy fix) —
e.g. how `experimentalInteractiveRunEvents` was already removed (see the NOTE comment in
`cypress.config.ts` explaining why it must stay off).

**On upgrade:** read the version's migration/changelog; drop or rename any flag it no
longer accepts. Re-check whether image-snapshot still needs `allowCypressEnv`.

## 3. Plugin peer ranges (🟡)

Check each plugin's `peerDependencies.cypress` still includes the new Cypress major
(`npm ls` warns on mismatch):

| Plugin                               | Peer range (at Cypress 15) | Note                                   |
| ------------------------------------ | -------------------------- | -------------------------------------- |
| `cypress-axe`                        | `^10 … \|\| ^15`           | **Caps at ^15 — must bump for Cy 16.** |
| `@bahmutov/cy-grep`                  | `>=8`                      | open-ended                             |
| `cypress-mochawesome-reporter`       | `>=6.2.0`                  | open-ended                             |
| `@simonsmith/cypress-image-snapshot` | `>13.0.0`                  | open-ended                             |

## 4. Electron / OS workaround (🟢)

**Where:** `scripts/cypress.mjs` (`ELECTRON_EXTRA_LAUNCH_ARGS`) + `before:browser:launch`
in `cypress.config.ts`.

The `--disable-gpu*` flags keep the Electron renderer alive on macOS 26 (Tahoe); without
them the `cypress open` tab crashes ("electron tab closed unexpectedly"). Cypress bundles
a newer Electron over time, so a future version may make these unnecessary — but **do not
remove them without re-testing `cypress open` on the current macOS.**

## 5. Node engines (🟢)

**Where:** `package.json` → `engines.node` (mirrors Cypress 15's supported range).

**On upgrade:** compare against `node -e "console.log(require('cypress/package.json').engines)"`
and update `engines.node` to match.
