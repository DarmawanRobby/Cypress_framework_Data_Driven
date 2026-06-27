// Opens the latest HTML test report in the default browser.
//   npm run report:open
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const report = join(ROOT, 'cypress', 'reports', 'index.html')

if (!existsSync(report)) {
  console.error('No report yet — run `npm test` first.')
  process.exit(1)
}

const cmd =
  process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
spawn(cmd, [report], {
  stdio: 'ignore',
  detached: true,
  shell: process.platform === 'win32',
}).unref()
console.log('Opening ' + report)
