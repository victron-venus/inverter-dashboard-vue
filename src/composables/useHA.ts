import { computed, ref } from 'vue'
import type {
  HaCoverDisplay,
  HaMediaPlayerDisplay,
  HaNumberDisplay,
  HaSceneDisplay,
  HaSensorDisplay,
  HaWeatherDisplay,
} from '../types/ha'
import { state } from './useInverterState'

// HA initialization and cleanup (stubs - implement when needed)
// Note: Actual HA auth flow handled via dashboard server WebSocket

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initHa(): void {
  // Placeholder: HA state loading would go here
  // Currently state comes via WebSocket from dashboard server
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cleanupHa(): void {
  // Placeholder: cleanup resources when component unmounts
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setWindowHidden(_hidden: boolean): void {
  // Placeholder: handle visibility change for polling optimization
}

function coerceBool(v: unknown): boolean {
  if (v === true || v === 1 || v === 'true' || v === '1' || v === 'on' || v === 'online')
    return true
  return false
}

export function useHA() {
  const haSensors = ref<HaSensorDisplay[]>([])
  const haNumbers = ref<HaNumberDisplay[]>([])
  const haCovers = ref<HaCoverDisplay[]>([])
  const haMediaPlayers = ref<HaMediaPlayerDisplay[]>([])
  const haScenes = ref<HaSceneDisplay[]>([])
  const haWeather = ref<HaWeatherDisplay | null>(null)

  const haEnabled = computed(() => !!state.value.ha_direct_connected)
  const haConnected = computed(() => !!state.value.ha_direct_connected)

  const waterValveEntity = computed(() => 'switch.shutoff_valve')
  const pumpSwitchEntity = computed(() => 'switch.pump_switch')

  const waterValveState = computed(() => coerceBool(state.value.water_valve))
  const pumpSwitchState = computed(() => coerceBool(state.value.pump_switch))

  const dishwasherRunning = computed(() => {
    const power = state.value.loads?.dishwasher
    return power !== undefined && (power as number) > 10
  })

  const washerRunning = computed(() => {
    const power = state.value.loads?.washer
    return power !== undefined && (power as number) > 10
  })

  const dryerRunning = computed(() => {
    const power = state.value.loads?.dryer
    return power !== undefined && (power as number) > 10
  })

  const homeButtons = computed(() => {
    const uiConfig = state.value.ui_config || {}
    return uiConfig.home_buttons || []
  })

  const headerToggles = computed(() => {
    const uiConfig = state.value.ui_config || {}
    if (uiConfig.header_toggles && uiConfig.header_toggles.length > 0) {
      return uiConfig.header_toggles
    }
    return [
      { id: 'only_charging', label: 'ONLY CHARGING', entity: 'input_boolean.only_charging' },
      { id: 'no_feed', label: 'NO FEED', entity: 'input_boolean.no_feed' },
      { id: 'house_support', label: 'HOUSE SUPPORT', entity: 'input_boolean.house_support' },
      { id: 'charge_battery', label: 'CHARGE BATTERY', entity: 'input_boolean.charge_battery' },
      {
        id: 'do_not_supply_charger',
        label: 'DO NOT SUPPLY EV',
        entity: 'input_boolean.do_not_supply_charger',
      },
      {
        id: 'set_limit_to_ev_charger',
        label: 'LIMIT TO EV',
        entity: 'input_boolean.set_limit_to_ev_charger',
      },
      {
        id: 'minimize_charging',
        label: 'MINIMIZE CHARGING',
        entity: 'input_boolean.minimize_charging',
      },
    ]
  })

  const buttonStates = computed(() => {
    const states: Record<string, string> = {}
    homeButtons.value.forEach(
      (btn: { id: string; label: string; entity: string; state_key?: string }) => {
        const stateKey = btn.state_key || `home_${btn.id}`
        let val = state.value.booleans?.[stateKey]
        if (typeof val === 'string') val = val === 'true' || val === '1'
        else if (typeof val === 'number') val = val !== 0
        states[btn.id] = val ? 'on' : 'off'
      }
    )
    return states
  })

  const headerToggleStates = computed(() => {
    const states: Record<string, string> = {}
    headerToggles.value.forEach((toggle: { id: string; label: string; entity: string }) => {
      const entityKey = toggle.entity.split('.').pop() || toggle.id
      const rawVal =
        state.value.booleans?.[toggle.id] ??
        state.value.booleans?.[entityKey] ??
        state.value.booleans?.[toggle.entity]
      let val = rawVal
      if (typeof val === 'string') val = val === 'true' || val === '1'
      else if (typeof val === 'number') val = val !== 0
      states[toggle.id] = val ? 'on' : 'off'
    })
    return states
  })

  function initHa() {}
  function cleanupHa() {}
  function setWindowHidden(_hidden: boolean) {}

  return {
    haEnabled,
    haConnected,
    haEntityStates: ref<Record<string, string>>({}),
    haEntityAttributes: ref<Record<string, Record<string, unknown>>>({}),
    homeButtons,
    headerToggles,
    buttonStates,
    headerToggleStates,
    waterValveEntity,
    pumpSwitchEntity,
    waterValveState,
    pumpSwitchState,
    haSensors,
    haNumbers,
    haCovers,
    haMediaPlayers,
    haScenes,
    haWeather,
    dishwasherRunning,
    washerRunning,
    dryerRunning,
    coerceBool,
    initHa,
    sendHaOrMqtt: () => {},
    cleanupHa,
    setWindowHidden,
  }
}
