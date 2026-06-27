import type { Result } from 'axe-core'

/** Shorthand for `cy.get('[data-test="..."]')` — the project's selector convention. */
Cypress.Commands.add('getBySel', (selector: string, options?) =>
  cy.get(`[data-test="${selector}"]`, options),
)

/**
 * Log in via the UI and land on the inventory page.
 *
 * Note: this demo app (saucedemo) uses pure client-side routing — protected
 * pages 404 on direct navigation and the cookie is not honored on reload, so a
 * UI login is required. For apps that support deep-linking/SSR, wrap the body in
 * `cy.session([username, password], () => { ... }, { cacheAcrossSpecs: true })`
 * to cache auth and skip the form on subsequent calls.
 */
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/')
  cy.getBySel('username').type(username)
  cy.getBySel('password').type(password, { log: false })
  cy.getBySel('login-button').click()
  cy.location('pathname').should('eq', '/inventory.html')
})

/**
 * Inject axe-core then assert accessibility on the given context.
 * Violations are printed as a table to the terminal on failure.
 */
Cypress.Commands.add(
  'checkAccessibility',
  (context?: Parameters<typeof cy.checkA11y>[0], options?: Parameters<typeof cy.checkA11y>[1]) => {
    cy.injectAxe()
    cy.checkA11y(context, options, (violations: Result[]) => {
      cy.task(
        'table',
        violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
        })),
      )
    })
  },
)
