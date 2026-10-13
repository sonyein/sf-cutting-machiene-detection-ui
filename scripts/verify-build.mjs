import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const prefix = 'https://example.invalid/review-repo/'
async function verify(reference, parent) {
  const resolved = new URL(reference, new URL(parent, prefix))
  assert.equal(resolved.origin, new URL(prefix).origin, `External asset: ${reference}`)
  assert.ok(resolved.pathname.startsWith('/review-repo/'), `Asset escapes repository path: ${reference}`)
  const relative = decodeURIComponent(resolved.pathname.slice('/review-repo/'.length))
  assert.ok((await stat(path.join(root, relative))).isFile(), `Missing asset: ${relative}`)
}
const html = await readFile(path.join(root, 'index.html'), 'utf8')
for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) await verify(reference, 'index.html')
let jsBytes = 0, jsGzip = 0, fontBytes = 0, fontCount = 0
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) { await walk(absolute); continue }
    const relative = path.relative(root, absolute).replaceAll('\\', '/')
    const buffer = await readFile(absolute)
    if (entry.name.endsWith('.js')) {
      jsBytes += buffer.length; jsGzip += gzipSync(buffer).length
      const content = buffer.toString('utf8')
      assert.ok(!/디자인 검수 단계|준비 중/.test(content), `Temporary UI in ${relative}`)
      for (const [, reference] of content.matchAll(/["'](\.{1,2}\/[^"']+\.(?:js|css))["']/g)) await verify(reference, relative)
    }
    if (entry.name.endsWith('.css')) for (const [, reference] of buffer.toString('utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) await verify(reference, relative)
    if (entry.name.endsWith('.woff2')) { assert.equal(buffer.subarray(0, 4).toString(), 'wOF2'); fontBytes += buffer.length; fontCount++ }
  }
}
await walk(root)
assert.equal(fontCount, 92)
console.log(`Verified HTML, chunks, CSS and ${fontCount} fonts under /review-repo/.`)
console.log(`All JS: ${jsBytes} bytes; gzip sum: ${jsGzip} bytes. Fonts: ${fontBytes} bytes (Unicode ranges load on demand).`)
