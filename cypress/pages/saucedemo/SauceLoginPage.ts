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
}
