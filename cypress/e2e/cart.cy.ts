import { InventoryPage } from '../pages/InventoryPage'
import { CartPage } from '../pages/CartPage'
import { data, users } from '../support/data'
import { byRole, type CartRow } from '../support/types'

const inventory = new InventoryPage()
const cart = new CartPage()

// One test per product in data/cart.json (auto-loaded; add a row -> new test).
const products = data<CartRow[]>('cart')

describe('Cart (data-driven)', () => {
  beforeEach(() => {
    const { username, password } = byRole(users, 'standard')
    cy.login(username, password)
    inventory.assertLoaded()
  })

  products.forEach((product) => {
    it(`adds "${product.name}" to the cart`, { tags: ['@regression'] }, () => {
      inventory.addToCartById(product.id)
      cart.open().assertHasItem(product.name)
    })
  })
})
