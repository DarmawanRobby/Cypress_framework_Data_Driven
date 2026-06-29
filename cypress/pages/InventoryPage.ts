import { BasePage } from './BasePage'

export class InventoryPage extends BasePage {
  readonly path = '/inventory.html'

  private readonly el = {
    title: '.title',
    item: '.inventory_item',
    cartBadge: '.shopping_cart_badge',
    firstAddBtn: '.inventory_item:first-child button',
  }

  assertLoaded(): this {
    cy.get(this.el.title).should('have.text', 'Products')
    return this
  }

  itemCount(): Cypress.Chainable<number> {
    return cy.get(this.el.item).its('length')
  }

  addFirstItemToCart(): this {
    cy.get(this.el.firstAddBtn).click()
    return this
  }

  /** Add a product to the cart by its slug, e.g. 'sauce-labs-backpack'. */
  addToCartById(id: string): this {
    cy.getBySel(`add-to-cart-${id}`).click()
    return this
  }

  assertCartCount(count: number): this {
    cy.get(this.el.cartBadge).should('have.text', String(count))
    return this
  }
}
