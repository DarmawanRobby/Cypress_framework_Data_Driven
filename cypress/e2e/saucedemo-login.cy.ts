import { SauceLoginPage } from '../pages/saucedemo/SauceLoginPage'
import { InventoryPage } from '../pages/saucedemo/InventoryPage'
import { data } from '../support/data'
import type { SauceLoginCase } from '../support/types'

// Targets saucedemo.com — override baseUrl locally (see saucedemo-checkout.cy.ts).
const BASE = 'https://www.saucedemo.com'

const login = new SauceLoginPage()
const inventory = new InventoryPage()

// One test per row in data/saucedemo/users.json — add a TCID via `npm run data`
// and a new test appears here automatically (no spec change).
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

  it(
    'has no critical accessibility violations on the login page',
    { tags: ['@regression'] },
    () => {
      login.checkA11y({ includedImpacts: ['critical'] })
    },
  )
})
