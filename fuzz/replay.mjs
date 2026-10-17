// Deterministic checks of the real target contracts; no mutation engine is started.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('.github/fuzz.json', root), 'utf8'))
let cases = 0
for (const target of manifest.targets) {
  const entry = target.command.find(argument => /^fuzz\/[^/]+\.mjs$/.test(argument))
  assert.ok(entry, `missing target module: ${target.name}`)
  const { fuzz } = await import(new URL(entry, root))
  assert.equal(typeof fuzz, 'function')
  const corpus = new URL(`${target.corpus}/`, root)
  const names = readdirSync(corpus).sort()
  assert.ok(names.length, `empty corpus: ${target.name}`)
  for (const name of names) {
    await fuzz(readFileSync(new URL(name, corpus)))
    cases++
  }
  // Fixed malformed and binary cases exercise error paths beyond valid seeds.
  for (const text of ['', 'null', '{}', '[]', '{', '\u0000', 'NaN', '__proto__']) {
    await fuzz(Buffer.from(text))
    cases++
  }
  for (let value = 0; value < 64; value++) {
    const bytes = Buffer.from(Array.from({ length: 32 }, (_, index) => (value * 17 + index * 31) & 255))
    await fuzz(bytes)
    cases++
  }
}
// Exercise the real transitive i18n/JSON/runtime imports in standalone Node,
// where Vite cannot fill in a missing module or rewrite an extensionless path.
const { formatMeasurement } = await import('./.build/telemetry.js')
const { i18n } = await import('./.build/i18n/index.js')
const initialLocale = i18n.global.locale.value
try {
  for (const [locale, expected] of [['en', '1234.5 W'], ['de', '1234,5 W'], ['ru', '1234,5 W']]) {
    i18n.global.locale.value = locale
    assert.equal(formatMeasurement(1234.5, 1, ' W'), expected)
    assert.equal(formatMeasurement(undefined, 1, ' W'), '—')
  }
} finally {
  i18n.global.locale.value = initialLocale
}
console.log(`Replayed ${cases} deterministic target-contract cases; no mutation campaign`)
