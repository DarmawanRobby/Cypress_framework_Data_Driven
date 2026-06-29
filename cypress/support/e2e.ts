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
