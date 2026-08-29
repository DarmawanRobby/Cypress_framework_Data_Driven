import { Step } from '../support/step'

// Compatibility guard for future Cypress upgrades. The interactive report bridge
// (cypress/support/e2e.ts + scripts/open-report-writer.mjs) rides on Cypress APIs
// that carry no semver guarantee — `Cypress.log` + the internal `log:added` event,
// and cy.screenshot emitting a log named 'screenshot' (how screenshots are paired
// to phases). If a future Cypress changes those, the report silently loses all
// steps/screenshots while every real test stays green. This spec fails LOUDLY in
// that case (runs in `npm test` via @smoke, so CI catches it). See docs/cypress-upgrade.md.
describe('framework compat — report-bridge Cypress APIs', () => {
  it(
    'internal log + screenshot events the report bridge relies on still fire',
    {
      tags: ['@smoke'],
    },
    () => {
      const probe = '__compat_probe__'
      const seen: string[] = []
      // Filtered on a unique probe string + the 'screenshot' name, so this listener is
      // harmless if it lingers past the test — no real command matches it.
      const onLog = (attrs: { name?: string; message?: string }) => {
        if (attrs?.message === probe) seen.push('log')
        if (attrs?.name === 'screenshot') seen.push('screenshot')
      }
      Cypress.on('log:added', onLog as (...args: unknown[]) => void)

      // 1) Cypress.log → log:added: the pipeline that feeds every report step.
      cy.then(() => {
        Cypress.log({ name: 'step', message: probe })
        expect(seen, 'log:added fired for Cypress.log({ name: "step" })').to.include('log')
      })

      // 2) cy.screenshot must still emit a log named 'screenshot' — open-report-writer.mjs
      //    pairs each screenshot to its phase by that exact name.
      Step('compat screenshot', { shot: true })
      cy.then(() => {
        expect(seen, "cy.screenshot emitted a 'screenshot' log").to.include('screenshot')
      })
    },
  )
})
