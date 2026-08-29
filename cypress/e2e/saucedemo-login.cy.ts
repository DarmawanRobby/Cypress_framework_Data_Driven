import { SauceLoginPage } from '../pages/saucedemo/SauceLoginPage'
import { InventoryPage } from '../pages/saucedemo/InventoryPage'
import { data } from '../support/data'
import type { SauceLoginCase } from '../support/types'

// Targets saucedemo.com — override baseUrl locally (see saucedemo-checkout.cy.ts).
const BASE = 'https://www.saucedemo.com'

// Generic, field-agnostic rejection message — the only thing saucedemo reveals
// on any credential mismatch (used by the non-disclosure check, SD18).
const NO_MATCH = 'Epic sadface: Username and password do not match any user in this service'

const login = new SauceLoginPage()
const inventory = new InventoryPage()

// One test per row in data/saucedemo/users.json — add a TCID via `npm run data`
// and a new test appears here automatically (no spec change). Covers SD01–SD10.
const cases = data<SauceLoginCase[]>('saucedemo/users')

describe('Sauce Demo — login (data-driven by TCID)', () => {
  before(() => {
    Cypress.config('baseUrl', BASE)
  })

  beforeEach(() => {
    login.visit()
  })

  cases.forEach((tc) => {
    const tags = tc.expectSuccess ? ['@smoke'] : ['@regression']
    it(`${tc.TCID} — ${tc.desc}`, { tags }, () => {
      login.login(tc.username, tc.password)
      if (tc.expectSuccess) {
        inventory.assertLoaded()
      } else {
        login.assertError(tc.error ?? '')
      }
    })
  })

  // ── Behavioral cases (SD11–SD19) — assertions that a data row can't express ──

  it('SD11 — password field is masked (type="password")', { tags: ['@regression'] }, () => {
    login.assertPasswordMasked()
  })

  it('SD12 — the X button dismisses the error message', { tags: ['@regression'] }, () => {
    login.login('ghost_user', 'secret_sauce').assertError(NO_MATCH).dismissError()
  })

  it('SD13 — logout ends the session and returns to login', { tags: ['@regression'] }, () => {
    login.loginAs('standard_user', 'secret_sauce').logout()
  })

  it(
    'SD14 — direct access to /inventory.html without a session is blocked',
    {
      tags: ['@regression'],
    },
    () => {
      // Verified live: the guard redirects back to login with an error banner
      // ("You can only access '/inventory.html' when you are logged in") — the
      // block is app-level, not a 404. See InventoryPage.assertDirectAccessBlocked.
      inventory.assertDirectAccessBlocked()
    },
  )

  it(
    'SD15 — back button after logout does not restore the session',
    {
      tags: ['@regression'],
    },
    () => {
      login.loginAs('standard_user', 'secret_sauce').logout()
      cy.go('back')
      // The cookie is not honored on reload, so history-back lands on login, not inventory.
      login.assertLoaded()
    },
  )

  it('SD16 — SQL injection payload is rejected safely', { tags: ['@regression'] }, () => {
    login.login("standard_user' OR '1'='1", "' OR '1'='1' --").assertError(NO_MATCH)
    cy.location('pathname').should('not.include', '/inventory')
  })

  it('SD17 — XSS payload is not executed', { tags: ['@regression'] }, () => {
    const onAlert = cy.stub().as('alert')
    cy.on('window:alert', onAlert)
    login.login("<script>alert('xss')</script>", 'secret_sauce').assertError(NO_MATCH)
    cy.get('@alert').should('not.have.been.called')
    cy.location('pathname').should('not.include', '/inventory')
  })

  it('SD18 — error does not disclose which field is wrong', { tags: ['@regression'] }, () => {
    // A valid user with a wrong password and an unknown user must return the
    // identical generic message — otherwise an attacker could enumerate users.
    login.login('standard_user', 'wrong_password').assertError(NO_MATCH)
    login.visit()
    login.login('ghost_user', 'wrong_password').assertError(NO_MATCH)
  })

  it(
    'SD19 — login page has no critical accessibility violations',
    {
      tags: ['@regression'],
    },
    () => {
      login.checkA11y({ includedImpacts: ['critical'] })
    },
  )
})
