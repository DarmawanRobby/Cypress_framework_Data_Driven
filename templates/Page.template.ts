// ─────────────────────────────────────────────────────────────────────────────
// PAGE OBJECT TEMPLATE
// Copy to:  cypress/pages/<Name>Page.ts
// Rename:   TemplatePage  →  <Name>Page
// Rule:     selectors stay PRIVATE; methods reveal intent & return `this`.
// ─────────────────────────────────────────────────────────────────────────────
import { BasePage } from './BasePage'

export class TemplatePage extends BasePage {
  // TODO: route relative to baseUrl, e.g. '/', '/cart.html'
  readonly path = '/TODO'

  // TODO: declare selectors here — never put raw selectors in a spec
  private readonly el = {
    heading: '.title',
    // submit: '[data-test="submit"]',
    // itemByName: (name: string) => `[data-item="${name}"]`,
  }

  /** TODO: assert the page is loaded. */
  assertLoaded(): this {
    cy.get(this.el.heading).should('be.visible')
    return this
  }

  // TODO: add actions, e.g.
  // submit(): this {
  //   cy.get(this.el.submit).click()
  //   return this
  // }
}
