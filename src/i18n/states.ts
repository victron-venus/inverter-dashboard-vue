import { tr, formatDate } from './index'

const weatherLabels: Record<string, string> = {
  'clear-night': 'Clear night', cloudy: 'Cloudy', fog: 'Fog', hail: 'Hail', lightning: 'Lightning',
  'lightning-rainy': 'Lightning and rain', partlycloudy: 'Partly cloudy', pouring: 'Pouring',
  rainy: 'Rainy', snowy: 'Snowy', 'snowy-rainy': 'Snow and rain', sunny: 'Sunny', windy: 'Windy',
  'windy-variant': 'Windy and cloudy', exceptional: 'Exceptional weather',
}
const mediaLabels: Record<string, string> = {
  playing: 'Playing', paused: 'Paused', standby: 'Standby', buffering: 'Buffering',
  idle: 'Idle', off: 'Off', on: 'On', unavailable: 'Unavailable', unknown: 'Unknown',
}
/** Only standard HA states have owned display labels; arbitrary source text is preserved. */
export function weatherLabel(value: string): string { return Object.prototype.hasOwnProperty.call(weatherLabels, value) ? tr(weatherLabels[value]) : value }
export function mediaLabel(value: string): string { return Object.prototype.hasOwnProperty.call(mediaLabels, value) ? tr(mediaLabels[value]) : value }

const inverterLabels = new Set(['Off', 'Low Power', 'Fault', 'Bulk', 'Absorption', 'Float', 'Storage', 'Equalize', 'Inverting', 'Power assist', 'Power supply', 'Passthru', 'Charging', 'Charged', 'Charger only', 'External control'])
export function inverterStateLabel(value: string | undefined): string { return value && inverterLabels.has(value) ? tr(value) : value ?? '' }

/** A daily forecast calendar date is not an instant at midnight UTC. */
export function forecastDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (new Date(time).toISOString().slice(0, 10) !== value) return value
    return formatDate(time, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return formatDate(time, { month: 'short', day: 'numeric' })
}
