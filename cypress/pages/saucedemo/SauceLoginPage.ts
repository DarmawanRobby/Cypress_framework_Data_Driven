import { Step } from '../../support/step'
import { BasePage } from '../BasePage'
import { InventoryPage } from './InventoryPage'

/**
 * Sauce Demo login page — https://www.saucedemo.com/
 * Users: standard_user / locked_out_user / problem_user / … ; password: secret_sauce.
 * A valid login navigates to /inventory.html; failures show `[data-test="error"]`.
 */
export class SauceLoginPage extends BasePage {
  readonly path = '/'

  // Stable data-test hooks exist, but ids are just as stable here — keep selectors local.
  private readonly el = {
    username: '[data-test="username"]',
    password: '[data-test="password"]',
    submit: '[data-test="login-button"]',
    error: '[data-test="error"]',
    errorButton: '[data-test="error-button"]',
  }

  login(username: string, password: string): this {
    // Cypress .type('') throws — skip empty fields so negative cases still run.
    if (username) {
      cy.get(this.el.username).clear()
      cy.get(this.el.username).type(username)
    }
    if (password) {
      cy.get(this.el.password).clear()
      cy.get(this.el.password).type(password, { log: false })
    }
    Step('Login as standard_user', { shot: true })
    cy.get(this.el.submit).click()
    return this
  }

  /** Log in and assert we landed on the inventory page. */
  loginAs(username: string, password: string): InventoryPage {
    this.login(username, password)
    return new InventoryPage().assertLoaded()
  }

  assertError(message: string): this {
    cy.get(this.el.error).should('be.visible').and('have.text', message)
    return this
  }

  /** No error banner is present (e.g. after dismissing it or on a fresh page). */
  assertNoError(): this {
    cy.get(this.el.error).should('not.exist')
    return this
  }

  /** Dismiss the error banner via its X button and assert it's gone. */
  dismissError(): this {
    cy.get(this.el.errorButton).click()
    return this.assertNoError()
  }

  /** The password field masks its input (`type="password"`). */
  assertPasswordMasked(): this {
    cy.get(this.el.password).should('have.attr', 'type', 'password')
    return this
  }

  /** We are on the login page with the form ready (used after logout / session loss). */
  assertLoaded(): this {
    cy.location('pathname').should('eq', '/')
    cy.get(this.el.username).should('be.visible')
    cy.get(this.el.submit).should('be.visible')
    return this
  }

  /**
   * The app-level guard error shown when a protected page is deep-linked
   * without a session — saucedemo redirects to login and renders this message.
   */
  assertGuardError(page: string): this {
    cy.get(this.el.error)
      .should('be.visible')
      .and('contain', `You can only access '${page}' when you are logged in`)
    return this
  }
}
