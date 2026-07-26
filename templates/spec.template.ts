// ─────────────────────────────────────────────────────────────────────────────
// SPEC TEMPLATE (simple — fixed inputs)
// Copy to:  cypress/e2e/<feature>.cy.ts
// Use when: the scenario isn't driven by a data file.
// ─────────────────────────────────────────────────────────────────────────────
import { TemplatePage } from '../pages/TemplatePage' // TODO: your page
import { Step } from '../support/step' // optional — labels phases in the `cypress open` report

const page = new TemplatePage()

describe('TODO: feature name', () => {
  beforeEach(() => {
    // If the page isn't directly reachable (auth gate / SPA routing that 404s on
    // direct nav), don't visit() it — log in and navigate to it via the UI instead.
    page.visit()
  })

  it('TODO: what this verifies', { tags: ['@regression'] }, () => {
    page.assertLoaded()
    // Optional: Step('…') marks a phase in the interactive report; add { shot: true }
    // to embed a screenshot (handy for manual OTP/eKYC). Delete Step + import if unused.
    Step('TODO: describe this phase')
    // TODO: drive actions + assertions through page methods (no raw selectors)
  })
})
