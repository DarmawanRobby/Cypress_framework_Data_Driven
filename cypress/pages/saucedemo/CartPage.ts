import { BasePage } from '../BasePage'
import { CheckoutPage } from './CheckoutPage'

/**
 * Cart review — https://www.saucedemo.com/cart.html
 */
export class CartPage extends BasePage {
  readonly path = '/cart.html'

  private readonly el = {
    item: '.cart_item',
    itemName: '.inventory_item_name',
    checkout: '[data-test="checkout"]',
  }

  assertLoaded(): this {
    cy.location('pathname').should('include', '/cart')
    return this
  }

  /** Assert a product row with the given name is present in the cart. */
  assertHasItem(productName: string): this {
    cy.contains(this.el.item, productName).should('be.visible')
    return this
  }

  assertItemCount(count: number): this {
    cy.get(this.el.item).should('have.length', count)
    return this
  }

  checkout(): CheckoutPage {
    cy.get(this.el.checkout).click()
    return new CheckoutPage()
  }
}
