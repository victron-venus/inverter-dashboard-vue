import { computed, ref, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './en'
import uiEn from './ui/en.json'
import uiRu from './ui/ru.json'
import uiUk from './ui/uk.json'
import uiDe from './ui/de.json'
import uiFr from './ui/fr.json'
import uiNl from './ui/nl.json'

export const supportedLocales = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'nl', name: 'Nederlands' },
] as const
export type LocaleCode = typeof supportedLocales[number]['code']
export const LOCALE_STORAGE_KEY = 'inverter-dashboard.locale'
export const uiCatalogs = { en: uiEn, ru: uiRu, uk: uiUk, de: uiDe, fr: uiFr, nl: uiNl }
const keyByText = new Map(Object.entries(uiEn).map(([key, text]) => [text, key]))

export function supportedLocale(value: string): LocaleCode | undefined {
  const language = value.toLowerCase().split(/[-_]/)[0]
  return supportedLocales.find((item) => item.code === language)?.code
}
export function browserLocale(languages: readonly string[] = globalThis.navigator?.languages ?? []): LocaleCode {
  return languages.map(supportedLocale).find((value) => value !== undefined) ?? 'en'
}
function storedLocale(): LocaleCode | undefined {
  try {
    const value = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
    return supportedLocales.find((item) => item.code === value)?.code
  } catch { return undefined }
}
export const localePreference = ref<LocaleCode | 'system'>(storedLocale() ?? 'system')

type MessageTree = { [key: string]: string | MessageTree }
function translatedTree(tree: MessageTree, catalog: Record<string, string>): MessageTree {
  return Object.fromEntries(Object.entries(tree).map(([key, value]) => [key,
    typeof value === 'string' ? catalog[keyByText.get(value) ?? ''] ?? value : translatedTree(value, catalog),
  ]))
}
export const i18n = createI18n({
  legacy: false,
  locale: localePreference.value === 'system' ? browserLocale() : localePreference.value,
  fallbackLocale: 'en',
  messages: Object.fromEntries(Object.entries(uiCatalogs).map(([locale, catalog]) => [locale,
    { ...translatedTree(en, catalog), ui: catalog },
  ])),
})
export const currentLocale = computed(() => supportedLocale(i18n.global.locale.value) ?? 'en')

/** Translate only explicitly catalogued UI copy. Device names and wire IDs never pass here. */
export function tr(text: string, values: Record<string, string | number> = {}): string {
  const key = keyByText.get(text)
  const catalog: Record<string, string> = uiCatalogs[currentLocale.value]
  const message = key ? catalog[key] ?? text : text
  return message.replace(/\{(\w+)\}/g, (token, name: string) => Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token)
}
export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(currentLocale.value, {
    minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
  }).format(value)
}
export function formatNumeric(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(currentLocale.value, { maximumFractionDigits: 20, useGrouping: false }).format(value)
    : String(value ?? '')
}
export function formatDate(value: Date | number, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(currentLocale.value, options).format(value)
}

/** A storage failure does not prevent a tab-local choice; report it honestly to the user. */
export function setLocale(preference: LocaleCode | 'system'): boolean {
  if (preference !== 'system' && !supportedLocales.some((locale) => locale.code === preference)) return false
  localePreference.value = preference
  i18n.global.locale.value = preference === 'system' ? browserLocale() : preference
  try {
    if (preference === 'system') globalThis.localStorage.removeItem(LOCALE_STORAGE_KEY)
    else globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, preference)
    return true
  } catch { return false }
}

/** Installed by the SPA entry point, not by consumers of the component library. */
export function initializeLocale(): () => void {
  const stop = watch(currentLocale, (locale) => { document.documentElement.lang = locale }, { immediate: true })
  const sync = (event: StorageEvent) => {
    if (event.key !== LOCALE_STORAGE_KEY && event.key !== null) return
    localePreference.value = storedLocale() ?? 'system'
    i18n.global.locale.value = localePreference.value === 'system' ? browserLocale() : localePreference.value
  }
  const browserChanged = () => {
    if (localePreference.value === 'system') i18n.global.locale.value = browserLocale()
  }
  window.addEventListener('storage', sync)
  window.addEventListener('languagechange', browserChanged)
  return () => { stop(); window.removeEventListener('storage', sync); window.removeEventListener('languagechange', browserChanged) }
}
export default i18n
