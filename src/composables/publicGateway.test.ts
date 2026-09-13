import { describe, expect, it } from 'vitest'
import { snapshotToState } from './publicGateway'

describe('snapshotToState', () => {
  it('ignores disconnected devices and avoids guessing between multiple batteries', () => {
    const disconnected = snapshotToState({
      solarcharger: { '1/Connected': 0, '1/Yield/Power': 500 },
      battery: { '512/Connected': 0, '512/Soc': 65 },
    })
    expect(disconnected.solar_total).toBeUndefined()
    expect(disconnected.battery_soc).toBeUndefined()
    expect(disconnected.batteries).toEqual([])
    const ambiguous = snapshotToState({
      battery: {
        '1/ProductName': 'SmartShunt',
        '1/Soc': 80,
        '2/Soc': 70,
      },
    })
    expect(ambiguous.battery_soc).toBeUndefined()
    expect(ambiguous.batteries).toHaveLength(2)
  })

  it('maps native grid meters and vehicle SOC without controller data', () => {
    const result = snapshotToState({
      grid: { '30/Ac/L1/Power': 70 },
      ev: { '22/Soc': 78, '22/Ac/Power': 3200 },
    })
    expect(result.gt).toBe(70)
    expect(result.car_soc).toBe(78)
    expect(result.ev_power).toBe(3200)
  })
  it('maps grid/load/battery tiles and strips nulls', () => {
    const state = snapshotToState({
      system: {
        '0/Ac/Grid/L1/Power': 100,
        '0/Ac/Grid/L2/Power': 200,
        '0/Ac/Consumption/L1/Power': 300,
        '0/Ac/Consumption/L2/Power': 50,
        '0/Dc/Battery/Soc': 61,
        '0/Dc/Battery/Voltage': 50.0,
        '0/Dc/Battery/Current': -10,
        '0/Dc/Battery/Power': -500,
        '0/Dc/Pv/Power': 120,
      },
      battery: {
        '512/ProductName': 'JBD Chain 1',
        '512/Dc/0/Voltage': 50.1,
        '512/Dc/0/Current': -5,
        '512/Dc/0/Power': -250,
        '512/Soc': 40,
        '289/CustomName': 'SmartShunt',
        '289/Dc/0/Voltage': 50.2,
        '289/Dc/0/Current': -10,
        '289/Dc/0/Power': -502,
      },
      solarcharger: {
        '1/CustomName': 'MPPT A',
        '1/Yield/Power': 120,
        '1/Pv/V': 40,
        '1/Dc/0/Current': 2,
      },
      vebus: {
        '290/State': 3,
        '290/Hub4/L1/AcPowerSetpoint': -400,
      },
      acload: {
        '10/CustomName': 'washer',
        '10/Ac/Power': 12,
      },
    })

    expect(state.ok).toBe(true)
    expect(state.gt).toBe(300)
    expect(state.tt).toBe(350)
    expect(state.g1).toBe(100)
    expect(state.g2).toBe(200)
    expect(state.mppt_total).toBe(120)
    expect(state.solar_total).toBe(120)
    expect(state.inverter_state).toBe('Bulk')
    expect(state.setpoint).toBe(-400)
    expect(state.loads?.washer).toBe(12)
    expect(state.batteries?.some((b) => b.name === 'JBD Chain 1')).toBe(true)
    expect(state.batteries?.some((b) => (b.name || '').toLowerCase().includes('shunt'))).toBe(true)
    expect(state.features?.public_gateway).toBe(true)
    expect(state.features?.writes_disabled).toBe(true)
    expect(state.ha_direct_connected).toBe(false)
    // Measured system SoC is authoritative.
    expect(state.battery_soc).toBe(61)
  })

  it('handles empty snapshot', () => {
    const state = snapshotToState({})
    expect(state.ok).toBe(true)
    expect(state.solar_total).toBeUndefined()
  })
})
