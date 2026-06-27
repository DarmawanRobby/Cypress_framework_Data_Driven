// Auto-loads every data/*.json at bundle time (webpack require.context):
// drop a file in /data and read it with data('<name>') — no wiring here.
//
// Static (not cy.fixture) so data is available at spec *load* time and can
// drive data-driven `it()` generation. Same files the editor writes to.
import type { UserRoster } from './types'

// `require.context` is a webpack feature; type it locally to avoid global augmentation.
const req = require as unknown as {
  context(dir: string, deep?: boolean, re?: RegExp): { keys(): string[]; (id: string): unknown }
}
const ctx = req.context('../../data', false, /\.json$/)

const store: Record<string, unknown> = {}
for (const key of ctx.keys()) {
  const name = key.replace(/^\.\//, '').replace(/\.json$/, '')
  const mod = ctx(key) as { default?: unknown }
  store[name] = mod?.default ?? mod
}

/**
 * Read a whole dataset by file name (without `.json`). Caller supplies the type.
 * `DataFile` is auto-generated (`npm run data:types`) so names autocomplete.
 * @example const users = data<UserRoster>('users')
 */
export function data<T>(name: DataFile): T {
  if (!(name in store)) {
    throw new Error(`data/${name}.json not found. Available: ${Object.keys(store).join(', ')}`)
  }
  return store[name] as T
}

/**
 * Find the first row in data/<name>.json matching the predicate. Throws if none.
 * @example findIn<User>('users', (u) => u.role === 'lockedOut')
 */
export function findIn<T>(name: DataFile, predicate: (row: T) => boolean): T {
  const row = data<T[]>(name).find(predicate)
  if (!row) throw new Error(`No row in data/${name}.json matched the predicate`)
  return row
}

/**
 * Return all rows in data/<name>.json matching the predicate.
 * @example filterIn<User>('users', (u) => u.canLogin)
 */
export function filterIn<T>(name: DataFile, predicate: (row: T) => boolean): T[] {
  return data<T[]>(name).filter(predicate)
}

/** Pre-typed convenience for the most-used dataset. */
export const users = data<UserRoster>('users')
