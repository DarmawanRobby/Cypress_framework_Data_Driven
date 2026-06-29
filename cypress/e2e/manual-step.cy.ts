import { LoginPage } from '../pages/LoginPage'
import { InventoryPage } from '../pages/InventoryPage'

const login = new LoginPage()
const inventory = new InventoryPage()

// @manual specs need a human → run with `npm run test:manual` (cypress open).
// They're excluded from `npm test` and CI so they never block the pipeline.
describe('Login with a manual step', { tags: ['@manual'] }, () => {
  it('pauses for a manual PIN/eKYC step, then continues', () => {
    login.visit()
    login.login('standard_user', 'secret_sauce')

    // ── Real flow: here the user would enter a PIN / complete eKYC by hand. ──
    cy.manualStep('Enter the PIN / complete eKYC in the browser, then press ▶ Resume')

    inventory.assertLoaded()
  })
})
