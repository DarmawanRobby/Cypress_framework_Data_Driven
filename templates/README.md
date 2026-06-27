# Templates

Skeletons for building a new test. These are **not** run or type-checked (excluded
from `tsconfig`/eslint) — the placeholder paths/TODOs are resolved once you copy them
to their real location.

## Order to build a new test

| Step | File                                                     | Copy to                                             | When             |
| ---- | -------------------------------------------------------- | --------------------------------------------------- | ---------------- |
| 1    | `data/<name>.json` (via `npm run data`)                  | —                                                   | data-driven only |
| 2    | `type.snippet.ts`                                        | paste into `cypress/support/types.ts`               | data-driven only |
| 3    | `Page.template.ts`                                       | `cypress/pages/<Name>Page.ts`                       | new page         |
| 4    | `spec.template.ts` **or** `spec.data-driven.template.ts` | `cypress/e2e/<feature>.cy.ts`                       | always           |
| 5    | —                                                        | run `npm run typecheck && npm run lint && npm test` | always           |

## Rules baked into the templates

- Selectors live **inside the Page**, never in a spec.
- Page methods return `this` so calls chain.
- Data is read with `data<T>('name')` — auto-loaded, no wiring.
- Every `it()` carries a tag (`@smoke` for critical happy paths, else `@regression`).
