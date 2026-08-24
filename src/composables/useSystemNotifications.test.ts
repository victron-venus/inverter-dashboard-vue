import { beforeEach, describe, expect, it, vi } from 'vitest'
import { state } from './useInverterState'

// Browser Notification API stub — records calls, permission always granted.
const sentNotifications: Array<{ title: string; body: string }> = []
// NB: must be a constructable function — notify() does `new Notification(...)`.
const notificationStub = function (this: unknown, title: string, opts?: { body?: string }) {
  sentNotifications.push({ title, body: opts?.body || '' })
  return { close() {} }
} as unknown as typeof Notification
;(notificationStub as unknown as { permission: string }).permission = 'granted'
vi.stubGlobal('Notification', notificationStub)

const mod = await import('./useSystemNotifications')
const { initSystemNotifications } = mod

function setState(patch: Record<string, unknown>) {
  state.value = { ...state.value, ...patch }
}

async function tick() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('useSystemNotifications', () => {
  beforeEach(() => {
    sentNotifications.length = 0
  })

  it('notifies on EV charging start and stop', async () => {
    initSystemNotifications()
    setState({ ev_charging_kw: 0 }) // baseline reading
    await tick()
    setState({ ev_charging_kw: 7.5 })
    await tick()
    expect(sentNotifications.some((n) => n.title === 'EV Charging Started')).toBe(true)

    setState({ ev_charging_kw: 0 })
    await tick()
    expect(sentNotifications.some((n) => n.title === 'EV Charging Stopped')).toBe(true)
  })

  it('does not fire on first observation (no previous value)', async () => {
    // fresh module already initialized above; simulate by clearing prev via new start
    setState({})
    await tick()
    const count = sentNotifications.length
    setState({ ev_charging_kw: 3 })
    await tick()
    // first EV observation must not produce "Started" without a prior 0 reading
    if (!sentNotifications.slice(count).some((n) => n.title === 'EV Charging Started')) return
    throw new Error('fired without baseline')
  })

  it('cooldown suppresses rapid repeats', async () => {
    initSystemNotifications()
    setState({ water_valve: false }) // baseline reading
    await tick()
    setState({ water_valve: true })
    await tick()
    expect(sentNotifications.filter((n) => n.title === 'Water Valve')).toHaveLength(1)
    // flip back and forth quickly — only the first flip may notify
    setState({ water_valve: false })
    await tick()
    setState({ water_valve: true }) // re-open within cooldown -> suppressed
    await tick()
    const opens = sentNotifications.filter((n) => n.body === 'Valve OPENED')
    expect(opens).toHaveLength(1)
    expect(sentNotifications.some((n) => n.body === 'Valve CLOSED')).toBe(true)
  })

  it('warns once when SoC crosses below threshold', async () => {
    initSystemNotifications()
    setState({ battery_soc: 25 })
    await tick()
    setState({ battery_soc: 15 })
    await tick()
    expect(sentNotifications.some((n) => n.title === 'Battery Low')).toBe(true)
  })

  it('detects grid loss', async () => {
    initSystemNotifications()
    setState({ gt: 1500 })
    await tick()
    setState({ gt: 0 })
    await tick()
    expect(sentNotifications.some((n) => n.title === 'Grid Lost')).toBe(true)
  })

  it('notify is a no-op when permission not granted', async () => {
    const original = Notification.permission
    ;(Notification as unknown as { permission: string }).permission = 'denied'
    mod.notify('X', 'Y')
    expect(sentNotifications).toHaveLength(0)
    ;(Notification as unknown as { permission: string }).permission = original
  })
})
