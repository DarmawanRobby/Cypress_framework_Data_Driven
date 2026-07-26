import { defineConfig } from 'cypress'
import { addMatchImageSnapshotPlugin } from '@simonsmith/cypress-image-snapshot/plugin'
import cyGrepPlugin from '@bahmutov/cy-grep/src/plugin'
import { loadEnv } from './config/env'
import type { OpenReportPayload } from './scripts/open-report-writer.mjs'

const env = loadEnv()

export default defineConfig({
  projectId: '9ze8cq',
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportPageTitle: 'Cypress Test Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    charts: true,
    saveJson: true,
    removeJsonsFolderAfterMerge: false,
  },
  // `@simonsmith/cypress-image-snapshot` still relies on Cypress.env() internally,
  // so keep allowCypressEnv enabled for now.
  allowCypressEnv: true,
  // NOTE: experimentalInteractiveRunEvents was removed. In `cypress open` it makes
  // the reporter's plugin-registered before:run/after:run fire in interactive mode,
  // which corrupts Cypress's DataContext and aborts the tab ("closed unexpectedly"
  // / "Expected DataContext to already have been set via setCtx", cypress#27335) —
  // browser-independent (repro'd on both Electron and Chrome).
  experimentalMemoryManagement: true,
  e2e: {
    baseUrl: env.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'data',
    screenshotsFolder: 'cypress/reports/screenshots',
    viewportWidth: 1280,
    viewportHeight: 800,
    // Record video in `cypress run` (headless/CI) — the mochawesome reporter links
    // each spec's video into the HTML report. `cypress open` never records video
    // (Cypress limitation); the interactive report relies on the command log instead.
    video: true,
    retries: { runMode: 2, openMode: 0 },
    env,
    async setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on)
      const { default: plugin } = await import('cypress-mochawesome-reporter/plugin.js')
      plugin(on)

      // Disable GPU acceleration to keep the renderer alive on macOS 26 (Tahoe),
      // and silence Chrome's own push/c2dm + component-updater traffic that spams
      // the runner log. Electron rejects Chromium flags passed here ("not supported
      // by electron") — it's covered via ELECTRON_EXTRA_LAUNCH_ARGS in
      // scripts/cypress.mjs — so only apply these to real Chromium (chrome/edge).
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push(
            '--disable-gpu',
            '--disable-gpu-compositing',
            '--disable-software-rasterizer',
            '--disable-background-networking',
            '--disable-component-update',
          )
        }
        return launchOptions
      })

      on('task', {
        log(message: string) {
          console.log(message)
          return null
        },
        table(rows: unknown[]) {
          console.table(rows)
          return null
        },
        // Interactive-mode report bridge: cypress/support/e2e.ts collects results
        // per spec in the browser and hands them here, since the mochawesome
        // `reporter` only runs in `cypress run`, not `cypress open`.
        async recordOpenReport(payload: OpenReportPayload) {
          const { writeOpenReport } = await import('./scripts/open-report-writer.mjs')
          writeOpenReport(payload)
          return null
        },
      })
      return cyGrepPlugin(config) as typeof config
    },
  },
})
