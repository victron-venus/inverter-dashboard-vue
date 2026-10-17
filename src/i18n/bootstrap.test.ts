import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); vi.resetModules() })
it('restores the persisted preference before first render, ahead of the browser language', async () => {
  localStorage.setItem('inverter-dashboard.locale', 'uk')
  vi.stubGlobal('navigator', { languages: ['de-DE'] })
  vi.resetModules()
  const { currentLocale, localePreference, initializeLocale } = await import('./index')
  expect(currentLocale.value).toBe('uk')
  expect(localePreference.value).toBe('uk')
  const stop = initializeLocale()
  expect(document.documentElement.lang).toBe('uk')
  stop()
})
it('starts safely with browser preference when storage access is denied', async () => {
  vi.stubGlobal('navigator', { languages: ['es', 'fr-CA'] })
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
  vi.resetModules()
  const { currentLocale, localePreference } = await import('./index')
  expect(currentLocale.value).toBe('fr')
  expect(localePreference.value).toBe('system')
})
it('does not let a runtime-invalid choice corrupt the active locale', async () => {
  const { setLocale, currentLocale } = await import('./index')
  setLocale('en')
  expect(setLocale('malformed' as 'en')).toBe(false)
  expect(currentLocale.value).toBe('en')
})
