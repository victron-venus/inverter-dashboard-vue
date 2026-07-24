import { createI18n } from 'vue-i18n'
import en from './en'
import de from './de'
import nl from './nl'
import fr from './fr'
import uk from './uk'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    de,
    nl,
    fr,
    uk,
  },
})

export const supportedLocales = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'fr', name: 'Français' },
  { code: 'uk', name: 'Українська' },
]

export default i18n