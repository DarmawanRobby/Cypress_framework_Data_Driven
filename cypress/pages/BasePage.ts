/**
 * Base class for all Page Objects.
 * Holds shared navigation/assertion helpers; subclasses define `path` + selectors.
 */
export abstract class BasePage {
  /** Route relative to baseUrl, e.g. '/' or '/login'. */
  abstract readonly path: string

  visit(): this {
    cy.visit(this.path)
    return this
  }

  title(): Cypress.Chainable<string> {
    return cy.title()
  }

  /** Inject axe + assert no a11y violations on the current page. */
  checkA11y(options?: Parameters<typeof cy.checkAccessibility>[1]): this {
    cy.checkAccessibility(undefined, options)
    return this
  }
}
