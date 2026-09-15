import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import App from './App.vue'
import { mqttConnected, state } from './composables/useInverterState'
import { normalizeTelemetry } from './telemetry'
import { i18n } from './i18n'
import BatterySolarPanel from './components/BatterySolarPanel.vue'
import StatCards from './components/StatCards.vue'

const commands = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./composables/useConnection', async () => {
  const shared = await import('./composables/useInverterState')
  const { ref } = await import('vue')
  return { useConnection: () => ({
    state: shared.state, mqttConnected: shared.mqttConnected, commandConnected: ref(true),
    connectMqtt: vi.fn(), send: commands.send, cleanup: vi.fn(),
  }) }
})
vi.mock('./composables/useChart', () => ({ useChart: () => ({ chartOption: {}, forceUpdateChart: vi.fn() }) }))
vi.mock('./composables/useSystemNotifications', () => ({ initSystemNotifications: vi.fn() }))
vi.mock('./composables/useNotifications', () => ({ setNotificationCommandSender: vi.fn() }))
vi.mock('./composables/useTheme', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }))
vi.mock('./config/publicMode', () => ({ isPublicMode: () => false }))

let view: VueWrapper | undefined
function render() {
  view = mount(App, { global: {
    plugins: [i18n],
    stubs: { ChartPanel: true, CameraPopup: true, DailyStats: true, SettingsDrawer: true,
      NotificationBanner: true, NotificationHistory: true },
  } })
  return view
}
beforeEach(() => { state.value = {}; mqttConnected.value = true; commands.send.mockClear() })
afterEach(() => { view?.unmount(); view = undefined; vi.unstubAllGlobals() })

describe('native dashboard sections', () => {
  it('renders named loads including generation and small loads in desktop order', () => {
    state.value = {
      loads: { '1': -200, '2': 200, '3': 5, '4': 2, solar_shed: 20 },
      load_names: { '1': 'Roof solar', '2': 'Air conditioning', '3': 'Router' },
    }
    const wrapper = render()
    const rows = wrapper.findAll('[data-testid="active-load"]')
    expect(rows.map(row => row.findAll('span').map(span => span.text()))).toEqual([
      ['Air conditioning', '200W'], ['Roof solar', '-200W'], ['solar shed', '20W'], ['Router', '5W'],
    ])
    expect(rows[1].get('span:last-child').classes()).toContain('text-battery')
  })

  it('retains saved instance/name exclusions, explicit zero threshold and section visibility', async () => {
    state.value = {
      loads: { '1': 30, '2': 25, '3': 1, '4': 50 },
      load_names: { '1': 'Kitchen', '2': 'Water pump', '3': 'Standby', '4': 'Hidden' },
      ui_config: { loads: { hidden: ['1', 'water_pump', 'Hidden'], min_watts: 0 } },
    }
    const wrapper = render()
    expect(wrapper.get('[data-testid="active-load"]').findAll('span').map(span => span.text())).toEqual(['Standby', '1W'])
    expect(wrapper.findAll('[data-testid="active-load"]')).toHaveLength(1)
    state.value = { ...state.value, ui_config: { settings: { show_active_loads: false } } }
    await nextTick()
    expect(wrapper.find('[data-testid="active-loads"]').exists()).toBe(false)
  })

  it('passes backend SoC unchanged to the main tile and renders only real battery entries', async () => {
    state.value = {
      battery_soc: 73.25, battery_voltage: 51,
      batteries: [{ instance: 0, name: 'SmartShunt', soc: 90 }, { instance: 2, name: 'Virtual battery', soc: 0 }],
    }
    const wrapper = render()
    expect(wrapper.getComponent(StatCards).props('batterySoc')).toBe(73.25)
    expect(wrapper.getComponent(StatCards).text()).toContain('73%')
    const batteryPanel = wrapper.getComponent(BatterySolarPanel)
    expect(batteryPanel.text()).toContain('SmartShunt')
    expect(batteryPanel.text()).toContain('Virtual battery')
    expect(batteryPanel.text()).not.toContain('Bank')
    expect(batteryPanel.props('batteries')).toHaveLength(2)
    state.value = { battery_soc: 0, batteries: [{ instance: 0, name: 'Bank', soc: 0 }] }
    await nextTick()
    expect(wrapper.getComponent(StatCards).text()).toContain('0%')
    expect(batteryPanel.props('batteries')).toHaveLength(1)
    expect(batteryPanel.text()).toContain('Bank')
    state.value = { battery_soc: 60 }
    await nextTick()
    expect(batteryPanel.props('batteries')).toEqual([])
  })

  it('keeps discovered water visible with unknown readings and preserves a measured zero percent', async () => {
    const wrapper = render()
    expect(wrapper.find('[data-testid="water-section"]').exists()).toBe(false)
    state.value = { features: { water: false }, discovered_water_ev: [{ kind: 'tank', instance: 0 }] }
    await nextTick()
    expect(wrapper.get('[data-testid="water-section"]').text()).toContain('—')
    state.value = normalizeTelemetry(JSON.parse('{"water_level":0,"pump_switch":null,"water_valve":null}'))
    await nextTick()
    expect(wrapper.get('[data-testid="water-section"]').text()).toContain('0.0%')
    expect(wrapper.get('[aria-label="Pump manual mode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Pump manual mode"]').attributes('aria-pressed')).toBeUndefined()
    state.value = {}
    await nextTick()
    expect(wrapper.get('[data-testid="water-section"]').text()).toContain('—')
  })

  it('recognizes native EV clamp names while retaining legacy keyed loads and visibility settings', async () => {
    state.value = { loads: { '81': 1200 }, load_names: { '81': 'EV Charger' }, features: { ev: false } }
    const wrapper = render()
    expect(wrapper.find('[data-testid="ev-section"]').exists()).toBe(true)
    state.value = { loads: { ev_charger: 500 }, features: { ev: false } }
    await nextTick()
    expect(wrapper.find('[data-testid="ev-section"]').exists()).toBe(true)
    state.value = { loads: { '81': Number.NaN }, load_names: { '81': 'EV Charger' }, features: { ev: false } }
    await nextTick()
    expect(wrapper.find('[data-testid="ev-section"]').exists()).toBe(false)
    state.value = { loads: { '81': 1200 }, load_names: { '81': 'EV Charger' }, features: { ev: false },
      ui_config: { settings: { show_ev: false } } }
    await nextTick()
    expect(wrapper.find('[data-testid="ev-section"]').exists()).toBe(false)
  })

  it.each(['mqtt', 'igw'])('uses %s transport and per-target water capabilities without HA or controller dependency', async (source) => {
    state.value = {
      data_source: source, native_connected: true, mqtt_connected: source === 'mqtt',
      gateway_connected: source === 'igw', controller_controls_available: false,
      ha_connected: false, features: { ha: false, water: false }, water_level: 0.5,
      pump_switch: false, water_valve: true, water_pump_mode: 2, pump_mode: 0,
      water_valve_mode: 1, water_controls_available: true,
      water_pump_controls_available: true, water_valve_controls_available: false,
    }
    const wrapper = render()
    expect(wrapper.get('[data-testid="transport-status"]').text()).toBe(source.toUpperCase())
    expect(wrapper.get('[data-testid="water-section"]').text()).toContain('0.5%')
    await wrapper.get('[aria-label="Pump manual mode"]').trigger('click')
    await wrapper.get('[aria-label="Pump automatic mode"]').trigger('click')
    await wrapper.get('[aria-label="Valve manual mode"]').trigger('click')
    await wrapper.get('[aria-label="Valve automatic mode"]').trigger('click')
    expect(commands.send.mock.calls).toEqual([
      ['water_mode', { which: 'pump', mode: 1 }], ['water_mode', { which: 'pump', mode: 0 }],
    ])
    expect(wrapper.get('[aria-label="Pump manual mode"]').attributes('aria-pressed')).toBe('false')
    state.value = { ...state.value, native_connected: false }
    await nextTick()
    expect(wrapper.get('[aria-label="Pump manual mode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Pump automatic mode"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="transport-status"]').attributes('data-connected')).toBe('false')
    await wrapper.get('[aria-label="Pump manual mode"]').trigger('click')
    expect(commands.send).toHaveBeenCalledTimes(2)
  })

  it('keeps IGW header flags and DRY usable while the direct broker is disconnected', async () => {
    state.value = {
      data_source: 'igw', native_connected: true, mqtt_connected: false, gateway_connected: true,
      controller_controls_available: true, booleans: { only_charging: false }, dry_run: false,
      ess_mode: { hub4_mode: 3 },
    }
    const wrapper = render()
    const onlyCharging = wrapper.findAll('button').find(button => button.text() === 'ONLY CHARGING')
    expect(onlyCharging).toBeDefined()
    expect(onlyCharging?.attributes('disabled')).toBeUndefined()
    await onlyCharging?.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'DRY')?.trigger('click')
    expect(commands.send.mock.calls).toEqual([
      ['toggle', { entity: 'only_charging', state: 'on' }], ['dry_run', { value: true }],
    ])
    state.value = { ...state.value, ui_config: { settings: { show_header_toggles: false } } }
    await nextTick()
    expect(wrapper.findAll('button').some(button => button.text() === 'ONLY CHARGING')).toBe(false)
  })
})
