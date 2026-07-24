import { SauceLoginPage } from '../pages/saucedemo/SauceLoginPage'
import { data } from '../support/data'
import type { SauceCheckout } from '../support/types'

// This suite targets saucedemo.com, not the repo's default baseUrl — override
// it locally so `npm test` stays green for both targets without touching env.json.
const BASE = 'https://www.saucedemo.com'

const login = new SauceLoginPage()
const fx = data<SauceCheckout>('saucedemo/checkout')

// Full shopping E2E: login → add products → cart → checkout → order complete.
describe('Sauce Demo — checkout flow', () => {
  before(() => {
    Cypress.config('baseUrl', BASE)
  })

  it('completes an order end-to-end', { tags: ['@smoke'] }, () => {
    const inventory = login.visit().loginAs('standard_user', 'secret_sauce')

    fx.products.forEach((name) => inventory.addToCart(name))
    inventory.assertCartCount(fx.products.length)

    const cart = inventory.openCart()
    fx.products.forEach((name) => cart.assertHasItem(name))
    cart.assertItemCount(fx.products.length)

    cart
      .checkout()
      .fillCustomer(fx.customer.firstName, fx.customer.lastName, fx.customer.postalCode)
      .finish()
      .assertComplete()
  })
})
