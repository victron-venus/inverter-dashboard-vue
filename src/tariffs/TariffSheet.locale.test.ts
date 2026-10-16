import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../i18n'
import { rateGrid, slotLabel } from './model'

const mock = vi.hoisted(() => ({ values: [] as unknown[][], dispose: vi.fn(), create: vi.fn() }))
vi.mock('@univerjs/presets', () => ({
  LocaleType: { EN_US: 'enUS', DE_DE: 'deDE', FR_FR: 'frFR', RU_RU: 'ruRU' },
  createUniver: (options: unknown) => {
    mock.create(options)
    const workbook = {
      getActiveSheet: () => ({ getRange: () => ({ setValues: (values: unknown[][]) => { mock.values = values } }) }),
      endEditingAsync: vi.fn().mockResolvedValue(undefined),
      save: () => ({ sheetOrder: ['week'], sheets: { week: { cellData: Object.fromEntries(mock.values.map((row, r) => [r, Object.fromEntries(row.map((v, c) => [c, { v }]))])) } } }),
    }
    return { univer: { dispose: mock.dispose }, univerAPI: { createWorkbook: () => workbook, getActiveWorkbook: () => workbook } }
  },
}))
vi.mock('@univerjs/preset-sheets-core', () => ({ UniverSheetsCorePreset: vi.fn() }))
import TariffSheet from './TariffSheet.vue'

afterEach(() => { setLocale('en'); vi.clearAllMocks() })
describe('localized editable tariff grid', () => {
  it('keeps numeric cells and original localized headings valid when language changes mid-edit', async () => {
    setLocale('de')
    const rates = rateGrid(0.1234)
    const wrapper = mount(TariffSheet, { props: { rates } })
    await flushPromises()
    expect(mock.values[0].slice(1)).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'])
    expect(mock.values[1]).toEqual([slotLabel(0), ...Array(7).fill(0.1234)])
    expect(mock.create.mock.calls[0][0].locale).toBe('deDE')
    setLocale('fr')
    expect(await wrapper.vm.getRates()).toEqual(rates)
    wrapper.unmount()
    expect(mock.dispose).toHaveBeenCalledOnce()
  })
})
