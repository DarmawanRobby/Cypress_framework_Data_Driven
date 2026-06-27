import { LoginPage } from '../pages/LoginPage'
import { InventoryPage } from '../pages/InventoryPage'
import { users } from '../support/data'

const login = new LoginPage()
const inventory = new InventoryPage()

describe('Login (data-driven)', () => {
  beforeEach(() => {
    login.visit()
  })

  // One test per user in data/users.json — add a user via `npm run data`
  // and its case appears here automatically.
  users.forEach((user) => {
    const tags = user.role === 'standard' ? ['@smoke'] : ['@regression']
    it(`${user.role}: ${user.canLogin ? 'logs in' : 'is rejected'}`, { tags }, () => {
      login.login(user.username, user.password)
      if (user.canLogin) {
        inventory.assertLoaded()
      } else {
        login.assertError(user.error ?? '')
      }
    })
  })

  it('rejects empty credentials', { tags: ['@regression'] }, () => {
    login.login(' ', ' ')
    login.assertError('Username and password do not match')
  })

  it('has no critical accessibility violations', { tags: ['@regression'] }, () => {
    login.checkA11y({ includedImpacts: ['critical'] })
  })
})
