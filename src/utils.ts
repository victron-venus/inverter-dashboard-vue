export function formatPower(w: number | undefined) {
  if (typeof w !== 'number' || !Number.isFinite(w)) return '—'
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

export interface DashboardControl {
  id: string
  label: string
  entity: string
  state_key?: string
}

export const DEFAULT_INVERTER_CONTROLS: DashboardControl[] = [
  { id: 'only_charging', label: 'ONLY CHARGING', entity: 'only_charging' },
  { id: 'no_feed', label: 'NO FEED', entity: 'no_feed' },
  { id: 'house_support', label: 'HOUSE SUPPORT', entity: 'house_support' },
  { id: 'charge_battery', label: 'CHARGE BATTERY', entity: 'charge_battery' },
  { id: 'do_not_supply_charger', label: 'DO NOT SUPPLY EV', entity: 'do_not_supply_charger' },
  { id: 'set_limit_to_ev_charger', label: 'LIMIT TO EV', entity: 'set_limit_to_ev_charger' },
  { id: 'minimize_charging', label: 'MINIMIZE CHARGING', entity: 'minimize_charging' },
]

/** Bare key (`only_charging`) or HA-style id (`input_boolean.only_charging`). */
export function inverterControlFlagKey(entityOrId: string): string | null {
  const raw = (entityOrId || '').trim()
  if (!raw) return null
  const key = raw.startsWith('input_boolean.') ? raw.slice('input_boolean.'.length) : raw
  return (INVERTER_CONTROL_FLAGS as readonly string[]).includes(key) ? key : null
}

export function isInverterControlFlag(entityOrId: string): boolean {
  return inverterControlFlagKey(entityOrId) !== null
}

/** Header-toggle display: the 7 control flags always use MQTT `booleans`. */
export type ControlState = 'on' | 'off' | 'unavailable'

export function controlBooleanState(value: unknown): ControlState {
  if (value === true || value === 1 || value === 'true' || value === '1' || value === 'on') return 'on'
  if (value === false || value === 0 || value === 'false' || value === '0' || value === 'off') return 'off'
  return 'unavailable'
}

export function resolveHeaderToggleState(
  toggle: Pick<DashboardControl, 'id' | 'entity' | 'state_key'>,
  mqttBooleans: Record<string, unknown>
): ControlState {
  const flag = inverterControlFlagKey(toggle.entity)
  const keys = flag
    ? [flag, toggle.entity]
    : [toggle.state_key ?? toggle.id, toggle.entity.split('.').pop() || toggle.id, toggle.entity]
  for (const key of keys) {
    // Explicit null means unknown, never a reason to use an older alias.
    if (Object.prototype.hasOwnProperty.call(mqttBooleans, key)) return controlBooleanState(mqttBooleans[key])
  }
  return 'unavailable'
}
