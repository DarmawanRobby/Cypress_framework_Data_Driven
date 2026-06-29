import { LoginPage } from '../pages/LoginPage'

const login = new LoginPage()

// @visual baselines are machine-specific (font rendering differs across OSes),
// so these are excluded from default/CI runs. Run locally with `npm run test:visual`;
// the first run creates the baseline under cypress/snapshots/ (commit it).
describe('Visual regression', () => {
  it('login page matches the baseline', { tags: ['@visual'] }, () => {
    login.visit()
    cy.getBySel('login-button').should('be.visible') // ensure the page rendered
    cy.matchImageSnapshot('login-page')
  })
})
