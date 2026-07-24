import { BasePage } from '../BasePage'

/**
 * Checkout flow — spans /checkout-step-one, /checkout-step-two and
 * /checkout-complete on https://www.saucedemo.com.
 */
export class CheckoutPage extends BasePage {
  readonly path = '/checkout-step-one.html'

  private readonly el = {
    firstName: '[data-test="firstName"]',
    lastName: '[data-test="lastName"]',
    postalCode: '[data-test="postalCode"]',
    continue: '[data-test="continue"]',
    finish: '[data-test="finish"]',
    completeHeader: '[data-test="complete-header"]',
  }

  /** Fill the customer info form (step one) and continue to the overview. */
  fillCustomer(firstName: string, lastName: string, postalCode: string): this {
    cy.get(this.el.firstName).clear()
    cy.get(this.el.firstName).type(firstName)
    cy.get(this.el.lastName).clear()
    cy.get(this.el.lastName).type(lastName)
    cy.get(this.el.postalCode).clear()
    cy.get(this.el.postalCode).type(postalCode)
    cy.get(this.el.continue).click()
    return this
  }

  /** Finish the order from the overview (step two). */
  finish(): this {
    cy.get(this.el.finish).click()
    return this
  }

  assertComplete(): this {
    cy.location('pathname').should('include', '/checkout-complete')
    cy.get(this.el.completeHeader).should('have.text', 'Thank you for your order!')
    return this
  }
}
