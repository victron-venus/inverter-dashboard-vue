<template>
  <ErrorBoundary>
    <div id="app" class="h-screen flex flex-col p-1 select-none overflow-hidden">
      <!-- Dashboard Header -->
      <div class="flex items-center justify-between mb-1">
        <AppHeader
          :dryRun="coerceBool(state.dry_run)"
          :essClass="essClass"
          :essText="essText"
          :headerToggles="headerToggles"
          :toggleStates="headerToggleStates"
          :isDark="isDark"
          @send="send"
          @toggle-theme="toggleTheme"
          @open-settings="settingsOpen = true"
        />
      </div>

      <!-- Dashboard Content -->
      <div class="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 scrollbar-hide">
        <NotificationBanner />

        <CameraPopup />

        <SettingsDrawer
          :open="settingsOpen"
          @close="settingsOpen = false"
          @save="onSaveSettings"
        />
        <DailyStats />

        <StatCards
          :gt="state.gt"
          :g1="state.g1"
          :g2="state.g2"
          :tt="state.tt"
          :t1="state.t1"
          :t2="state.t2"
          :solarTotal="state.solar_total"
          :mpptTotal="mpptTotal"
          :tasmotaTotal="tasmotaTotal"
          :batterySoc="state.battery_soc"
          :batteryPower="state.battery_power"
          :batteryVoltage="state.battery_voltage"
          :batteryCurrent="state.battery_current"
          :setpoint="state.setpoint"
          :inverterState="state.inverter_state"
        />

        <div class="grid grid-cols-1 md:grid-cols-12 gap-1">
          <div class="md:col-span-8 h-[280px]">
            <ChartPanel :chartOption="chartOption" />
          </div>
          <div class="md:col-span-4">
            <SidePanel
              :features="state.features"
              :evCharging="evCharging"
              :evPower="evPower"
              :evPowerWatts="evPowerWatts"
              :evChargingKw="evChargingKw"
              :evLoadPower="evLoadPower"
              :carSoc="state.car_soc"
              :waterLevel="state.water_level"
              :waterValve="waterValveState"
              :pumpSwitch="pumpSwitchState"
              :pumpSwitchEntity="pumpSwitchEntity"
              :waterValveEntity="waterValveEntity"
              :dishwasherRunning="dishwasherRunning"
              :dishwasherDuration="state.dishwasher_duration"
              :washerRunning="washerRunning"
              :washerTime="state.washer_time"
              :washerPower="state.washer_power"
              :dryerRunning="dryerRunning"
              :dryerTime="state.dryer_time"
              :dryerPower="state.dryer_power"
              :homeButtons="homeButtons"
              :buttonStates="buttonStates"
              :haSensors="haSensors"
              :haNumbers="haNumbers"
              :haCovers="haCovers"
              :haMediaPlayers="haMediaPlayers"
              :haScenes="haScenes"
              :haWeather="haWeather"
              :showEv="uiSettings.show_ev !== false"
              :showWasher="uiSettings.show_washer !== false"
              :showDryer="uiSettings.show_dryer !== false"
              :showDishwasher="uiSettings.show_dishwasher !== false"
              :showHomeSection="uiSettings.show_home_section !== false"
              @send="send"
              @number-set="onNumberSet"
              @cover-position="onCoverPosition"
              @media-control="onMediaControl"
              @scene-activate="onSceneActivate"
            />
          </div>
        </div>

        <BatterySolarPanel
          :batteries="batteries"
          :solarSources="solarSources"
          :showBatteries="true"
          :showSolar="true"
        />

        <LoadsTable :sortedLoads="sortedLoads" />
      </div>

      <!-- Bottom Status Bar -->
      <StatusBar
        :haEnabled="haEnabled"
        :haConnected="haConnected"
        :mqttConnected="mqttConnected"
        :haMqttConnected="null"
        :uptime="state.uptime"
        :appVersion="state.dashboard_version || ''"
        :stateVersion="state.version"
      />

      <ConsoleLog :lines="state.console || []" />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import BatterySolarPanel from './components/BatterySolarPanel.vue'
import CameraPopup from './components/CameraPopup.vue'
import ChartPanel from './components/ChartPanel.vue'
import ConsoleLog from './components/ConsoleLog.vue'
import DailyStats from './components/DailyStats.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import LoadsTable from './components/LoadsTable.vue'
import NotificationBanner from './components/NotificationBanner.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import SidePanel from './components/SidePanel.vue'
import StatCards from './components/StatCards.vue'
import StatusBar from './components/StatusBar.vue'
import { addHistoryPoint, useChart } from './composables/useChart'
import { useConnection } from './composables/useConnection'
import { useHA } from './composables/useHA'
import { initSystemNotifications } from './composables/useSystemNotifications'
import { useTheme } from './composables/useTheme'
import { formatPower } from './utils'

const {
  state,
  mqttConnected,
  connectMqtt,
  send: wsSend,
  cleanup: cleanupConnection,
} = useConnection()
const {
  haEnabled,
  haConnected,
  homeButtons,
  buttonStates,
  headerToggles,
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
  cleanupHa,
} = useHA()
const { isDark, toggleTheme } = useTheme()
const settingsOpen = ref(false)
const uiSettings = computed(() => state.value.ui_config?.settings ?? {})
function onSaveSettings(patch: Record<string, unknown>) {
  send('set_settings', patch)
}
const { chartOption, forceUpdateChart } = useChart(isDark)

async function send(action: string, payload: Record<string, unknown> = {}) {
  wsSend(action, payload)
}

async function onNumberSet(entityId: string, value: number) {
  send('number_set', { entity: entityId, value })
}

async function onCoverPosition(entityId: string, position: number) {
  send('set_cover_position', { entity: entityId, position })
}

async function onMediaControl(entityId: string, action: string) {
  send('media_player', { entity: entityId, mp_action: action })
}

async function onSceneActivate(entityId: string) {
  send('scene_activate', { entity: entityId })
}

const essClass = computed(() => {
  const m = state.value.ess_mode
  if (!m) return 'off'
  if (m.mode_name === 'Off' || m.mode_name === 'Charger only') return 'off'
  return 'on'
})

const essText = computed(() => {
  const m = state.value.ess_mode
  if (!m) return 'ESS'
  if (m.is_external) return 'External'
  return m.mode_name || 'ESS'
})

const mpptTotal = computed(() => state.value.mppt_total || 0)
const tasmotaTotal = computed(() => state.value.tasmota_total || 0)

const evCharging = computed(() => {
  const kw = parseFloat(String(state.value.ev_charging_kw)) || 0
  return kw > 0 ? kw.toFixed(1) + 'kW' : '0'
})

const evPower = computed(() => formatPower(state.value.ev_power))
const evPowerWatts = computed(() => Math.abs(state.value.ev_power || 0))
const evChargingKw = computed(() => Number.parseFloat(String(state.value.ev_charging_kw)) || 0)
const evLoadPower = computed(() => {
  const loads = state.value.loads
  if (!loads) return 0
  for (const [key, val] of Object.entries(loads)) {
    if (key.toLowerCase().includes('ev') || key.toLowerCase().includes('charger')) return val
  }
  return 0
})

const sortedLoads = computed(() => {
  const loads = state.value.loads || {}
  const uiConfig = state.value.ui_config || {}
  const loadsConfig = uiConfig.loads || {}
  const hiddenLoads = loadsConfig.hidden || ['solar_shed']
  const minWatts = loadsConfig.min_watts || 10
  return Object.entries(loads)
    .filter(([name, v]) => v > minWatts && !hiddenLoads.includes(name))
    .sort((a, b) => b[1] - a[1])
})

const batteries = computed(() => {
  return (state.value.batteries || []).map((b) => ({
    name: b.name || 'Battery',
    voltage: b.voltage || 0,
    current: b.current,
    power: b.power,
    soc: b.soc || 0,
    state: b.state || 'Unknown',
    timeToGo: b.time_to_go || '',
  }))
})

const solarSources = computed(() => {
  const sources: Array<{ name: string; pvVoltage?: number; current?: number; power: number }> = []
  ;(state.value.mppt_chargers || []).forEach((m) => {
    sources.push({
      name: m.name || 'MPPT',
      pvVoltage: m.pv_voltage || 0,
      current: m.current || 0,
      power: m.power || 0,
    })
  })
  ;(state.value.tasmota_individual || []).forEach((power, i) => {
    sources.push({ name: 'PV Inverter ' + (i + 1), power: power || 0 })
  })
  return sources
})

onMounted(async () => {
  await connectMqtt()
  initHa()
  void initSystemNotifications()
})

onUnmounted(() => {
  cleanupConnection()
  cleanupHa()
})
</script>
