import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ModalDialog from './ModalDialog.vue'

describe('ModalDialog', () => {
  it('opens a native modal, dismisses with Escape, and closes when hidden', async () => {
    const wrapper = mount(ModalDialog, {
      attachTo: document.body,
      props: { open: false, label: 'Test settings' },
      slots: { default: '<button autofocus>Close</button><input aria-label="Setting" />' },
    })
    await wrapper.setProps({ open: true })
    await nextTick()
    const dialog = wrapper.get('dialog')
    expect((dialog.element as HTMLDialogElement).open).toBe(true)
    expect(dialog.attributes('aria-label')).toBe('Test settings')
    await dialog.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    const element = dialog.element as HTMLDialogElement
    await wrapper.setProps({ open: false })
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(element.open).toBe(false)
    wrapper.unmount()
  })

  it('dismisses only backdrop clicks and browser cancel events', async () => {
    const wrapper = mount(ModalDialog, {
      attachTo: document.body,
      props: { open: true, label: 'Test camera' },
      slots: { default: '<button>Camera control</button>' },
    })
    await nextTick()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    await wrapper.get('dialog').trigger('click')
    await wrapper.get('dialog').trigger('cancel')
    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })
})
