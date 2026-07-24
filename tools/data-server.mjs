// Tiny zero-dependency editor for the JSON files in /data (supports subfolders).
// Serves the UI and a CRUD API that reads/writes data/*.json directly.
//   npm run data  ->  http://localhost:5050
import { createServer } from 'node:http'
import { readFile, writeFile, readdir, unlink, mkdir, rmdir, rename, stat } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data')
const HTML = join(ROOT, 'tools', 'data-editor.html')
// Per-column dropdown option sets, keyed by data-file path ('saucedemo/users.json').
// Lives OUTSIDE data/ on purpose: data/ is scanned by data.ts (require.context),
// gen-data-types.mjs, and walkTree here — a .json in there would load as a fake dataset.
const DROPDOWNS_FILE = join(ROOT, 'tools', 'dropdowns.json')
const PORT = Number(process.env.DATA_PORT) || 5050

const SEGMENT_RE = /^[\w-]+$/
// env.json's location is hardcoded in config/env.ts — moving or deleting it
// silently breaks env loading, so it's pinned at the data/ root.
const PROTECTED_PATHS = new Set(['env.json'])

// Resolves a posix-style relative path ('a/b/c.json' or 'a/b') to an absolute
// path inside DATA_DIR. Rejects '.', '..', empty segments, absolute paths, and
// anything that would resolve outside DATA_DIR. Returns null if unsafe.
function resolveSafe(relPath, { requireJson = false } = {}) {
  if (typeof relPath !== 'string' || !relPath) return null
  const segments = relPath.split('/')
  if (segments.some((s) => !s)) return null
  const last = segments[segments.length - 1]
  const lastOk = requireJson ? /^[\w-]+\.json$/.test(last) : SEGMENT_RE.test(last)
  if (!lastOk) return null
  if (!segments.slice(0, -1).every((s) => SEGMENT_RE.test(s))) return null
  const abs = join(DATA_DIR, ...segments)
  const rel = relative(DATA_DIR, abs)
  if (rel.startsWith('..') || rel === '') return null
  return abs
}

async function walkTree(dir, prefix = '') {
  const folders = []
  const files = []
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) {
      folders.push(rel)
      const sub = await walkTree(join(dir, e.name), rel)
      folders.push(...sub.folders)
      files.push(...sub.files)
    } else if (e.isFile() && e.name.endsWith('.json')) {
      files.push(rel)
    }
  }
  return { folders, files }
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const readBody = (req) =>
  new Promise((done, fail) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => done(raw))
    req.on('error', fail)
  })

// Whole dropdowns map ({} when the file is absent or unreadable).
async function readDropdowns() {
  try {
    return JSON.parse(await readFile(DROPDOWNS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

async function writeDropdowns(map) {
  await writeFile(DROPDOWNS_FILE, JSON.stringify(map, null, 2) + '\n')
}

// Keeps dropdown config in sync when a data file/folder is renamed, moved, or
// deleted so it never points at a path that no longer exists.
async function syncDropdownsPath(from, to, type) {
  const map = await readDropdowns()
  let changed = false
  if (type === 'file') {
    if (from in map) {
      if (to != null) map[to] = map[from]
      delete map[from]
      changed = true
    }
  } else {
    // folder: re-key (or drop) every data file living under it.
    const prefix = from + '/'
    for (const key of Object.keys(map)) {
      if (!key.startsWith(prefix)) continue
      if (to != null) map[to + '/' + key.slice(prefix.length)] = map[key]
      delete map[key]
      changed = true
    }
  }
  if (changed) await writeDropdowns(map)
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')

    if (req.method === 'GET' && pathname === '/') {
      return send(res, 200, await readFile(HTML, 'utf8'), 'text/html; charset=utf-8')
    }

    if (req.method === 'GET' && pathname === '/api/tree') {
      return send(res, 200, await walkTree(DATA_DIR))
    }

    if (pathname === '/api/files' && req.method === 'POST') {
      const { name } = JSON.parse(await readBody(req))
      const relFile = name.endsWith('.json') ? name : `${name}.json`
      const abs = resolveSafe(relFile, { requireJson: true })
      if (!abs) return send(res, 400, { error: 'invalid filename' })
      await mkdir(dirname(abs), { recursive: true })
      try {
        await writeFile(abs, '[]\n', { flag: 'wx' })
      } catch {
        return send(res, 409, { error: 'file already exists' })
      }
      return send(res, 201, { ok: true, file: relFile })
    }

    if (pathname === '/api/folders' && req.method === 'POST') {
      const { path: relPath } = JSON.parse(await readBody(req))
      const abs = resolveSafe(relPath)
      if (!abs) return send(res, 400, { error: 'invalid folder path' })
      await mkdir(abs, { recursive: true })
      return send(res, 201, { ok: true, path: relPath })
    }

    const folderMatch = pathname.match(/^\/api\/folders\/(.+)$/)
    if (folderMatch && req.method === 'DELETE') {
      const relPath = decodeURIComponent(folderMatch[1])
      const abs = resolveSafe(relPath)
      if (!abs) return send(res, 400, { error: 'invalid folder path' })
      const entries = await readdir(abs).catch(() => null)
      if (entries === null) return send(res, 404, { error: 'folder not found' })
      if (entries.length) return send(res, 409, { error: 'folder is not empty' })
      await rmdir(abs)
      return send(res, 200, { ok: true })
    }

    if (pathname === '/api/entries' && req.method === 'PATCH') {
      const { from, to: toRaw, type } = JSON.parse(await readBody(req))
      const requireJson = type === 'file'
      if (PROTECTED_PATHS.has(from)) {
        return send(res, 400, {
          error: `${from} must stay at data/${from} (required by config/env.ts)`,
        })
      }
      // Match the create-file convenience: a rename target without .json gets it appended.
      const to =
        requireJson && typeof toRaw === 'string' && !toRaw.endsWith('.json')
          ? `${toRaw}.json`
          : toRaw
      const fromAbs = resolveSafe(from, { requireJson })
      const toAbs = resolveSafe(to, { requireJson })
      if (!fromAbs || !toAbs) return send(res, 400, { error: 'invalid path' })
      if (!requireJson && (to === from || to.startsWith(from + '/'))) {
        return send(res, 400, { error: 'cannot move a folder into itself' })
      }
      const fromStat = await stat(fromAbs).catch(() => null)
      if (!fromStat) return send(res, 404, { error: 'source not found' })
      const toStat = await stat(toAbs).catch(() => null)
      if (toStat) return send(res, 409, { error: 'target already exists' })
      await mkdir(dirname(toAbs), { recursive: true })
      await rename(fromAbs, toAbs)
      await syncDropdownsPath(from, to, type)
      return send(res, 200, { ok: true })
    }

    const dropMatch = pathname.match(/^\/api\/dropdowns\/(.+)$/)
    if (dropMatch) {
      const file = decodeURIComponent(dropMatch[1])
      if (!resolveSafe(file, { requireJson: true })) {
        return send(res, 400, { error: 'invalid filename' })
      }
      const map = await readDropdowns()
      if (req.method === 'GET') return send(res, 200, map[file] ?? {})
      if (req.method === 'PUT') {
        const cols = JSON.parse(await readBody(req))
        if (cols && typeof cols === 'object' && Object.keys(cols).length) map[file] = cols
        else delete map[file]
        await writeDropdowns(map)
        return send(res, 200, { ok: true })
      }
    }

    const match = pathname.match(/^\/api\/data\/(.+)$/)
    if (match) {
      const file = decodeURIComponent(match[1])
      const fp = resolveSafe(file, { requireJson: true })
      if (!fp) return send(res, 400, { error: 'invalid filename' })

      if (req.method === 'GET') return send(res, 200, await readFile(fp, 'utf8'))
      if (req.method === 'PUT') {
        const parsed = JSON.parse(await readBody(req))
        await writeFile(fp, JSON.stringify(parsed, null, 2) + '\n')
        return send(res, 200, { ok: true })
      }
      if (req.method === 'DELETE') {
        if (PROTECTED_PATHS.has(file)) {
          return send(res, 400, {
            error: `${file} must stay at data/${file} (required by config/env.ts)`,
          })
        }
        await unlink(fp)
        await syncDropdownsPath(file, null, 'file')
        return send(res, 200, { ok: true })
      }
    }

    send(res, 404, { error: 'not found' })
  } catch (err) {
    send(res, 500, { error: String(err?.message ?? err) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  📝 Test Data Editor  ->  http://localhost:${PORT}`)
  console.log(`  Editing JSON files in: ${DATA_DIR}\n`)
})
