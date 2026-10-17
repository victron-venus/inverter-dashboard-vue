import { tr, formatNumber } from '../i18n'
// Meter snapshots arrive every 30 seconds, followed by the display/transport update.
export const GRID_ENERGY_STALE_AFTER_MS = 90_000

export interface GridEnergyDaily {
  date: string
  time_zone: string
  import_kwh: number | null
  export_kwh: number | null
  observed_at: number | null
  started_at: number | null
  complete: boolean
  status: 'complete' | 'partial' | 'stale' | 'unknown' | 'reset'
  reason?: string
  source: { service: string; device_instance: number; serial?: string | null }
}

export interface DailyGridPresentation {
  label: string
  imported: string
  exported: string
  details: string
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const timestamp = (value: unknown): value is number => nonnegative(value) && value * 1000 <= 8.64e15
const GRID_SERVICE_PREFIX = 'com.victronenergy.grid.'

// Keep the frequent freshness tick cheap without accumulating arbitrary server time zones.
let cachedZone: string | undefined
let cachedFormatter: Intl.DateTimeFormat | undefined
function siteParts(at: number, timeZone: string) {
  if (cachedZone !== timeZone || !cachedFormatter) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    cachedZone = timeZone
    cachedFormatter = formatter
  }
  const parts = cachedFormatter.formatToParts(at)
  const part = (type: string) => parts.find((value) => value.type === type)?.value
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  }
}

function meterDate(value: Record<string, unknown>): value is Record<string, unknown> & { date: string; time_zone: string } {
  return typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && typeof value.time_zone === 'string' && !!value.time_zone && !/^[+-]/.test(value.time_zone)
}

function sourceContext(source: unknown): string | null {
  if (!record(source) || typeof source.service !== 'string'
    || !source.service.startsWith(GRID_SERVICE_PREFIX)
    || !source.service.slice(GRID_SERVICE_PREFIX.length).trim()
    || source.service !== source.service.trim() || !nonnegative(source.device_instance)
    || !Number.isSafeInteger(source.device_instance)
    || (source.serial != null && typeof source.serial !== 'string')) return null
  const serial = source.serial ? tr(', serial {serial}', { serial: String(source.serial) }) : ''
  return tr(' Source: {service}, instance {instance}{serial}.', { service: source.service, instance: source.device_instance, serial })
}

function meterCoverage(value: Record<string, unknown>, zone: string, date: string):
  { error: string } | { observed: number; label: string; context: string } {
  if (!timestamp(value.observed_at) || !timestamp(value.started_at) || typeof value.complete !== 'boolean')
    return { error: tr("The observation time or coverage is unavailable or invalid.") } as const
  const observed = value.observed_at * 1000
  const started = value.started_at * 1000
  const start = siteParts(started, zone)
  if (start.date !== date || started > observed)
    return { error: tr("Coverage must start within this site day, before the observation.") } as const
  if (value.complete) {
    // Local day length can change with DST. Require its first actual instant.
    if (!Number.isInteger(started) || siteParts(started - 1, zone).date === date)
      return { error: tr("Full-day coverage has no verified start-of-day reading.") } as const
    return { observed, label: tr("Today"), context: ' ' + tr("Coverage: from the start of the site day.") } as const
  }
  return { observed, label: tr('Since {time}', { time: start.time }), context: tr(' Partial coverage: since {time}; excludes earlier energy today.', { time: start.time }) } as const
}

function observationProblem(value: Record<string, unknown>, observed: number, now: number, zone: string): string | null {
  if (observed > now + 1000) return tr("The meter observation is in the future.")
  if (siteParts(observed, zone).date !== value.date) return tr("The meter observation belongs to another site day.")
  if (now - observed > GRID_ENERGY_STALE_AFTER_MS)
    return tr('The meter observation is stale (older than {seconds} seconds).', { seconds: GRID_ENERGY_STALE_AFTER_MS / 1000 })
  if (!((value.status === 'complete' && value.complete) || (value.status === 'partial' && !value.complete)))
    return tr("The controller has not confirmed usable daily readings.")
  return null
}

export function dailyGridPresentation(value: unknown, now: number): DailyGridPresentation {
  let label = tr("Today")
  let context = tr('Grid energy: ↓ import / ↑ export.')
  const unavailable = (reason: string): DailyGridPresentation => ({
    label, imported: '—', exported: '—', details: `${context} ${reason}`,
  })
  if (!record(value)) return unavailable(tr("Daily meter readings are unavailable."))
  if (!meterDate(value)) return unavailable(tr("The meter date or IANA time zone is invalid."))
  try {
    const current = siteParts(now, value.time_zone)
    context += ` ${value.date} (${value.time_zone}).`
    if (value.date !== current.date)
      return unavailable(tr("Readings do not belong to the current day at the meter site."))
    if (typeof value.status === 'string') context += tr(' Status: {status}.', { status: value.status })
    if (typeof value.reason === 'string' && value.reason.trim()) context += ` ${value.reason}`
    const source = sourceContext(value.source)
    if (source === null) return unavailable(tr("The direct meter source is unavailable or invalid."))
    context += source
    const coverage = meterCoverage(value, value.time_zone, value.date)
    if ('error' in coverage) return unavailable(coverage.error)
    label = coverage.label
    context += coverage.context
    context += tr(' Observed: {time}.', { time: siteParts(coverage.observed, value.time_zone).time })
    const problem = observationProblem(value, coverage.observed, now, value.time_zone)
    if (problem) return unavailable(problem)
    const imported = nonnegative(value.import_kwh) ? formatNumber(value.import_kwh, 2) : '—'
    const exported = nonnegative(value.export_kwh) ? formatNumber(value.export_kwh, 2) : '—'
    if (imported === '—') context += ' ' + tr("Import reading is unavailable or invalid.")
    if (exported === '—') context += ' ' + tr("Export reading is unavailable or invalid.")
    return { label, imported, exported, details: context }
  } catch {
    return unavailable(tr("The meter date or IANA time zone is invalid."))
  }
}
