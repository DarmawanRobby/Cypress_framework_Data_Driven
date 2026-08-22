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
    failureScreenshot: string | null
    steps: Step[]
  }> = []

  // `Step(msg, { shot: true })` calls cy.screenshot; record each screenshot's path
  // keyed by its NAME. The same name is the `screenshot` log row's message (verified
  // stable across log:changed), so screenshots are paired to their log rows BY NAME,
  // not by FIFO order. FIFO broke the moment a non-Step screenshot slipped into the
  // stream — `matchImageSnapshot` fires this hook too, which would shift every later
  // Step screenshot out of alignment. Name pairing is immune to that ordering.
  const shotByName = new Map<string, string>()
  Cypress.Screenshot.defaults({
    onAfterScreenshot(_el, details) {
      shotByName.set(details.name ?? '', details.path)
    },
  })

  // A matchImageSnapshot baseline/diff is not a Step capture — keep it out of the
  // report's screenshot column (it writes *.snap.png / *.diff.png, the latter under
  // __diff_output__). Its 'screenshot' log row then just renders as a plain command.
  const isVisualSnapshot = (p: string) =>
    /\.(snap|diff)\.png$/.test(p) || p.includes('__diff_output__')

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
  // report. `route` = any cy.intercept registration a spec adds.
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

  // Silent-breakage guard. The bridge rides on Cypress's *internal* log events,
  // which carry no semver guarantee: if a future Cypress renames/removes them the
  // `.on()` above simply never fires and the report loses every step/screenshot
  // WHILE TESTS STAY GREEN. So prove the pipeline works once per spec — emit a
  // probe log and confirm our own listener caught it — and shout if it didn't.
  // Kept green (never fails a test); see docs/cypress-upgrade.md.
  before(() => {
    let ok = false
    try {
      const probe = '__bridge_selfcheck__'
      const before = stepsById.size
      Cypress.log({ name: 'step', message: probe })
      ok = stepsById.size > before
      for (const [id, s] of stepsById) if (s.message === probe) stepsById.delete(id)
    } catch {
      // Cypress.log or the event pipeline changed shape — leave ok=false (report broken).
    }
    if (!ok) {
      const warning =
        'report bridge broken: Cypress log events no longer feed the interactive report ' +
        '(cypress/support/e2e.ts) — steps/screenshots will be missing, likely a Cypress ' +
        'API change. See docs/cypress-upgrade.md.'
      console.error('[report-bridge] ⚠', warning)
      // Best-effort: also surface it in the runner's command log (renders natively,
      // independent of our capture). Guarded in case Cypress.log itself changed.
      try {
        Cypress.log({ name: 'report-bridge', message: '⚠ ' + warning })
      } catch {
        /* console.error above still surfaces it */
      }
    }
  })

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
    // Pair each `screenshot` log row with its file by name; drop visual snapshots so
    // only Step({ shot: true }) captures land in the report's screenshot column.
    for (const s of steps) {
      if (s.name !== 'screenshot') continue
      const path = shotByName.get(s.message)
      s.screenshot = path && !isVisualSnapshot(path) ? path : null
    }
    shotByName.clear()
    const test = this.currentTest as
      | (Mocha.Test & { err?: { message?: string }; pending?: boolean })
      | undefined
    if (!test) return
    const entry = {
      fullTitle: test.fullTitle(),
      title: test.title,
      state: test.state ?? (test.pending ? 'pending' : 'unknown'),
      duration: test.duration ?? 0,
      error: test.err?.message ?? null,
      failureScreenshot: null as string | null,
      steps,
    }
    collected.push(entry)
    // Flush after every test (not just once per spec) so completed tests are
    // already on disk if the browser is closed via X mid-spec — and BEFORE the
    // failure shot below, so a screenshot error can't lose an already-known result.
    flush()

    // Open mode never auto-captures on failure (that's run-mode only), so grab the
    // failure state ourselves and re-flush with it attached. `log: false` keeps it
    // out of the step list — it's rendered on its own under the error, not as a
    // step; its path still arrives via onAfterScreenshot → shotByName (by name).
    if (entry.state === 'failed') {
      const name = `failure-${Date.now()}`
      cy.screenshot(name, { capture: 'runner', log: false })
      cy.then(() => {
        entry.failureScreenshot = shotByName.get(name) ?? null
        shotByName.clear()
        flush()
      })
    }
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
