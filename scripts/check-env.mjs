// Verifies the active environment's baseUrl is reachable (fast fail before a run).
//   node scripts/check-env.mjs   (honours CYPRESS_ENV, default dev)
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const name = process.env.CYPRESS_ENV ?? 'dev'
const envs = JSON.parse(readFileSync(join(ROOT, 'data', 'env.json'), 'utf8'))
const env = envs.find((e) => e.env === name)

if (!env) {
  console.error(`✗ no env "${name}" in data/env.json`)
  process.exit(1)
}

try {
  const res = await fetch(env.baseUrl, { method: 'HEAD' })
  console.log(`✓ ${name} baseUrl reachable: ${env.baseUrl} (${res.status})`)
} catch (err) {
  console.error(`✗ ${name} baseUrl unreachable: ${env.baseUrl}\n  ${err.message}`)
  process.exit(1)
}
