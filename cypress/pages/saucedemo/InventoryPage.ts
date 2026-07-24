import { BasePage } from '../BasePage'
import { CartPage } from './CartPage'

/**
 * Product listing after login — https://www.saucedemo.com/inventory.html
 * Each `.inventory_item` has one Add-to-cart / Remove toggle button.
 */
export class InventoryPage extends BasePage {
  readonly path = '/inventory.html'

  private readonly el = {
    item: '.inventory_item',
    itemName: '.inventory_item_name',
    cartBadge: '.shopping_cart_badge',
    cartLink: '.shopping_cart_link',
  }

  assertLoaded(): this {
    cy.location('pathname').should('include', '/inventory')
    cy.get(this.el.item).should('have.length.greaterThan', 0)
    return this
  }

  /** Add a product to the cart by its visible name. */
  addToCart(productName: string): this {
    cy.contains(this.el.item, productName).within(() => {
      cy.contains('button', 'Add to cart').click()
    })
    return this
  }

  /** Assert the cart badge shows the given item count. */
  assertCartCount(count: number): this {
    if (count === 0) {
      cy.get(this.el.cartBadge).should('not.exist')
    } else {
      cy.get(this.el.cartBadge).should('have.text', String(count))
    }
    return this
  }

  openCart(): CartPage {
    cy.get(this.el.cartLink).click()
    return new CartPage().assertLoaded()
  }
}
