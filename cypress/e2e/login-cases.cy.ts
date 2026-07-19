import { LoginPage } from '../pages/LoginPage'
import { SecureAreaPage } from '../pages/SecureAreaPage'
import { data } from '../support/data'
import type { LoginCase } from '../support/types'

const login = new LoginPage()
const secure = new SecureAreaPage()

// One test per row in data/login.json — add a TCID via `npm run data`
// and a new test appears here automatically (no spec change).
const cases = data<LoginCase[]>('login')

describe('Login (data-driven by TCID)', () => {
  beforeEach(() => {
    login.visit()
  })

  cases.forEach((tc) => {
    const tags = tc.expectSuccess ? ['@smoke'] : ['@regression']
    it(`${tc.TCID} — ${tc.desc}`, { tags }, () => {
      login.login(tc.username, tc.password)
      if (tc.expectSuccess) {
        secure.assertLoaded()
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
