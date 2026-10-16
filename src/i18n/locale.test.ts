import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import legacyEnglish from './en'
import { nextTick } from 'vue'
import { browserLocale, currentLocale, formatDate, formatNumber, i18n, initializeLocale, localePreference, LOCALE_STORAGE_KEY, setLocale, supportedLocales, tr, uiCatalogs } from './index'

let cleanup: (() => void) | undefined
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); localStorage.clear(); setLocale('en') })

describe('locale choice and presentation', () => {
  it('matches regional browser languages in order and falls back to English', () => {
    expect(browserLocale(['es-MX', 'uk-UA', 'de-DE'])).toBe('uk')
    expect(browserLocale(['ru-RU'])).toBe('ru')
    expect(browserLocale(['pt-BR'])).toBe('en')
    expect(browserLocale([])).toBe('en')
  })
  it('persists an explicit language and synchronizes document language and other tabs', async () => {
    cleanup = initializeLocale()
    expect(setLocale('de')).toBe(true)
    await nextTick()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de')
    expect(document.documentElement.lang).toBe('de')
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    window.dispatchEvent(new StorageEvent('storage', { key: LOCALE_STORAGE_KEY }))
    await nextTick()
    expect(currentLocale.value).toBe('fr')
    expect(localePreference.value).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
    expect(currentLocale.value).toBe('fr')
  })
  it('uses browser changes only in automatic mode and treats invalid persisted values as automatic', async () => {
    vi.stubGlobal('navigator', { languages: ['nl-NL'] })
    cleanup = initializeLocale()
    setLocale('system')
    expect(currentLocale.value).toBe('nl')
    setLocale('ru')
    vi.stubGlobal('navigator', { languages: ['de-AT'] })
    window.dispatchEvent(new Event('languagechange'))
    expect(currentLocale.value).toBe('ru')
    localStorage.setItem(LOCALE_STORAGE_KEY, '<invalid>')
    window.dispatchEvent(new StorageEvent('storage', { key: LOCALE_STORAGE_KEY }))
    await nextTick()
    expect(localePreference.value).toBe('system')
    expect(currentLocale.value).toBe('de')
  })
  it('keeps a tab-local language when browser persistence is blocked', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('blocked') } })
    expect(setLocale('uk')).toBe(false)
    expect(currentLocale.value).toBe('uk')
    expect(tr('Settings')).not.toBe('Settings')
  })
  it('formats numbers and dates in the selected language while preserving interpolated data', () => {
    setLocale('de')
    expect(formatNumber(1234.56, 2)).toBe('1234,56')
    expect(formatDate(Date.UTC(2026, 0, 2), { month: 'long', timeZone: 'UTC' })).toBe('Januar')
    expect(tr('ESS mode: {mode}', { mode: 'private device <name>' })).toContain('private device <name>')
    expect(tr('unchanged configured device')).toBe('unchanged configured device')
  })
  it('covers every owned catalog key and every interpolation in all six locales', () => {
    const keys = Object.keys(uiCatalogs.en).sort()
    for (const { code } of supportedLocales) {
      const catalog: Record<string, string> = uiCatalogs[code]
      expect(Object.keys(catalog).sort(), code).toEqual(keys)
      for (const [key, source] of Object.entries(uiCatalogs.en)) {
        expect(catalog[key].trim(), `${code}:${key}`).not.toBe('')
        const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
        expect(tokens(catalog[key]), `${code}:${key}`).toEqual(tokens(source))
      }
      if (code !== 'en') {
        // Catch an English scaffolding catalog even if all its keys are present.
        const translated = keys.filter((key) => catalog[key] !== (uiCatalogs.en as Record<string, string>)[key])
        expect(translated.length, code).toBeGreaterThan(keys.length * 0.9)
      }
    }
  })
  it('keeps the existing nested messages translated for status and accessible labels', () => {
    for (const { code } of supportedLocales) {
      setLocale(code)
      expect(i18n.global.t('status.connected')).toBe(tr('Connected'))
      expect(i18n.global.t('actions.manualMode', { name: 'Pump 7' })).toContain('Pump 7')
    }
  })
  it('catalogues every literal translation call in first-party application source', () => {
    const texts = new Set(Object.values(uiCatalogs.en))
    function inspect(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = resolve(directory, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'i18n') inspect(file); continue }
        if (!/\.(ts|vue)$/.test(file) || /\.(test|spec)\.ts$/.test(file)) continue
        const source = readFileSync(file, 'utf8')
        for (const match of source.matchAll(/\b(?:tr|localized|localizedError)\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) {
          const text = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"')
          expect(texts.has(text), `${file}: ${text}`).toBe(true)
        }
      }
    }
    inspect(resolve('src'))
  })

  it('has no ambiguous duplicate English messages and maps every visible legacy leaf', () => {
    const messages = Object.values(uiCatalogs.en)
    const mapped = new Set(messages)
    expect(mapped.size).toBe(messages.length)
    const technicalNames = new Set(['HA', 'MQTT', 'HA MQTT', 'VUE'])
    function inspect(tree: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(tree)) {
        if (typeof value === 'string') expect(mapped.has(value) || technicalNames.has(value), `${path}.${key}: ${value}`).toBe(true)
        else inspect(value as Record<string, unknown>, `${path}.${key}`)
      }
    }
    inspect(legacyEnglish)
  })

})
