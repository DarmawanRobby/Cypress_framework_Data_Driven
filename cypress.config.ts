import { defineConfig } from 'cypress'
import { addMatchImageSnapshotPlugin } from '@simonsmith/cypress-image-snapshot/plugin'
import mochawesome from 'cypress-mochawesome-reporter/plugin'
import cyGrepPlugin from '@bahmutov/cy-grep/src/plugin'
import { loadEnv } from './config/env'

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
  },
  e2e: {
    baseUrl: env.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'data',
    screenshotsFolder: 'cypress/reports/screenshots',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    retries: { runMode: 2, openMode: 0 },
    env,
    setupNodeEvents(on, config) {
      mochawesome(on)
      addMatchImageSnapshotPlugin(on)
      on('task', {
        log(message: string) {
          console.log(message)
          return null
        },
        table(rows: unknown[]) {
          console.table(rows)
          return null
        },
      })
      return cyGrepPlugin(config) as typeof config
    },
  },
})
