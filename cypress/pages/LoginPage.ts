import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  readonly path = '/'

  login(username: string, password: string): this {
    // Cypress .type('') throws — skip empty fields so negative cases work.
    if (username) cy.getBySel('username').type(username)
    if (password) cy.getBySel('password').type(password, { log: false })
    cy.getBySel('login-button').click()
    return this
  }

  assertError(message: string): this {
    cy.getBySel('error').should('be.visible').and('contain.text', message)
    return this
  }
}
