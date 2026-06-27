// Tiny zero-dependency editor for the JSON files in /data.
// Serves the UI and a CRUD API that reads/writes data/*.json directly.
//   npm run data  ->  http://localhost:5050
import { createServer } from 'node:http'
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data')
const HTML = join(ROOT, 'tools', 'data-editor.html')
const PORT = Number(process.env.DATA_PORT) || 5050

const isSafe = (name) => /^[\w-]+\.json$/.test(name)

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

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')

    if (req.method === 'GET' && pathname === '/') {
      return send(res, 200, await readFile(HTML, 'utf8'), 'text/html; charset=utf-8')
    }

    if (pathname === '/api/files') {
      if (req.method === 'GET') {
        const files = (await readdir(DATA_DIR)).filter((f) => extname(f) === '.json').sort()
        return send(res, 200, files)
      }
      if (req.method === 'POST') {
        const { name } = JSON.parse(await readBody(req))
        const file = name.endsWith('.json') ? name : `${name}.json`
        if (!isSafe(file)) return send(res, 400, { error: 'invalid filename' })
        try {
          await writeFile(join(DATA_DIR, file), '[]\n', { flag: 'wx' })
        } catch {
          return send(res, 409, { error: 'file already exists' })
        }
        return send(res, 201, { ok: true, file })
      }
    }

    const match = pathname.match(/^\/api\/data\/([\w.-]+)$/)
    if (match) {
      const file = match[1]
      if (!isSafe(file)) return send(res, 400, { error: 'invalid filename' })
      const fp = join(DATA_DIR, file)

      if (req.method === 'GET') return send(res, 200, await readFile(fp, 'utf8'))
      if (req.method === 'PUT') {
        const parsed = JSON.parse(await readBody(req))
        await writeFile(fp, JSON.stringify(parsed, null, 2) + '\n')
        return send(res, 200, { ok: true })
      }
      if (req.method === 'DELETE') {
        await unlink(fp)
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
