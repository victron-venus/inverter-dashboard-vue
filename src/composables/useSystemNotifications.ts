import { ref, watch } from 'vue'
import { state } from './useInverterState'

// System event watcher ported from inverter-desktop's useSystemNotifications,
// delivering via the browser Notification API instead of the Tauri plugin.
// Watches dashboard-level transitions: EV charging start/stop, water valve
// open/close, pump on/off, low battery SoC, grid loss.

const NOTIFY_COOLDOWN_MS = 60_000
const LOW_SOC_THRESHOLD = 20

const prevEvChargingKw = ref<number | null>(null)
const prevWaterValve = ref<boolean | null>(null)
const prevPumpSwitch = ref<boolean | null>(null)
const prevSoc = ref<number | null>(null)
const prevGridW = ref<number | null>(null)
const lastNotifyTime = new Map<string, number>()
let initialized = false

/** Ask the browser for notification permission; resolves to the decision. */
export async function requestNotificationPermission(): Promise<string> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  }
  return Notification.permission
}

export function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body })
  } catch {
    // Some browsers require a ServiceWorkerRegistration — ignore.
  }
}

function shouldNotify(key: string, now: number): boolean {
  const last = lastNotifyTime.get(key) || 0
  return now - last >= NOTIFY_COOLDOWN_MS
}

function fire(key: string, title: string, body: string) {
  const now = Date.now()
  if (!shouldNotify(key, now)) return
  lastNotifyTime.set(key, now)
  notify(title, body)
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function initSystemNotifications() {
  if (initialized) return
  initialized = true

  watch(
    () => state.value,
    (st) => {
      // EV charging start/stop
      const kw = num(st.ev_charging_kw)
      if (kw !== null) {
        const prev = prevEvChargingKw.value
        if (prev !== null && prev === 0 && kw > 0) {
          fire('ev-start', 'EV Charging Started', `Charging at ${kw.toFixed(1)} kW`)
        } else if (prev !== null && prev > 0 && kw === 0) {
          fire('ev-stop', 'EV Charging Stopped', 'Charging has ended')
        }
        prevEvChargingKw.value = kw
      }

      // Water valve / pump transitions
      if (typeof st.water_valve === 'boolean') {
        const prev = prevWaterValve.value
        if (prev !== null && st.water_valve !== prev) {
          fire(
            st.water_valve ? 'valve-open' : 'valve-close',
            'Water Valve',
            st.water_valve ? 'Valve OPENED' : 'Valve CLOSED'
          )
        }
        prevWaterValve.value = st.water_valve
      }
      if (typeof st.pump_switch === 'boolean') {
        const prev = prevPumpSwitch.value
        if (prev !== null && st.pump_switch !== prev) {
          fire(
            st.pump_switch ? 'pump-on' : 'pump-off',
            'Water Pump',
            st.pump_switch ? 'Pump ON' : 'Pump OFF'
          )
        }
        prevPumpSwitch.value = st.pump_switch
      }

      // Low battery SoC warning (once per crossing, cooldown-guarded)
      const soc = num(st.battery_soc)
      if (soc !== null) {
        const prev = prevSoc.value
        if (prev !== null && prev > LOW_SOC_THRESHOLD && soc <= LOW_SOC_THRESHOLD) {
          fire('battery-low', 'Battery Low', `SoC at ${soc.toFixed(0)}%`)
        }
        prevSoc.value = soc
      }

      // Grid loss (power drops to ~0 after being present)
      const grid = num(st.gt)
      if (grid !== null) {
        const prev = prevGridW.value
        if (prev !== null && prev > 50 && grid <= 1) {
          fire('grid-lost', 'Grid Lost', 'No grid power reported')
        }
        prevGridW.value = grid
      }
    }
  )
}
