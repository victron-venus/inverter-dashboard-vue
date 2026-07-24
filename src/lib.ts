/**
 * Vue Component Library Entry Point
 *
 * Export all reusable Vue components and composables for use in:
 * - inverter-dashboard-go (Go server, embedded via //go:embed)
 * - inverter-dashboard (Python FastAPI, static files)
 * - inverter-desktop (Tauri desktop app)
 *
 * Usage:
 *   import { BatterySolarPanel, useMqtt } from '@victron-venus/dashboard-vue'
 */

// Components
export { default as AppHeader } from './components/AppHeader.vue'
export { default as BatterySolarPanel } from './components/BatterySolarPanel.vue'
export { default as ChartPanel } from './components/ChartPanel.vue'
export { default as ConsoleLog } from './components/ConsoleLog.vue'
export { default as DailyStats } from './components/DailyStats.vue'
export { default as ErrorBoundary } from './components/ErrorBoundary.vue'
export { default as LoadsTable } from './components/LoadsTable.vue'
export { default as SidePanel } from './components/SidePanel.vue'
export { default as StatCards } from './components/StatCards.vue'
export { default as StatusBar } from './components/StatusBar.vue'

// Composables
export { useChart } from './composables/useChart'
export { useConnection } from './composables/useConnection'
export { useHA } from './composables/useHA'
export { useInverterState } from './composables/useInverterState'
export { useTheme } from './composables/useTheme'

// Types - re-export for consumers
export type { InverterState } from './types/inverter'
export type { ChartData, ChartOptions } from './composables/useChart'
export type { MqttConfig, ConnectionState } from './composables/useConnection'
export type { HAConfig, HAEntity } from './composables/useHA'

// Library version
export const VERSION = '2.1.1'
export const LIBRARY_NAME = '@victron-venus/dashboard-vue'