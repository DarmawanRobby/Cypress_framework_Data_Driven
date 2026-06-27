import { InventoryPage } from '../pages/InventoryPage'
import { byRole } from '../support/types'
import { users } from '../support/data'

const inventory = new InventoryPage()

describe('Inventory (authenticated)', () => {
  beforeEach(() => {
    const { username, password } = byRole(users, 'standard')
    cy.login(username, password)
    inventory.assertLoaded()
  })

  it('lists products', { tags: ['@smoke'] }, () => {
    inventory.itemCount().should('be.gt', 0)
  })

  it('adds an item to the cart', { tags: ['@regression'] }, () => {
    inventory.addFirstItemToCart().assertCartCount(1)
  })
})
