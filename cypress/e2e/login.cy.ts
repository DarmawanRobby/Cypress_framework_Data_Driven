import { LoginPage } from '../pages/LoginPage'
import { SecureAreaPage } from '../pages/SecureAreaPage'

const login = new LoginPage()
const secure = new SecureAreaPage()

// Happy-path smoke: log in with the valid credentials, then log back out.
describe('Login flow', () => {
  it('logs in and out with valid credentials', { tags: ['@smoke'] }, () => {
    login.visit().login('student', 'Password123')
    secure.assertLoaded().logout()
    cy.location('pathname').should('include', '/practice-test-login')
  })
})
