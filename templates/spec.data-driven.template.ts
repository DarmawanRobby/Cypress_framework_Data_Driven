// ─────────────────────────────────────────────────────────────────────────────
// SPEC TEMPLATE (data-driven — one test per row)
// Copy to:  cypress/e2e/<feature>.cy.ts
// Use when: inputs/expectations come from a data/<name>.json file.
// Prereq:   data/<name>.json exists (npm run data) + a type in support/types.ts
// ─────────────────────────────────────────────────────────────────────────────
import { TemplatePage } from '../pages/TemplatePage' // TODO: your page
import { data } from '../support/data'
import type { TemplateRow } from '../support/types' // TODO: your type

const page = new TemplatePage()

// 'TODO' = file name of data/<name>.json (auto-loaded; no wiring needed)
const rows = data<TemplateRow[]>('TODO')

describe('TODO: feature (data-driven)', () => {
  beforeEach(() => {
    page.visit()
  })

  // Add a row via `npm run data` → a new test appears here automatically.
  rows.forEach((row) => {
    // TODO: use a stable field for the title, e.g. row.TCID / row.id
    it(`${row.id}: TODO describe the case`, { tags: ['@regression'] }, () => {
      page.assertLoaded()
      // TODO: feed row.<field> as inputs, assert the expected outcome
    })
  })
})
