export function formatPower(w: number | undefined) {
  const v = Math.abs(Math.floor(w || 0))
  const sign = w && w < 0 ? '-' : ''
  return v >= 1000 ? sign + (v / 1000).toFixed(1) + 'kW' : sign + v + 'W'
}

export function formatUptime(s: number) {
  if (s < 60) return s + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60)
  return h + 'h ' + m + 'm'
}

export function formatDuration(s: number | undefined) {
  if (!s || s <= 0) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
  return m + ':' + String(sec).padStart(2, '0')
}

/** Inverter-control flags owned on Cerbo MQTT inverter/state.booleans. */
export const INVERTER_CONTROL_FLAGS = [
  'only_charging',
  'no_feed',
  'house_support',
  'charge_battery',
  'do_not_supply_charger',
  'set_limit_to_ev_charger',
  'minimize_charging',
] as const

/** Bare key (`only_charging`) or HA-style id (`input_boolean.only_charging`). */
export function inverterControlFlagKey(entityOrId: string): string | null {
  const raw = (entityOrId || '').trim()
  if (!raw) return null
  const key = raw.includes('.') ? (raw.split('.').pop() as string) : raw
  return (INVERTER_CONTROL_FLAGS as readonly string[]).includes(key) ? key : null
}

export function isInverterControlFlag(entityOrId: string): boolean {
  return inverterControlFlagKey(entityOrId) !== null
}

/** Header-toggle display: the 7 control flags always use MQTT `booleans`. */
export function resolveHeaderToggleState(
  toggle: { id: string; entity: string },
  mqttBooleans: Record<string, unknown>
): 'on' | 'off' {
  const entityKey = toggle.entity.split('.').pop() || toggle.id
  const rawVal = mqttBooleans[toggle.id] ?? mqttBooleans[entityKey] ?? mqttBooleans[toggle.entity]
  let val: unknown = rawVal
  if (typeof val === 'string') val = val === 'true' || val === '1'
  else if (typeof val === 'number') val = val !== 0
  return val ? 'on' : 'off'
}
