// Real loopback TLS and proxy checks; no deployment, public ACME or trust-store writes.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'

const directory = await mkdtemp(path.join(os.tmpdir(), 'dashboard-https-'))
const backend = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(request.url)
})
backend.listen(0, '127.0.0.1')
await once(backend, 'listening')
const reservation = net.createServer().listen(0, '127.0.0.1')
await once(reservation, 'listening')
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
await mkdir(path.join(directory, 'site'))
await writeFile(path.join(directory, 'site', 'index.html'), '<h1>Dashboard TLS profile</h1>')
let diagnostics = ''
const child = spawn(process.env.CADDY_BIN || 'caddy', ['run', '--config', 'deploy/https/Caddyfile', '--adapter', 'caddyfile'], {
  env: { ...process.env, XDG_DATA_HOME: directory, XDG_CONFIG_HOME: directory,
    DASHBOARD_ADDRESS: `localhost:${port}`, DASHBOARD_ROOT: path.join(directory, 'site'),
    DASHBOARD_BACKEND: `127.0.0.1:${backend.address().port}` },
  stdio: ['ignore', 'ignore', 'pipe'],
})
child.stderr.on('data', chunk => { diagnostics += chunk })
let spawnError
child.on('error', error => { spawnError = error })
function request(ca, pathname = '/', extra = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: '127.0.0.1', servername: 'localhost', port, path: pathname,
      ca, headers: { Host: `localhost:${port}` }, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', agent: false, ...extra }, response => {
      let body = ''
      const protocol = response.socket.getProtocol()
      const certificate = response.socket.getPeerX509Certificate()
      response.setEncoding('utf8')
      response.on('data', chunk => { body += chunk })
      response.on('end', () => resolve({ body, headers: response.headers, protocol, certificate }))
    })
    req.setTimeout(2000, () => req.destroy(new Error('TLS request timed out')))
    req.on('error', reject)
  })
}
try {
  let ca
  let result
  for (let attempt = 0; attempt < 200; attempt++) {
    if (spawnError) throw spawnError
    if (child.exitCode !== null) throw new Error(`Caddy exited: ${diagnostics}`)
    try {
      ca = await readFile(path.join(directory, 'caddy/pki/authorities/local/root.crt'))
      result = await request(ca)
      break
    } catch { await delay(100) }
  }
  assert.ok(result, diagnostics)
  assert.equal(result.protocol, 'TLSv1.3')
  assert.equal(result.body, '<h1>Dashboard TLS profile</h1>')
  for (const certificate of [result.certificate, new X509Certificate(ca), new X509Certificate(await readFile(path.join(directory, 'caddy/pki/authorities/local/intermediate.crt')))]) {
    assert.equal(certificate.publicKey.asymmetricKeyType, 'ec')
    assert.equal(certificate.publicKey.asymmetricKeyDetails.namedCurve, 'prime256v1')
  }
  assert.ok(result.headers['content-security-policy'].includes(`connect-src 'self' wss://localhost:${port};`))
  assert.equal((await request(ca, '/api/state?token=synthetic-test-token')).body, '/api/state?token=synthetic-test-token')
  assert.equal((await request(ca, '/ws')).body, '/ws')
  assert.equal((await request(ca, '/nested/client/route')).body, result.body)
  await assert.rejects(request(ca, '/', { minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }))
  await assert.rejects(request(undefined))
  console.log('HTTPS profile: trusted TLS1.3/P-256 chain, same-origin API routing/CSP, SPA fallback; TLS1.2 and untrusted CA rejected.')
} finally {
  child.kill('SIGTERM')
  if (child.exitCode === null && !spawnError) await once(child, 'exit')
  await new Promise(resolve => backend.close(resolve))
  await rm(directory, { recursive: true, force: true })
}
