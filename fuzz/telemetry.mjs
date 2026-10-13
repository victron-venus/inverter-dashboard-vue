import assert from 'node:assert/strict'
import { evTelemetry } from './.build/controllerTelemetry.js'
import { connectionStatus, normalizeTelemetry } from './.build/telemetry.js'

export function fuzz(data) {
  if (data.length > 4096) return
  const floats = [0, 8, 16, 24].map((offset) => data.length >= offset + 8 ? data.readDoubleLE(offset) : 0)
  const flags = data[32] ?? 0
  const input = {
    ev_charging_kw: floats[0],
    ev_power: floats[1],
    car_soc: floats[2],
    gt: 0,
    telemetry_available: { gt: true, car_soc: (flags & 1) === 0 },
    batteries: [{ soc: floats[3], voltage: 0, telemetry_available: { soc: (flags & 2) === 0, voltage: true } }],
    data_source: (flags & 4) === 0 ? 'mqtt' : 'igw',
    mqtt_connected: (flags & 8) !== 0,
    gateway_connected: (flags & 16) !== 0,
  }
  const before = structuredClone(input)
  const normalized = normalizeTelemetry(input)
  assert.deepEqual(input, before)
  assert.equal(normalized.gt, 0)
  assert.equal(normalized.batteries[0].voltage, 0)
  assert.equal(normalized.car_soc, (flags & 1) === 0 && Number.isFinite(floats[2]) ? floats[2] : undefined)
  assert.equal(normalized.batteries[0].soc, (flags & 2) === 0 && Number.isFinite(floats[3]) ? floats[3] : undefined)
  assert.deepEqual(normalizeTelemetry(normalized), normalized)
  const displayed = evTelemetry(normalized)
  for (const key of ['power', 'chargingKw', 'soc']) {
    assert(displayed[key] === undefined || Number.isFinite(displayed[key]))
  }
  assert.equal(connectionStatus(normalized), input.data_source === 'igw' ? input.gateway_connected : input.mqtt_connected)
  // The authoritative W field must win even when the legacy kW field overflows.
  assert.equal(evTelemetry({ ...normalized, ev_charging_power: 0 }).power, 0)
}
