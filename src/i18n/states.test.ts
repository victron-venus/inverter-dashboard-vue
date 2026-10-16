import { afterEach, expect, it, vi } from 'vitest'
import { setLocale, tr } from './index'
import { weatherLabel, mediaLabel, inverterStateLabel, forecastDate } from './states'
afterEach(() => { vi.unstubAllEnvs(); setLocale('en') })
it('translates only recognized HA enum labels and preserves unknown source text', () => {
  setLocale('ru')
  expect(weatherLabel('partlycloudy')).toBe(tr('Partly cloudy'))
  expect(mediaLabel('playing')).toBe(tr('Playing'))
  expect(weatherLabel('vendor-specific: Solar')).toBe('vendor-specific: Solar')
  expect(mediaLabel('device diagnostic')).toBe('device diagnostic')
})

it('preserves calendar dates and converts offset instants when formatting HA forecasts', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
  expect(forecastDate('2026-10-15')).toBe('Oct 15')
  expect(forecastDate('2026-10-15T01:00:00+14:00')).toBe('Oct 14')
  expect(forecastDate('2026-02-31')).toBe('2026-02-31')
  expect(forecastDate('source not dated')).toBe('source not dated')
  expect(forecastDate(undefined)).toBe('')
})
it('translates standard inverter states but preserves an arbitrary diagnostic', () => {
  setLocale('de')
  expect(inverterStateLabel('Bulk')).toBe(tr('Bulk'))
  expect(inverterStateLabel('External control')).toBe(tr('External control'))
  expect(inverterStateLabel('vendor error')).toBe('vendor error')
})
