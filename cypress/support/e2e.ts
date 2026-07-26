import './commands'
import 'cypress-axe'
import 'cypress-mochawesome-reporter/register'
import registerCyGrep from '@bahmutov/cy-grep'

registerCyGrep()
import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command'

addMatchImageSnapshotCommand({
  failureThreshold: 0.02,
  failureThresholdType: 'percent',
  // Keep baselines outside the gitignored reports/ dir so they get committed.
  customSnapshotsDir: 'cypress/snapshots',
})

// --- Interactive (`cypress open`) report bridge -----------------------------
// The mochawesome `reporter` only runs in `cypress run`, never in `cypress open`
// (and Cypress's interactive run events crash the tab — cypress#27335). So in
// open mode we collect each test result here and flush them to the node
// `recordOpenReport` task after the spec, which writes cypress/reports/index.html.
if (Cypress.config('isInteractive')) {
  type Step = { name: string; message: string; state: string; screenshot?: string | null }
  const collected: Array<{
    fullTitle: string
    title: string
    state: string
    duration: number
    error: string | null
    steps: Step[]
  }> = []

  // `Step(msg, { shot: true })` calls cy.screenshot; capture each screenshot's
  // absolute path here (in command order) so it can be paired with its
  // `screenshot` log entry and embedded in the report.
  let shotQueue: string[] = []
  Cypress.Screenshot.defaults({
    onAfterScreenshot(_el, details) {
      shotQueue.push(details.path)
    },
  })

  // Capture the Cypress command log (visit/get/click/assert/xhr…) so each test
  // shows its steps in the report. Logs are keyed by id and updated as they
  // settle (log:changed), then snapshotted per test in afterEach.
  interface LogAttrs {
    id?: string
    name?: string
    message?: string
    state?: string
  }
  // Setup/plumbing logs that aren't meaningful test steps — keep them out of the
  // report. `route` = cy.intercept registrations (the analytics/CDN stubs below).
  const NOISE_LOGS = new Set(['route'])
  const stepsById = new Map<string, Step>()
  const captureLog = (attrs: LogAttrs) => {
    if (!attrs?.id) return
    if (attrs.name && NOISE_LOGS.has(attrs.name)) return
    stepsById.set(attrs.id, {
      name: attrs.name ?? '',
      message: (typeof attrs.message === 'string' ? attrs.message : '').slice(0, 300),
      state: attrs.state ?? 'passed',
    })
  }
  Cypress.on('log:added', captureLog as (...args: unknown[]) => void)
  Cypress.on('log:changed', captureLog as (...args: unknown[]) => void)

  // Persist the spec's results-so-far to disk. `collected` is cumulative (the
  // node writer replaces the spec's entry with the full list each call), and the
  // support file re-evaluates per spec so it resets between specs.
  const flush = () =>
    cy.task(
      'recordOpenReport',
      {
        spec: Cypress.spec.relative,
        browser: `${Cypress.browser.displayName} ${Cypress.browser.version}`,
        cypressVersion: Cypress.version,
        platform: `${Cypress.platform} ${Cypress.arch}`,
        viewport: `${Cypress.config('viewportWidth')}×${Cypress.config('viewportHeight')}`,
        tests: collected,
      },
      { log: false },
    )

  afterEach(function (this: Mocha.Context) {
    const steps = [...stepsById.values()]
    stepsById.clear()
    // Pair screenshot paths (in capture order) with their `screenshot` log rows.
    for (const s of steps) {
      if (s.name === 'screenshot') s.screenshot = shotQueue.shift() ?? null
    }
    shotQueue = []
    const test = this.currentTest as
      | (Mocha.Test & { err?: { message?: string }; pending?: boolean })
      | undefined
    if (!test) return
    collected.push({
      fullTitle: test.fullTitle(),
      title: test.title,
      state: test.state ?? (test.pending ? 'pending' : 'unknown'),
      duration: test.duration ?? 0,
      error: test.err?.message ?? null,
      steps,
    })
    // Flush after every test (not just once per spec) so completed tests are
    // already on disk if the browser is closed via X mid-spec.
    flush()
  })
}

// The practicetestautomation.com target is a live WordPress/Cloudflare site we
// don't control. Its third-party scripts occasionally throw (e.g. a Cloudflare
// challenge returns HTML where JS is expected → "Unexpected token '<'"), which
// isn't our test failing — so don't let that noise abort the run.
Cypress.on('uncaught:exception', (err) => {
  const msg = err?.message ?? ''
  const thirdPartyNoise = err?.name === 'SyntaxError' || msg.includes("Unexpected token '<'")
  return thirdPartyNoise ? false : undefined
})
