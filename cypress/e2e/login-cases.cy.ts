import { LoginPage } from '../pages/LoginPage'
import { InventoryPage } from '../pages/InventoryPage'
import { data } from '../support/data'
import type { LoginCase } from '../support/types'

const login = new LoginPage()
const inventory = new InventoryPage()

// Test cases come straight from data/login.json — add a row via `npm run data`
// and a new TCID test appears here automatically.
const cases = data<LoginCase[]>('login')

describe('Login test cases (data-driven by TCID)', () => {
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
})
