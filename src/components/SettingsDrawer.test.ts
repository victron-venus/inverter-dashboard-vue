import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { state } from '../composables/useInverterState'
import { i18n } from '../i18n'
import SettingsDrawer from './SettingsDrawer.vue'

describe('SettingsDrawer', () => {
  it('renders visibility toggles from ui_config.settings and emits patches', async () => {
    state.value = {
      ...state.value,
      ui_config: {
        ...state.value.ui_config,
        settings: {
          show_ev: false,
          camera_topic: 'frigate/+/events',
          mqtt_host: 'Cerbo',
          ha_token: '***',
        },
      },
    }
    const w = mount(SettingsDrawer, { props: { open: true }, global: { plugins: [i18n] } })
    const boxes = w.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(9)
    // show_ev false → first toggle unchecked
    expect((boxes[0].element as HTMLInputElement).checked).toBe(false)
    expect((w.find('input:not([type="checkbox"])').element as HTMLInputElement).value).toBe(
      'frigate/+/events'
    )

    await boxes[1].setValue(false) // show_washer off
    const ev = w.emitted('save')
    expect(ev?.[0]?.[0]).toEqual({ show_washer: false })

    await w.find('button.bg-blue-600').trigger('click')
    const saveEv = w.emitted('save')?.[1]?.[0] as Record<string, unknown>
    expect(saveEv.camera_topic).toBe('frigate/+/events')
    expect(saveEv.mqtt_host).toBe('Cerbo') // seeded from server state
    expect(saveEv.ha_token).toBeUndefined() // masked '***' never sent back
  })
})
