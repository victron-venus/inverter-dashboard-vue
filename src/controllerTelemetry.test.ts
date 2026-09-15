import { describe, expect, it } from 'vitest'
import { essStatus, evTelemetry } from './controllerTelemetry'
import { normalizeTelemetry } from './telemetry'

describe('controller ESS state', () => {
  it('recognizes External control independently of hardware mode or HA', () => {
    expect(essStatus({ hub4_mode: 3 })).toEqual({ text: 'External', active: true, available: true })
    expect(essStatus({ is_external: true, mode_name: 'External control' }).active).toBe(true)
    expect(essStatus({ hub4_mode: 1, battery_life_state: 9 }).text).toBe('Keep batteries charged')
  })
  it('distinguishes unknown ESS from a confirmed inactive mode', () => {
    expect(essStatus(undefined)).toEqual({ text: 'ESS —', active: false, available: false })
    expect(essStatus({ hub4_mode: 0, mode_name: 'Unknown (0)', is_external: false }).available).toBe(false)
    expect(essStatus({ mode_name: 'Off' })).toEqual({ text: 'Off', active: false, available: true })
  })
})

describe('EV backend contract', () => {
  it.each(['mqtt', 'igw'])('preserves zero-power discovery over %s', (source) => {
    const data = normalizeTelemetry({
      data_source: source, ha_connected: false, features: { ev: false },
      ev_present: true, evcharger_present: true,
      ev_charging_power: 0, car_charging_power: 0, car_soc: 0,
      telemetry_available: { ev_charging_power: true, car_charging_power: true, car_soc: true },
    })
    expect(evTelemetry(data)).toEqual({ power: 0, chargingKw: 0, soc: 0, present: true })
  })
  it('uses native W fields before legacy values and converts vehicle power once', () => {
    expect(evTelemetry({ ev_charging_power: 7400, ev_power: 1, car_charging_power: 3200, ev_charging_kw: 99, car_soc: 66 }))
      .toEqual({ power: 7400, chargingKw: 3.2, soc: 66, present: true })
  })
  it('preserves the legacy vehicle W and wallbox kW contract', () => {
    expect(evTelemetry({ ev_power: 3200, ev_charging_kw: 7.4, car_soc: 66 }))
      .toEqual({ power: 7400, chargingKw: 3.2, soc: 66, present: true })
  })
  it('discovers devices without requiring SoC or a nonzero reading', () => {
    expect(evTelemetry({ discovered_water_ev: [{ kind: 'evcharger', instance: 41, name: 'Garage' }] }))
      .toEqual({ power: undefined, chargingKw: undefined, soc: undefined, present: true })
  })
  it('does not replace missing measurements with zero', () => {
    const data = normalizeTelemetry(JSON.parse('{"ev_power":null,"ev_charging_kw":0,"telemetry_available":{"ev_charging_kw":false}}'))
    expect(evTelemetry(data)).toEqual({ power: undefined, chargingKw: undefined, soc: undefined, present: false })
  })
})
