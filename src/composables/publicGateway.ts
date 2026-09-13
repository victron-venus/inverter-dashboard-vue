import type { InverterState } from './useInverterState'

const INVERTER_STATES: Record<number, string> = {
  0: 'Off',
  1: 'Low Power',
  2: 'Fault',
  3: 'Bulk',
  4: 'Absorption',
  5: 'Float',
  6: 'Storage',
  7: 'Equalize',
  8: 'Passthru',
  9: 'Inverting',
  10: 'Power assist',
  11: 'Power supply',
  252: 'External control',
}

type SnapSection = Record<string, unknown>

export type GatewaySnapshot = {
  system?: SnapSection
  vebus?: SnapSection
  battery?: SnapSection
  solarcharger?: SnapSection
  pvinverter?: SnapSection
  acload?: SnapSection
  tank?: SnapSection
  ev?: SnapSection
  evcharger?: SnapSection
  [key: string]: SnapSection | undefined
}

type BatteryEntry = NonNullable<InverterState['batteries']>[number]
type MpptEntry = NonNullable<InverterState['mppt_chargers']>[number]
type PvEntry = NonNullable<InverterState['pv_inverters']>[number]

function stateFromCurrent(amps: number): string {
  if (amps > 0.5) return 'Charging'
  if (amps < -0.5) return 'Discharging'
  return 'Idle'
}

function groupByInstance(section: SnapSection | undefined): Record<string, SnapSection> {
  const out: Record<string, SnapSection> = {}
  if (!section || typeof section !== 'object') return out
  for (const key of Object.keys(section)) {
    const slash = key.indexOf('/')
    if (slash < 0) continue
    const inst = key.slice(0, slash)
    const path = key.slice(slash + 1)
    out[inst] ??= {}
    out[inst][path] = section[key]
  }
  for (const [instance, leaves] of Object.entries(out)) {
    if (num(leaves.Connected) === 0) delete out[instance]
  }
  return out
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Coerce gateway leaf to string; only string/number are accepted (avoids "[object Object]"). */
function asString(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function deviceName(e: SnapSection, fallback: string): string {
  return (asString(e.CustomName) || asString(e.ProductName) || fallback).trim()
}

function sortedInstanceKeys(map: Record<string, SnapSection>): string[] {
  return Object.keys(map).sort(
    (a, b) => (Number.parseInt(a, 10) || 0) - (Number.parseInt(b, 10) || 0)
  )
}

function firstInstance(map: Record<string, SnapSection>): SnapSection | undefined {
  const key = Object.keys(map)[0]
  return key == null ? undefined : map[key]
}

function sumPresent(values: Array<number | null>): number | null {
  let total: number | null = null
  for (const v of values) {
    if (v != null) total = (total ?? 0) + v
  }
  return total
}

function stripNulls<T extends object>(obj: T): T {
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] === null || obj[k] === undefined) delete obj[k]
  }
  return obj
}

function extractBatteries(section: SnapSection | undefined): BatteryEntry[] {
  const batteriesMap = groupByInstance(section)
  const batteries: BatteryEntry[] = []

  for (const inst of sortedInstanceKeys(batteriesMap)) {
    const e = batteriesMap[inst]
    const name = deviceName(e, `Battery ${inst}`)
    const current = num(e['Dc/0/Current'])
    const entry: BatteryEntry = {
      instance: inst,
      name,
      soc: num(e.Soc) ?? undefined,
      voltage: num(e['Dc/0/Voltage']) ?? undefined,
      current: current ?? undefined,
      power: num(e['Dc/0/Power']) ?? undefined,
      state: current != null ? stateFromCurrent(current) : 'Unknown',
    }
    batteries.push(entry)
  }
  return batteries
}

function resolveBatteryMetrics(
  sys: (path: string) => unknown,
  selected: BatteryEntry | null
): {
  battV: number | null
  battI: number | null
  battP: number | null
  battSoc: number | null
} {
  let battV = num(sys('Dc/Battery/Voltage'))
  let battI = num(sys('Dc/Battery/Current'))
  let battP = num(sys('Dc/Battery/Power'))
  const battSoc = num(sys('Dc/Battery/Soc')) ?? selected?.soc ?? null

  battV ??= selected?.voltage ?? null
  battI ??= selected?.current ?? null
  battP ??= selected?.power ?? (battV != null && battI != null ? battV * battI : null)

  return { battV, battI, battP, battSoc }
}

function extractMppt(section: SnapSection | undefined): {
  chargers: MpptEntry[]
  total: number | null
} {
  const chargersMap = groupByInstance(section)
  const chargers: MpptEntry[] = []
  let total: number | null = null
  for (const inst of sortedInstanceKeys(chargersMap)) {
    const e = chargersMap[inst]
    const voltage = num(e['Dc/0/Voltage'])
    const current = num(e['Dc/0/Current'])
    const power =
      num(e['Yield/Power']) ??
      num(e['Dc/0/Power']) ??
      (voltage != null && current != null ? voltage * current : null)
    if (power != null) total = (total ?? 0) + power
    chargers.push({
      name: deviceName(e, `MPPT ${inst}`),
      power: power ?? undefined,
      pv_voltage: num(e['Pv/V']) ?? undefined,
      current: num(e['Dc/0/Current']) ?? undefined,
    })
  }
  return { chargers, total }
}

function extractPvInverters(section: SnapSection | undefined): {
  inverters: PvEntry[]
  total: number | null
} {
  const pvMap = groupByInstance(section)
  const inverters: PvEntry[] = []
  let total: number | null = null
  for (const inst of sortedInstanceKeys(pvMap)) {
    const e = pvMap[inst]
    let power = num(e['Ac/Power'])
    power ??= sumPresent([1, 2, 3].map((phase) => num(e[`Ac/L${phase}/Power`])))
    if (power != null) total = (total ?? 0) + power
    inverters.push({
      name: deviceName(e, `PV Inverter ${inst}`),
      power: power ?? undefined,
      voltage: num(e['Ac/L1/Voltage']) ?? undefined,
      current: num(e['Ac/L1/Current']) ?? undefined,
    })
  }
  return { inverters, total }
}

function extractLoads(section: SnapSection | undefined): Record<string, number> {
  const loadsMap = groupByInstance(section)
  const loads: Record<string, number> = {}
  for (const inst of Object.keys(loadsMap)) {
    const e = loadsMap[inst]
    const name = deviceName(e, `Load ${inst}`)
    let power = num(e['Ac/Power'])
    power ??= sumPresent([1, 2, 3].map((phase) => num(e[`Ac/L${phase}/Power`])))
    if (power == null) continue
    let key = name
    let n = 2
    while (Object.prototype.hasOwnProperty.call(loads, key)) {
      key = `${name} (${n})`
      n += 1
    }
    loads[key] = power
  }
  return loads
}

function extractVebus(section: SnapSection | undefined): {
  inverterState: string | null
  setpoint: number | null
} {
  const vebusMap = groupByInstance(section)
  let inverterState: string | null = null
  let setpoint: number | null = null
  for (const inst of Object.keys(vebusMap)) {
    const e = vebusMap[inst]
    const stateRaw = asString(e.State)
    if (stateRaw != null) {
      const code = Number.parseInt(stateRaw, 10)
      inverterState = INVERTER_STATES[code] || `? (${code})`
    }
    const sp = num(e['Hub4/L1/AcPowerSetpoint'])
    if (sp != null) setpoint = sp
    if (inverterState != null) break
  }
  return { inverterState, setpoint }
}

function firstNumericField(section: SnapSection | undefined, field: string): number | null {
  const map = groupByInstance(section)
  for (const inst of Object.keys(map)) {
    const v = num(map[inst][field])
    if (v != null) return v
  }
  return null
}

function firstEvPower(section: SnapSection | undefined): number | null {
  const first = firstInstance(groupByInstance(section))
  return first == null ? null : num(first['Ac/Power'])
}

/** Map inverter-gateway /v1/snapshot → dashboard InverterState (public read-only). */
export function snapshotToState(
  snap: GatewaySnapshot | null | undefined
): InverterState & { ok: boolean } {
  const data = snap ?? {}
  const system = data.system ?? {}
  const sys = (path: string) => system[`0/${path}`]

  const grid = firstInstance(groupByInstance(data.grid)) ?? {}
  const g1 = num(sys('Ac/Grid/L1/Power')) ?? num(grid['Ac/L1/Power'])
  const g2 = num(sys('Ac/Grid/L2/Power')) ?? num(grid['Ac/L2/Power'])
  const g3 = num(sys('Ac/Grid/L3/Power')) ?? num(grid['Ac/L3/Power'])
  const t1 = num(sys('Ac/Consumption/L1/Power'))
  const t2 = num(sys('Ac/Consumption/L2/Power'))
  const t3 = num(sys('Ac/Consumption/L3/Power'))
  const gt = num(sys('Ac/Grid/Total/Power')) ?? num(grid['Ac/Power']) ?? sumPresent([g1, g2, g3])
  const tt = num(sys('Ac/Consumption/Total/Power')) ?? sumPresent([t1, t2, t3])

  const batteries = extractBatteries(data.battery)
  const selectedId = num(sys('Dc/Battery/Instance'))
  const selectedBattery =
    selectedId != null
      ? (batteries.find((battery) => String(battery.instance) === String(selectedId)) ?? null)
      : batteries.length === 1
        ? batteries[0]
        : null
  const { battV, battI, battP, battSoc } = resolveBatteryMetrics(sys, selectedBattery)

  const { chargers: mpptChargers, total: deviceMpptTotal } = extractMppt(data.solarcharger)
  const { inverters: pvInverters, total: devicePvTotal } = extractPvInverters(data.pvinverter)
  const mpptTotal = num(sys('Dc/Pv/Power')) ?? deviceMpptTotal
  const pvTotal =
    sumPresent(
      ['Grid', 'Output', 'Genset'].flatMap((location) =>
        [1, 2, 3].map((phase) => num(sys(`Ac/PvOn${location}/L${phase}/Power`)))
      )
    ) ?? devicePvTotal
  const solarTotal = sumPresent([mpptTotal, pvTotal])

  const loads = extractLoads(data.acload)
  const { inverterState, setpoint } = extractVebus(data.vebus)
  const waterLevel = firstNumericField(data.tank, 'Level')
  const evPower = firstEvPower(data.ev)
  const evChargerW = firstNumericField(data.evcharger, 'Ac/Power')
  const evChargingKw = evChargerW != null ? evChargerW / 1000.0 : null

  const state = {
    ok: true,
    public_mode: true,
    read_only: true,
    gt: gt ?? undefined,
    g1: g1 ?? undefined,
    g2: g2 ?? undefined,
    g3: g3 ?? undefined,
    tt: tt ?? undefined,
    t1: t1 ?? undefined,
    t2: t2 ?? undefined,
    t3: t3 ?? undefined,
    solar_total: solarTotal ?? undefined,
    mppt_total: mpptTotal ?? undefined,
    pv_inverter_total: pvTotal ?? undefined,
    mppt_chargers: mpptChargers,
    pv_inverters: pvInverters,
    battery_soc: battSoc ?? undefined,
    battery_voltage: battV ?? undefined,
    battery_current: battI ?? undefined,
    battery_power: battP ?? undefined,
    batteries,
    loads,
    setpoint: setpoint ?? undefined,
    inverter_state: inverterState ?? undefined,
    water_level: waterLevel ?? undefined,
    ev_power: evPower ?? undefined,
    car_soc: firstNumericField(data.ev, 'Soc') ?? undefined,
    ev_charging_kw: evChargingKw ?? undefined,
    features: {
      public_gateway: true,
      writes_disabled: true,
      water: waterLevel != null,
      ev: true,
      ha: false,
    },
    ui_config: {
      settings: {
        show_ev: true,
        show_washer: true,
        show_dryer: true,
        show_dishwasher: true,
        show_home_section: false,
      },
    },
    dashboard_version: 'public-gateway',
    ha_direct_connected: false,
  } as InverterState & { ok: boolean; public_mode?: boolean; read_only?: boolean }

  return stripNulls(state)
}
