import type { InverterState } from './composables/useInverterState'

/** Go emits numeric zero with availability=false; Python may emit null.
 * Treat both as missing, while preserving measured zero and legacy payloads.
 */
function availableFields<T extends object>(input: T): T {
  const out = { ...input } as Record<string, unknown>
  const availability = out.telemetry_available as Record<string, boolean> | undefined
  for (const [key, available] of Object.entries(availability || {})) {
    if (available === false) delete out[key]
  }
  for (const [key, value] of Object.entries(out)) {
    if (value === null || (typeof value === 'number' && !Number.isFinite(value))) delete out[key]
  }
  return out as T
}

export function normalizeTelemetry(input: InverterState): InverterState {
  const out = availableFields(input)
  if (out.batteries) out.batteries = out.batteries.map(availableFields)
  if (out.mppt_chargers) out.mppt_chargers = out.mppt_chargers.map(availableFields)
  if (out.pv_inverters) out.pv_inverters = out.pv_inverters.map(availableFields)
  return out
}

/** WebSocket reachability does not imply the backend's MQTT connection is live. */
export function connectionStatus(input: InverterState): boolean | undefined {
  if (input.data_source === 'igw' && typeof input.gateway_connected === 'boolean') {
    return input.gateway_connected
  }
  return typeof input.mqtt_connected === 'boolean' ? input.mqtt_connected : undefined
}

export function formatMeasurement(value: number | undefined, digits: number, unit: string): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) + unit : '—'
}
