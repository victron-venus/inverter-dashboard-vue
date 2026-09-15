import type { InverterState } from './composables/useInverterState'

export interface ActiveLoad {
  id: string
  name: string
  value: number
  isGeneration: boolean
}

function loadMinimum(threshold: number | undefined): number {
  return typeof threshold === 'number' && Number.isFinite(threshold) ? Math.max(0, threshold) : 2
}

function loadName(id: string, names: InverterState['load_names']): string {
  return names?.[id]?.trim() || id.replace(/ Power 1S$/i, '').replace(/_/g, ' ') || id
}

function hiddenLoad(hidden: string[], id: string, name: string): boolean {
  // Preserve saved exclusions from both instance-keyed and legacy name-keyed payloads.
  const normalizedName = name.trim().replace(/_/g, ' ').toLowerCase()
  return hidden.includes(id) || hidden.some(value => value.trim().replace(/_/g, ' ').toLowerCase() === normalizedName)
}

/** Native clamp identity remains stable when its Cerbo display name changes. */
export function activeLoads(state: InverterState): ActiveLoad[] {
  const config = state.ui_config?.loads
  const hidden = config?.hidden ?? []
  const minimum = loadMinimum(config?.min_watts)
  const rows: ActiveLoad[] = []
  for (const [id, value] of Object.entries(state.loads ?? {})) {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) <= minimum) continue
    const name = loadName(id, state.load_names)
    if (hiddenLoad(hidden, id, name)) continue
    rows.push({ id, name, value, isGeneration: value < 0 })
  }
  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)
    || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function waterPresent(state: InverterState): boolean {
  return state.discovered_water_ev?.some(({ kind }) => kind === 'tank' || kind === 'pump') === true
    || state.water_level !== undefined || typeof state.pump_switch === 'boolean'
    || typeof state.water_valve === 'boolean'
}

export function waterControlAvailable(state: InverterState, which: 'pump' | 'valve'): boolean {
  const available = which === 'pump'
    ? state.water_pump_controls_available : state.water_valve_controls_available
  return (available ?? state.water_controls_available) === true
}
