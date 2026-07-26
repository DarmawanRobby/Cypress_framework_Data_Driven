// Typed access to secrets from cypress.env.json (gitignored).
// Copy cypress.env.example.json -> cypress.env.json and fill it in.
// Cypress auto-loads cypress.env.json into Cypress.env(), but browser code should
// use cy.env() when possible.

export interface Secrets {
  apiUser?: string
  apiPassword?: string
  authToken?: string
}

/**
 * Read a secret from the Cypress test runner environment.
 * @example secret('apiPassword').then((password) => { ... })
 */
export const secret = <K extends keyof Secrets>(
  key: K,
): Cypress.Chainable<Secrets[K] | undefined> =>
  cy
    .env<Record<string, Secrets[K] | undefined>>([key])
    .then((values) => values[key] as Secrets[K] | undefined) as Cypress.Chainable<
    Secrets[K] | undefined
  >
