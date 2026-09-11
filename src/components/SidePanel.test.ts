import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '../i18n'
import SidePanel from './SidePanel.vue'

const props = {
  evCharging: '', evPower: '', evPowerWatts: 0, evChargingKw: 0, evLoadPower: 0,
  pumpSwitchEntity: '', waterValveEntity: '', homeButtons: [], buttonStates: {},
  haSensors: [{ entity_id: 'sensor.test', name: 'Sensor', state: '1', unit: 'W' }],
  haNumbers: [{ entity_id: 'number.test', name: 'Number', value: 1, min: 0, max: 10, step: 1, unit: '' }],
  haCovers: [{ entity_id: 'cover.test', name: 'Cover', position: 50 }],
  haMediaPlayers: [{ entity_id: 'media_player.test', name: 'Player', state: 'paused' }],
  haScenes: [{ entity_id: 'scene.test', name: 'Scene' }],
  haWeather: null,
}

describe('SidePanel disclosures', () => {
  it('uses native buttons and exposes the expanded state for all five sections', async () => {
    const wrapper = mount(SidePanel, { props, global: { plugins: [i18n] } })
    const controls = wrapper.findAll('button[aria-expanded]')
    expect(controls).toHaveLength(5)
    for (const control of controls) {
      expect(control.element).toBeInstanceOf(HTMLButtonElement)
      expect(control.attributes('type')).toBe('button')
      expect(control.attributes('aria-expanded')).toBe('false')
      await control.trigger('click')
      expect(control.attributes('aria-expanded')).toBe('true')
      await control.trigger('click')
      expect(control.attributes('aria-expanded')).toBe('false')
    }
    wrapper.unmount()
  })

  it('keeps command controls hidden in public read-only mode', () => {
    const wrapper = mount(SidePanel, {
      props: { ...props, readOnly: true }, global: { plugins: [i18n] },
    })
    expect(wrapper.findAll('button[aria-expanded]')).toHaveLength(1)
    expect(wrapper.emitted()).toEqual({})
    wrapper.unmount()
  })
})
