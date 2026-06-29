// Typed access to secrets from cypress.env.json (gitignored).
// Copy cypress.env.example.json -> cypress.env.json and fill it in.
// Cypress auto-loads cypress.env.json into Cypress.env(), so nothing else to wire.

export interface Secrets {
  apiUser?: string
  apiPassword?: string
  authToken?: string
}

/**
 * Read a secret, typed.
 * @example secret('apiPassword')
 */
export const secret = <K extends keyof Secrets>(key: K): Secrets[K] =>
  Cypress.env(key) as Secrets[K]
