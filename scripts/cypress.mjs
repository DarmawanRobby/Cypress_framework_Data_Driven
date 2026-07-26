// Launches Cypress with a sane Electron environment.
//   node scripts/cypress.mjs <run|open|verify|...>   (forwards all args)
//
// Why: VSCode's extension-host terminals (and any Electron-hosted shell) inject
// ELECTRON_RUN_AS_NODE=1. That flag forces Cypress's bundled Electron binary to
// boot as plain Node instead of the GUI/runner, which surfaces as a cryptic
// `MODULE_NOT_FOUND` and no HTML report ever being generated. Stripping the var
// here makes `npm test` / `npm run cy:open` work the same in a VSCode terminal
// as in a normal one. Harmless when the var is already unset.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Cypress restricts its `exports`, so resolve the CLI via its package.json `bin`.
const pkgPath = require.resolve('cypress/package.json')
const { bin } = JSON.parse(readFileSync(pkgPath, 'utf8'))
const cypressBin = resolve(dirname(pkgPath), typeof bin === 'string' ? bin : bin.cypress)

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// Electron flags, passed via ELECTRON_EXTRA_LAUNCH_ARGS (Electron ignores flags
// pushed through `before:browser:launch` — "not supported by electron"):
//   --disable-gpu*  keeps the renderer alive on macOS 26 (Tahoe); without it the
//                   tab crashes ("electron tab closed unexpectedly") in open mode.
//   --disable-background-networking / --disable-component-update  silence Chrome's
//                   own push/c2dm + updater traffic that spams the runner log.
const electronFlags =
  '--disable-gpu --disable-gpu-compositing --disable-software-rasterizer ' +
  '--disable-background-networking --disable-component-update'
env.ELECTRON_EXTRA_LAUNCH_ARGS = [env.ELECTRON_EXTRA_LAUNCH_ARGS, electronFlags]
  .filter(Boolean)
  .join(' ')

const child = spawn(process.execPath, [cypressBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
})

// After closing `cypress open`, pop the interactive HTML report open once (not
// per spec — that would spam tabs during a multi-spec manual session).
const openReportIfPresent = () => {
  if (process.argv[2] !== 'open') return
  const report = join(ROOT, 'cypress', 'reports', 'index.html')
  if (!existsSync(report)) return
  // Windows `start` is a cmd.exe builtin, not an executable — spawn it through the
  // shell (the empty '' is start's mandatory title arg). macOS/Linux use the plain
  // opener binary. detached + unref so the report outlives this launcher process.
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [report]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', report]]
        : ['xdg-open', [report]]
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

child.on('exit', (code, signal) => {
  openReportIfPresent()
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
