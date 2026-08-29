import type { Result } from 'axe-core'
import { fakeCamera, type CameraOptions } from './camera'

/** Shorthand for `cy.get('[data-test="..."]')` — the project's selector convention. */
Cypress.Commands.add('getBySel', (selector: string, options?) =>
  cy.get(`[data-test="${selector}"]`, options),
)

/**
 * Pause for a human to complete a step that can't be automated (PIN, eKYC, OTP).
 * Interactive (`cypress open`) → pauses; do the step, then press ▶ Resume.
 * Headless (`cypress run`) → fails fast, so a manual step never silently passes.
 * Tag such specs `@manual` — they're excluded from default/CI runs.
 */
Cypress.Commands.add('manualStep', (instruction: string) => {
  const banner = `🖐 MANUAL STEP — ${instruction}`
  Cypress.log({ name: 'manualStep', message: banner })

  if (!Cypress.config('isInteractive')) {
    throw new Error(
      `${banner}\nManual steps need interactive mode (cypress open). ` +
        `Tag this spec { tags: ['@manual'] } and run it locally.`,
    )
  }

  cy.task('log', `\n  ${banner}\n  → Do it in the browser, then click ▶ (Resume).\n`)
  cy.pause()
})

/**
 * Visit a page with a fake camera stream injected (getUserMedia stubbed).
 * The image is served from `data/` (fixturesFolder). Useful for eKYC, OCR,
 * selfie capture, and basic liveness testing.
 *
 * @example cy.injectCamera('/ekyc/upload', 'ekyc/ktp-front.png')
 */
Cypress.Commands.add(
  'injectCamera',
  (url: string, fixturePath: string, options?: CameraOptions) => {
    cy.visit(url, { onBeforeLoad: fakeCamera(fixturePath, options) })
  },
)

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
