import { describe, expect, it } from 'vitest'
import { connectionStatus, normalizeTelemetry } from './telemetry'

describe('Cerbo telemetry availability', () => {
  it('uses backend transport status even when Go serializes unknown power as zero', () => {
    expect(
      connectionStatus({ gt: 0, mqtt_connected: false, telemetry_available: { gt: false } })
    ).toBe(false)
    expect(
      connectionStatus({ data_source: 'igw', mqtt_connected: false, gateway_connected: true })
    ).toBe(true)
    expect(connectionStatus({ gt: 0 })).toBeUndefined()
  })
  it('distinguishes measured zero from unavailable Go scalar and device fields', () => {
    const input = {
      gt: 0,
      g3: 0,
      battery_soc: 0,
      telemetry_available: { gt: true, g3: true, battery_soc: false },
      batteries: [
        { instance: '512', soc: 0, voltage: 0, telemetry_available: { soc: false, voltage: true } },
      ],
    }
    const output = normalizeTelemetry(input)
    expect(output.gt).toBe(0)
    expect(output.g3).toBe(0)
    expect(output.battery_soc).toBeUndefined()
    expect(output.batteries?.[0].soc).toBeUndefined()
    expect(output.batteries?.[0].voltage).toBe(0)
    expect(input.batteries[0].soc).toBe(0)
  })

  it('clears Python null invalidations and preserves legacy measured fields', () => {
    const output = normalizeTelemetry(JSON.parse('{"gt":null,"battery_soc":42,"loads":{}}'))
    expect(output.gt).toBeUndefined()
    expect(output.battery_soc).toBe(42)
    expect(output.loads).toEqual({})
  })
})
