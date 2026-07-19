// Auto-loads every data/**/*.json at bundle time (webpack require.context):
// drop a file anywhere under /data and read it with data('<name>') — no wiring here.
//
// Static (not cy.fixture) so data is available at spec *load* time and can
// drive data-driven `it()` generation. Same files the editor writes to.

// `require.context` is a webpack feature; type it locally to avoid global augmentation.
const req = require as unknown as {
  context(dir: string, deep?: boolean, re?: RegExp): { keys(): string[]; (id: string): unknown }
}
const ctx = req.context('../../data', true, /\.json$/)

const store: Record<string, unknown> = {}
for (const key of ctx.keys()) {
  const name = key.replace(/^\.\//, '').replace(/\.json$/, '')
  const mod = ctx(key) as { default?: unknown }
  store[name] = mod?.default ?? mod
}

/**
 * Read a whole dataset by file name (without `.json`, nested paths included).
 * Caller supplies the type. `DataFile` is auto-generated (`npm run data:types`)
 * so names autocomplete.
 * @example const cases = data<LoginCase[]>('login')
 */
export function data<T>(name: DataFile): T {
  if (!(name in store)) {
    throw new Error(`data/${name}.json not found. Available: ${Object.keys(store).join(', ')}`)
  }
  return store[name] as T
}

/**
 * Find the first row in data/<name>.json matching the predicate. Throws if none.
 * @example findIn<Product>('products', (p) => p.slug === 'shampoo')
 */
export function findIn<T>(name: DataFile, predicate: (row: T) => boolean): T {
  const row = data<T[]>(name).find(predicate)
  if (!row) throw new Error(`No row in data/${name}.json matched the predicate`)
  return row
}

/**
 * Return all rows in data/<name>.json matching the predicate.
 * @example filterIn<Product>('products', (p) => p.category === 'skin-care')
 */
export function filterIn<T>(name: DataFile, predicate: (row: T) => boolean): T[] {
  return data<T[]>(name).filter(predicate)
}
