// A static server for the built app (dist/) that applies the same security headers as
// public/_headers, so browser tests see what a visitor sees.
import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.gz': 'application/gzip', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

// The first block of _headers holds the rules for every path.
function globalHeaders(base) {
  const lines = readFileSync(join(base, '_headers'), 'utf8').split(/\r?\n/).slice(1)
  const block = []
  for (const line of lines) { if (!line.trim()) break; block.push(line) }
  return Object.fromEntries(block.filter((l) => l.includes(':')).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
}

export function startServer(root = 'dist', port = 0) {
  const base = resolve(root)
  const headers = globalHeaders(base)
  return new Promise((done) => {
    const server = http.createServer((req, res) => {
      let path = join(base, decodeURIComponent(req.url.split('?')[0]))
      if (!path.startsWith(base)) { res.writeHead(403); return res.end() }
      if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html')
      if (!existsSync(path)) { res.writeHead(404); return res.end() }
      res.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' })
      res.end(readFileSync(path))
    })
    server.listen(port, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` }))
  })
}
