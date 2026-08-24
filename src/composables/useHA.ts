import { computed, type Ref, ref, watch } from 'vue'
import type {
  HaCoverDisplay,
  HaMediaPlayerDisplay,
  HaNumberDisplay,
  HaSceneDisplay,
  HaSensorDisplay,
  HaWeatherDisplay,
} from '../types/ha'
import { state } from './useInverterState'

// HA initialization and cleanup
function coerceBool(v: unknown): boolean {
  if (v === true || v === 1 || v === 'true' || v === '1' || v === 'on' || v === 'online')
    return true
  return false
}

// Rich HA entity displays pushed by the backend in state.ha_filtered
// ({sensors[], numbers[], covers[], media_players[], scenes[], weather}).
function populateFiltered(
  target: {
    sensors: Ref<HaSensorDisplay[]>
    numbers: Ref<HaNumberDisplay[]>
    covers: Ref<HaCoverDisplay[]>
    mediaPlayers: Ref<HaMediaPlayerDisplay[]>
    scenes: Ref<HaSceneDisplay[]>
    weather: Ref<HaWeatherDisplay | null>
  },
  filtered: Record<string, unknown> | null | undefined
) {
  const f = filtered ?? {}
  target.sensors.value = (f.sensors as HaSensorDisplay[]) ?? []
  target.numbers.value = (f.numbers as HaNumberDisplay[]) ?? []
  target.covers.value = (f.covers as HaCoverDisplay[]) ?? []
  target.mediaPlayers.value = (f.media_players as HaMediaPlayerDisplay[]) ?? []
  target.scenes.value = (f.scenes as HaSceneDisplay[]) ?? []
  target.weather.value = (f.weather as HaWeatherDisplay) ?? null
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

  // HA lifecycle: rich entity cards follow state.ha_filtered pushed by the backend.
  const stopFilteredWatch = watch(
    () => state.value.ha_filtered,
    (filtered) =>
      populateFiltered(
        {
          sensors: haSensors,
          numbers: haNumbers,
          covers: haCovers,
          mediaPlayers: haMediaPlayers,
          scenes: haScenes,
          weather: haWeather,
        },
        filtered
      ),
    { immediate: true, deep: true }
  )

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  function initHa() {}
  function cleanupHa() {
    stopFilteredWatch()
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
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
