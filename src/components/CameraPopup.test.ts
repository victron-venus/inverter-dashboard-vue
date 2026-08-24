import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { state } from '../composables/useInverterState'
import CameraPopup from './CameraPopup.vue'

describe('CameraPopup', () => {
  it('hidden until a camera event arrives, closes on demand', async () => {
    const w = mount(CameraPopup)
    expect(w.find('.fixed').exists()).toBe(false)

    state.value = {
      ...state.value,
      camera_event: { camera: 'Front Door', url: 'http://f/clip.mp4', ts: '' },
    }
    await Promise.resolve()
    expect(w.find('.fixed').exists()).toBe(true)
    expect(w.text()).toContain('Front Door')

    await w.vm.close()
    expect(w.find('.fixed').exists()).toBe(false)
  })
})
