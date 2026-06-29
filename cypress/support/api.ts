// Thin typed wrapper over cy.request for API setup/teardown — far faster and more
// reliable than driving the UI for state you don't actually want to test.
//
// Base URL comes from data/env.json (apiUrl, exposed via Cypress.env). Auth token
// comes from cypress.env.json (secrets). Adapt endpoints/shapes to your API.
import { secret } from './secrets'

const base = () => (Cypress.env('apiUrl') as string | undefined) ?? ''

interface ApiOptions extends Partial<Cypress.RequestOptions> {
  /** Attach `Authorization: Bearer <authToken>` from cypress.env.json (default true). */
  withToken?: boolean
}

function request<T = unknown>({ withToken = true, headers, url = '', ...rest }: ApiOptions) {
  const token = secret('authToken')
  return cy.request<T>({
    failOnStatusCode: true,
    ...rest,
    url: `${base()}${url}`,
    headers: { ...headers, ...(withToken && token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

/** REST helpers. Pass a path (e.g. '/users'); base URL + auth header are added. */
export const api = {
  get: <T = unknown>(url: string, withToken = true) =>
    request<T>({ method: 'GET', url, withToken }),
  post: <T = unknown>(url: string, body?: Cypress.RequestBody, withToken = true) =>
    request<T>({ method: 'POST', url, body, withToken }),
  put: <T = unknown>(url: string, body?: Cypress.RequestBody, withToken = true) =>
    request<T>({ method: 'PUT', url, body, withToken }),
  del: (url: string, withToken = true) =>
    request({ method: 'DELETE', url, withToken, failOnStatusCode: false }),
}

/**
 * SKELETON — programmatic auth cached across specs (the big speed win for real apps:
 * log in once via API instead of through the UI in every test). Adapt the endpoint
 * and how the token is persisted (localStorage / cookie) to your app.
 *
 * @example
 *   beforeEach(() => auth.login(secret('apiUser')!, secret('apiPassword')!))
 */
export const auth = {
  login(username: string, password: string) {
    cy.session(
      ['api', username],
      () => {
        api
          .post<{ token: string }>('/auth/login', { username, password }, false)
          .then((res) => window.localStorage.setItem('authToken', res.body.token))
      },
      { cacheAcrossSpecs: true },
    )
  },
}
