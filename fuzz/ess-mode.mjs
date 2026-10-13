import assert from 'node:assert/strict'
import { ESS_MODES, isEssModeCommandFresh, selectedEssMode } from './.build/essMode.js'
import { isSetpointOverrideFresh } from './.build/setpointOverride.js'

const known = new Set(ESS_MODES.map((entry) => entry.id))
const now = 1_700_000_000_000

export function fuzz(data) {
  if (data.length > 4096) return
  const name = data.toString('utf8')
  // All strings from controller telemetry, including inherited property names,
  // must either select a known command enum or remain unknown.
  const legacy = selectedEssMode({ mode_name: name })
  assert(legacy === undefined || known.has(legacy))
  const selected = selectedEssMode({ selection_supported: true, selected: name })
  assert.equal(selected, known.has(name) ? name : undefined)
  assert.equal(selectedEssMode({ mode_name: name, is_external: true }), name === 'Off' ? 'off' : 'external_control')

  // Decode arbitrary floating-point timestamps and signed setpoints without a
  // wall clock, device, random source, or requests to the controller.
  const value = data.length >= 4 ? data.readInt32LE(0) : 0
  const observed = data.length >= 12 ? data.readDoubleLE(4) : now / 1000
  const allowed = Number.isFinite(observed) && observed >= now / 1000 - 30 && observed <= now / 1000
  assert.equal(isEssModeCommandFresh({}, observed, now), allowed)
  assert.equal(isSetpointOverrideFresh({ value, last_error: null, request_id: name }, observed, now), allowed)
  assert.equal(isSetpointOverrideFresh({ value: 2147483648, last_error: null, request_id: name }, observed, now), false)
}
