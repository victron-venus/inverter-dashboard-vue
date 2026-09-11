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

const V_SOC_MIN = 40.0
const V_SOC_MAX = 54.4

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

function voltageSoc(v: number): number {
  const pct = ((v - V_SOC_MIN) / (V_SOC_MAX - V_SOC_MIN)) * 100.0
  return Math.round(Math.max(0, Math.min(100, pct)))
}

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
    if (!out[inst]) out[inst] = {}
    out[inst][path] = section[key]
  }
  return out
}

function num(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null
}

function stripNulls<T extends object>(obj: T): T {
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] === null || obj[k] === undefined) delete obj[k]
  }
  return obj
}

/** Map inverter-gateway /v1/snapshot → dashboard InverterState (public read-only). */
export function snapshotToState(snap: GatewaySnapshot | null | undefined): InverterState & { ok: boolean } {
  snap = snap || {}
  const system = snap.system || {}
  const sys = (path: string) => system[`0/${path}`]

  const g1 = num(sys('Ac/Grid/L1/Power'))
  const g2 = num(sys('Ac/Grid/L2/Power'))
  const g3 = num(sys('Ac/Grid/L3/Power'))
  const t1 = num(sys('Ac/Consumption/L1/Power'))
  const t2 = num(sys('Ac/Consumption/L2/Power'))
  const t3 = num(sys('Ac/Consumption/L3/Power'))

  let gt: number | null = null
  let tt: number | null = null
  for (const v of [g1, g2, g3]) {
    if (v != null) gt = (gt == null ? 0 : gt) + v
  }
  for (const v of [t1, t2, t3]) {
    if (v != null) tt = (tt == null ? 0 : tt) + v
  }

  const batteriesMap = groupByInstance(snap.battery)
  const batteries: NonNullable<InverterState['batteries']> = []
  let shunt: {
    voltage: number | null
    current: number | null
    power: number | null
  } | null = null

  for (const inst of Object.keys(batteriesMap).sort(
    (a, b) => (Number.parseInt(a, 10) || 0) - (Number.parseInt(b, 10) || 0),
  )) {
    const e = batteriesMap[inst]
    const name = String(e.CustomName || e.ProductName || `Battery ${inst}`).trim()
    const current = num(e['Dc/0/Current'])
    const entry = {
      name,
      soc: num(e.Soc) ?? undefined,
      voltage: num(e['Dc/0/Voltage']) ?? undefined,
      current: current ?? undefined,
      power: num(e['Dc/0/Power']) ?? undefined,
      state: current != null ? stateFromCurrent(current) : 'Unknown',
    }
    if (name.toLowerCase().includes('shunt')) {
      shunt = {
        voltage: entry.voltage ?? null,
        current: entry.current ?? null,
        power: entry.power ?? null,
      }
      continue
    }
    batteries.push(entry)
  }

  let battV = num(sys('Dc/Battery/Voltage'))
  let battI = num(sys('Dc/Battery/Current'))
  let battP = num(sys('Dc/Battery/Power'))
  let battSoc: number | null = null
  if (shunt && shunt.voltage != null) {
    battSoc = voltageSoc(shunt.voltage)
    if (battV == null) battV = shunt.voltage
    if (battI == null) battI = shunt.current
    if (battP == null) battP = shunt.power
  } else if (battV != null) {
    battSoc = voltageSoc(battV)
  }

  const chargersMap = groupByInstance(snap.solarcharger)
  const mpptChargers: NonNullable<InverterState['mppt_chargers']> = []
  let mpptTotal = 0
  for (const inst of Object.keys(chargersMap).sort(
    (a, b) => (Number.parseInt(a, 10) || 0) - (Number.parseInt(b, 10) || 0),
  )) {
    const e = chargersMap[inst]
    const power = num(e['Yield/Power']) || 0
    mpptTotal += power
    mpptChargers.push({
      name: String(e.CustomName || e.ProductName || `MPPT ${inst}`).trim(),
      power,
      pv_voltage: num(e['Pv/V']) || 0,
      current: num(e['Dc/0/Current']) || 0,
    })
  }

  const pvMap = groupByInstance(snap.pvinverter)
  const pvInverters: NonNullable<InverterState['pv_inverters']> = []
  let pvTotal = 0
  for (const inst of Object.keys(pvMap).sort(
    (a, b) => (Number.parseInt(a, 10) || 0) - (Number.parseInt(b, 10) || 0),
  )) {
    const e = pvMap[inst]
    let power = num(e['Ac/Power'])
    if (power == null) power = num(e['Ac/L1/Power']) || 0
    pvTotal += power
    pvInverters.push({
      name: String(e.CustomName || e.ProductName || `PV Inverter ${inst}`).trim(),
      power,
      voltage: num(e['Ac/L1/Voltage']) ?? undefined,
      current: num(e['Ac/L1/Current']) ?? undefined,
    })
  }

  let solarTotal = num(sys('Dc/Pv/Power'))
  if (mpptChargers.length || pvInverters.length) {
    solarTotal = mpptTotal + pvTotal
  } else if (solarTotal == null) {
    solarTotal = 0
  }

  const loadsMap = groupByInstance(snap.acload)
  const loads: Record<string, number> = {}
  for (const inst of Object.keys(loadsMap)) {
    const e = loadsMap[inst]
    const name = String(e.CustomName || e.ProductName || `Load ${inst}`).trim()
    let power = num(e['Ac/Power'])
    if (power == null) power = num(e['Ac/L1/Power'])
    if (power == null) continue
    let key = name
    let n = 2
    while (Object.prototype.hasOwnProperty.call(loads, key)) {
      key = `${name} (${n})`
      n += 1
    }
    loads[key] = power
  }

  const vebusMap = groupByInstance(snap.vebus)
  let inverterState: string | null = null
  let setpoint: number | null = null
  for (const inst of Object.keys(vebusMap)) {
    const e = vebusMap[inst]
    if (e.State != null) {
      const code = Number.parseInt(String(e.State), 10)
      inverterState = INVERTER_STATES[code] || `? (${code})`
    }
    const sp = num(e['Hub4/L1/AcPowerSetpoint'])
    if (sp != null) setpoint = sp
    if (inverterState != null) break
  }

  let waterLevel: number | null = null
  const tankMap = groupByInstance(snap.tank)
  for (const inst of Object.keys(tankMap)) {
    waterLevel = num(tankMap[inst].Level)
    if (waterLevel != null) break
  }

  let evPower: number | null = null
  const evMap = groupByInstance(snap.ev)
  for (const inst of Object.keys(evMap)) {
    evPower = num(evMap[inst]['Ac/Power'])
    break
  }
  let evChargingKw: number | null = null
  const evcMap = groupByInstance(snap.evcharger)
  for (const inst of Object.keys(evcMap)) {
    const w = num(evcMap[inst]['Ac/Power'])
    if (w != null) {
      evChargingKw = w / 1000.0
      break
    }
  }

  const state = {
    ok: true,
    public_mode: true,
    read_only: true,
    gt: gt ?? undefined,
    g1: g1 ?? undefined,
    g2: g2 ?? undefined,
    tt: tt ?? undefined,
    t1: t1 ?? undefined,
    t2: t2 ?? undefined,
    solar_total: solarTotal ?? undefined,
    mppt_total: mpptTotal,
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
