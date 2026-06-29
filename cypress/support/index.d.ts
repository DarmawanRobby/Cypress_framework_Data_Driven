/// <reference types="cypress" />
/// <reference types="cypress-axe" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Inject axe-core and assert there are no accessibility violations.
       * @example cy.checkAccessibility()
       */
      checkAccessibility(
        context?: Parameters<Chainable['checkA11y']>[0],
        options?: Parameters<Chainable['checkA11y']>[1],
      ): Chainable<void>

      /**
       * Log in via the UI with session caching.
       * @example cy.login('standard_user', 'secret_sauce')
       */
      login(username: string, password: string): Chainable<void>

      /**
       * Shorthand for `cy.get('[data-test="..."]')`.
       * @example cy.getBySel('login-button').click()
       */
      getBySel(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Pause for a manual step (PIN, eKYC, OTP). Interactive only — fails fast
       * in headless. Use on `@manual`-tagged specs.
       * @example cy.manualStep('Enter the PIN sent to your phone, then resume')
       */
      manualStep(instruction: string): Chainable<void>
    }
  }
}

export {}
