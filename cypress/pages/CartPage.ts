import { BasePage } from './BasePage'

export class CartPage extends BasePage {
  // saucedemo 404s on direct nav to /cart.html (client-side routing), so we open
  // it via the cart link (see open()) rather than visit(). path kept for reference.
  readonly path = '/cart.html'

  /** Open the cart from the cart icon in the header. */
  open(): this {
    cy.getBySel('shopping-cart-link').click()
    cy.get('.title').should('have.text', 'Your Cart')
    return this
  }

  assertHasItem(name: string): this {
    cy.getBySel('inventory-item-name').should('contain.text', name)
    return this
  }

  itemCount(): Cypress.Chainable<number> {
    return cy.get('.cart_item').its('length')
  }
}
