import type { InverterState } from './composables/useInverterState'

/** ESS is controller/settings state, independent of the inverter's hardware Mode. */
export function essStatus(mode: InverterState['ess_mode']) {
  const unknown = { text: 'ESS —', active: false, available: false }
  if (!mode) return unknown
  if (mode.hub4_mode === 3 || mode.is_external === true) {
    return { text: 'External', active: true, available: true }
  }
  const name = mode.mode_name?.trim()
  if (name && !/^unknown\b/i.test(name)) {
    return { text: name, active: name !== 'Off' && name !== 'Charger only', available: true }
  }
  if (mode.hub4_mode === 1 && typeof mode.battery_life_state === 'number'
      && Number.isInteger(mode.battery_life_state) && mode.battery_life_state >= 0) {
    let text = 'Optimized (BatteryLife)'
    if (mode.battery_life_state === 9) text = 'Keep batteries charged'
    else if (mode.battery_life_state === 0 || mode.battery_life_state === 10) text = 'Optimized without BatteryLife'
    return { text, active: true, available: true }
  }
  return unknown
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Cerbo service power is W; the legacy wallbox charging field is kW. */
export function evTelemetry(input: InverterState) {
  const legacyChargerKw = finite(input.ev_charging_kw)
  const power = finite(input.ev_charging_power)
    ?? (legacyChargerKw === undefined ? undefined : legacyChargerKw * 1000)
  const carPower = finite(input.car_charging_power) ?? finite(input.ev_power)
  const chargingKw = carPower === undefined ? undefined : carPower / 1000
  const soc = finite(input.car_soc)
  const present = input.ev_present === true || input.evcharger_present === true
    || input.discovered_water_ev?.some((device) => device.kind === 'ev' || device.kind === 'evcharger') === true
    || power !== undefined || chargingKw !== undefined || soc !== undefined
  return { power, chargingKw, soc, present }
}
