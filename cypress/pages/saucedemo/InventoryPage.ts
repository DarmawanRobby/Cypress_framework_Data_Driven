import { BasePage } from '../BasePage'
import { CartPage } from './CartPage'
import { SauceLoginPage } from './SauceLoginPage'

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
    // Burger menu uses ids (no data-test hooks on the sidebar links).
    menuButton: '#react-burger-menu-btn',
    logoutLink: '#logout_sidebar_link',
  }

  assertLoaded(): this {
    cy.location('pathname').should('include', '/inventory')
    cy.get(this.el.item).should('have.length.greaterThan', 0)
    return this
  }

  /**
   * Direct-navigate to this protected page without a session. Verified live:
   * saucedemo's app-level guard redirects back to login and shows a guard error
   * ("You can only access '/inventory.html' when you are logged in") — it does
   * NOT 404. No product listing ever leaks.
   */
  assertDirectAccessBlocked(): SauceLoginPage {
    cy.visit(this.path, { failOnStatusCode: false })
    cy.get(this.el.item).should('not.exist')
    return new SauceLoginPage().assertLoaded().assertGuardError(this.path)
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

  /** Open the burger menu and log out; lands back on the login page. */
  logout(): SauceLoginPage {
    cy.get(this.el.menuButton).click()
    cy.get(this.el.logoutLink).should('be.visible').click()
    return new SauceLoginPage().assertLoaded()
  }
}
