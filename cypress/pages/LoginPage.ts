import { BasePage } from './BasePage'

/**
 * Login page — https://practicetestautomation.com/practice-test-login/
 * Valid credentials: student / Password123. Wrong username/password reveal
 * the `#error` banner; a valid login navigates to /logged-in-successfully/.
 */
export class LoginPage extends BasePage {
  readonly path = '/practice-test-login/'

  // The site uses plain ids (no data-test hooks), so selectors live here.
  private readonly el = {
    username: '#username',
    password: '#password',
    submit: '#submit',
    error: '#error',
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

  assertError(message: string): this {
    cy.get(this.el.error).should('be.visible').and('have.text', message)
    return this
  }
}
