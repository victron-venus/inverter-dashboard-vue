import { createApp } from 'vue'
import App from './App.vue'
import { i18n, initializeLocale } from './i18n'
import { logger } from './logger'
import './style.css'

initializeLocale()
const app = createApp(App)
app.use(i18n)
app.config.errorHandler = (err, instance, info) => {
  logger.error('Unhandled Vue error:', err, 'Component:', instance, 'Info:', info)
}
app.mount('#app')
