// ─────────────────────────────────────────────────────────────────────────────
// SPEC TEMPLATE (simple — fixed inputs)
// Copy to:  cypress/e2e/<feature>.cy.ts
// Use when: the scenario isn't driven by a data file.
// ─────────────────────────────────────────────────────────────────────────────
import { TemplatePage } from '../pages/TemplatePage' // TODO: your page

const page = new TemplatePage()

describe('TODO: feature name', () => {
  beforeEach(() => {
    // If the page isn't directly reachable (auth gate / SPA routing that 404s on
    // direct nav), don't visit() it — log in and navigate to it via the UI instead.
    page.visit()
  })

  it('TODO: what this verifies', { tags: ['@regression'] }, () => {
    page.assertLoaded()
    // TODO: drive actions + assertions through page methods (no raw selectors)
  })
})
