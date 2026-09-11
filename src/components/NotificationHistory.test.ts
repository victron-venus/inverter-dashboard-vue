import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { historyNotifications } from '../composables/useNotifications'
import { i18n } from '../i18n'
import NotificationHistory from './NotificationHistory.vue'

describe('NotificationHistory', () => {
  it('marks a notification read through a native focusable button', async () => {
    historyNotifications.value = [{
      id: 'keyboard-test', title: 'Battery update', body: 'Charge complete',
      level: 'info', timestamp: Date.now(), read: false,
    }]
    const wrapper = mount(NotificationHistory, { global: { plugins: [i18n] } })
    await wrapper.get('button.classic-btn').trigger('click')
    const notification = wrapper.get('button.text-left')
    expect(notification.element).toBeInstanceOf(HTMLButtonElement)
    expect(notification.attributes('type')).toBe('button')
    expect(notification.text()).toContain('Battery update')
    await notification.trigger('click')
    expect(historyNotifications.value[0].read).toBe(true)
    wrapper.unmount()
    historyNotifications.value = []
  })
})
