import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

export interface EnvConfig {
  /** Environment key, matched against CYPRESS_ENV. */
  env: string
  baseUrl: string
  apiUrl?: string
  [key: string]: unknown
}

/**
 * Loads the matching environment row from data/env.json (one object per env).
 * Selected via CYPRESS_ENV (default: dev). Any value can be overridden at
 * runtime, e.g. BASE_URL=... overrides baseUrl. Edit envs via `npm run data`.
 */
export function loadEnv(): EnvConfig {
  const name = process.env.CYPRESS_ENV ?? 'dev'
  const file = path.resolve(process.cwd(), 'data', 'env.json')

  if (!fs.existsSync(file)) {
    throw new Error(`[env] data/env.json not found: ${file}`)
  }

  const all = JSON.parse(fs.readFileSync(file, 'utf-8')) as EnvConfig[]
  const config = all.find((e) => e.env === name)
  if (!config) {
    throw new Error(`[env] no entry for "${name}" in data/env.json`)
  }

  if (process.env.BASE_URL) config.baseUrl = process.env.BASE_URL
  if (process.env.API_URL) config.apiUrl = process.env.API_URL

  return config
}
