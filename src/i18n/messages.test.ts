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

it('keeps the public tariff import result serializable while the editor retains localized copy', async () => {
  const { importTariff, importTariffForEditor, newDraft, rateGrid } = await import('../tariffs/model')
  const plan = { ...newDraft(), name: 'Solar', rates: rateGrid(0.15) }
  const publicResult = importTariff(plan)
  const editorResult = importTariffForEditor(plan)
  expect(Object.keys(publicResult)).toEqual(['draft', 'message'])
  expect(typeof publicResult.message).toBe('string')
  expect(JSON.parse(JSON.stringify(publicResult))).toEqual(publicResult)
  const original = publicResult.message
  setLocale('ru')
  expect(publicResult.message).toBe(original)
  expect(String(editorResult.message)).toBe(tr('Imported tariff, including any seasons and billing start day. Review and save to apply it here.'))
  expect(editorResult.draft).toEqual(publicResult.draft)
})

it('localizes an invalid interval schema while retaining its literal protocol identifier', async () => {
  const { validateIntervals } = await import('../tariffs/intervals')
  setLocale('de')
  expect(() => validateIntervals({ type: 'unknown', version: 1 })).toThrow(tr('Expected grid-import-intervals version 1.'))
  expect(tr('Expected grid-import-intervals version 1.')).toContain('grid-import-intervals')
})
