// Emits a labeled step into the Cypress command log — and therefore into the
// interactive HTML report (see cypress/support/e2e.ts) — so specs read as human
// steps instead of raw commands. Especially useful for manual flows (OTP / FR).
//
//   import { Step } from '../support/step'
//   Step('Add products to cart')
//   Step('Enter OTP', { shot: true })   // also capture a screenshot for the report
export interface StepOptions {
  /** Capture a viewport screenshot and embed it under this step in the report. */
  shot?: boolean
}

let shotCounter = 0

export const Step = (message: string, opts?: StepOptions): void => {
  // Queue the marker so it logs in execution order relative to cy.* commands.
  // A bare Cypress.log() fires synchronously while the test body is still
  // queueing commands, which would bunch every step under the last marker.
  cy.then(() => {
    Cypress.log({ name: 'step', message })
  })
  if (opts?.shot) {
    shotCounter += 1
    cy.screenshot(`step-${shotCounter}`, { capture: 'viewport' })
  }
}
