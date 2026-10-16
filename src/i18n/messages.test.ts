import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, expect, it } from 'vitest'
import { setLocale, tr } from './index'
import { errorText, localizedError } from './messages'
afterEach(() => setLocale('en'))
it('retains owned error identity across async capture and preserves literal provider errors', async () => {
  let caught: unknown
  try { await Promise.reject(localizedError('Enter a numeric price for {day}, {time}.', { day: 'Solar', time: '12:00' })) }
  catch (cause) { caught = cause }
  const value = ref(errorText(caught, 'Invalid rates.'))
  const view = mount({ setup: () => ({ value }), template: '<p>{{ value }}</p>' })
  expect(view.text()).toContain('Solar, 12:00')
  setLocale('ru')
  await nextTick()
  expect(view.text()).toBe(tr('Enter a numeric price for {day}, {time}.', { day: 'Solar', time: '12:00' }))
  value.value = errorText(new Error('Off'), 'Invalid rates.')
  await nextTick()
  expect(view.text()).toBe('Off')
  view.unmount()
})
