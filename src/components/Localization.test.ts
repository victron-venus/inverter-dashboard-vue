import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { i18n, LOCALE_STORAGE_KEY, setLocale, supportedLocales, tr } from '../i18n'
import { ESS_MODES } from '../essMode'
import { state } from '../composables/useInverterState'
import SettingsDrawer from './SettingsDrawer.vue'
import EssModeMenu from './EssModeMenu.vue'
import BatterySolarPanel from './BatterySolarPanel.vue'
import DailyStats from './DailyStats.vue'
import { currentRate, DAYS, newDraft, rateGrid, validatePlan } from '../tariffs/model'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); setLocale('en'); localStorage.clear(); document.body.innerHTML = '' })

describe('localized screens preserve control and data contracts', () => {
  it('changes language without saving server settings, and retains it when the drawer reopens', async () => {
    state.value = { ...state.value, ui_config: { settings: { mqtt_host: '', mqtt_port: 0, ha_token: '***' } } }
    const wrapper = mount(SettingsDrawer, { props: { open: true }, global: { plugins: [i18n], stubs: { SystemNotificationSettings: true, TariffConfiguration: true } } })
    await wrapper.get('[data-testid="locale-select"]').setValue('ru')
    expect(wrapper.text()).toContain(tr('Configuration'))
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ru')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect((wrapper.get('[data-testid="locale-select"]').element as HTMLSelectElement).value).toBe('ru')
    await wrapper.find('button.bg-blue-600').trigger('click')
    expect(wrapper.emitted('save')).toEqual([[{ camera_topic: '' }]])
    wrapper.unmount()
  })
  it.each(supportedLocales.map((item) => item.code))('renders all six ESS choices in %s but emits the original mode ID', async (locale) => {
    setLocale(locale)
    const wrapper = mount(EssModeMenu, { props: { mode: { selected: 'external_control', selection_supported: true }, label: 'External', active: true, connected: true, fresh: true, controlsAvailable: true, dryRun: false }, attachTo: document.body })
    await wrapper.get('[aria-haspopup="menu"]').trigger('click')
    await flushPromises()
    const choices = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]
    expect(choices.map((button) => button.textContent?.trim())).toEqual(ESS_MODES.map((mode) => tr(mode.label)))
    choices[0].click()
    await nextTick()
    expect(wrapper.emitted('send')?.[0]).toEqual(['set_ess_mode', { mode: 'off', request_id: expect.any(String) }])
    wrapper.unmount()
  })
  it('keeps configured device names unchanged while formatting telemetry in the selected locale', () => {
    setLocale('de')
    const wrapper = mount(BatterySolarPanel, { props: { showBatteries: true, showSolar: true, batteries: [{ name: 'Solar', voltage: 53.21, current: -1.2, soc: 90.5, state: 'Charging' }], solarSources: [] } })
    expect(wrapper.text()).toContain('Solar')
    expect(wrapper.text()).toContain('53,21V')
    expect(wrapper.text()).toContain('90,5%')
    expect(wrapper.text()).toContain(tr('Charging'))
    wrapper.unmount()
  })
  it('does not parse localized decimals back into energy calculations or tariff lookup', () => {
    setLocale('fr')
    state.value = { ...state.value, daily_stats: { battery_in: 1.75, battery_out: 0.5, produced_today: 2.25 } }
    const wrapper = mount(DailyStats, { global: { stubs: { TariffCost: true, DailyGridEnergy: true } } })
    expect(wrapper.text()).toContain('1,25kWh')
    expect(wrapper.text()).toContain('2,25kWh')
    const rates = rateGrid(0.15)
    rates[24][0] = 0.37
    const plan = validatePlan({ ...newDraft(), timeZone: 'UTC', rates })
    expect(currentRate(plan, new Date('2026-10-12T12:00:00Z'))).toBe(0.37)
    expect(DAYS[0]).toBe('Monday')
    wrapper.unmount()
  })
})

const modeProps = { mode: { selected: 'external_control' as const, selection_supported: true }, label: 'External', active: true, connected: true, fresh: true, controlsAvailable: true, dryRun: false }
async function requestMode() {
  const view = mount(EssModeMenu, { props: modeProps, attachTo: document.body })
  await view.get('[aria-haspopup="menu"]').trigger('click')
  await nextTick()
  document.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.click()
  await nextTick()
  return view
}
it('relocalizes a visible local refusal without sending or translating external diagnostics', async () => {
  vi.stubGlobal('crypto', { getRandomValues() { throw new Error('unavailable') } })
  const view = await requestMode()
  expect(view.emitted('send')).toBeUndefined()
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('No change was sent')
  setLocale('ru')
  await nextTick()
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(tr('This browser cannot create a command request. No change was sent.'))
  view.unmount()
})
it('relocalizes a pending timeout but keeps a literal controller diagnostic untouched', async () => {
  vi.useFakeTimers()
  const view = await requestMode()
  expect(view.emitted('send')).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(20000)
  setLocale('de')
  await nextTick()
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(tr('Change unconfirmed. Check the current mode before retrying.'))
  view.unmount()
  const next = await requestMode()
  const id = (next.emitted('send')?.[0][1] as { request_id: string }).request_id
  await next.setProps({ commandError: { action: 'set_ess_mode', request_id: id, error: 'Off' } })
  setLocale('ru')
  await nextTick()
  expect(document.querySelector('[role="alert"]')?.textContent).toBe('Off')
  next.unmount()
})
