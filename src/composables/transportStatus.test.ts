import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConnection } from './useConnection'
import { mqttConnected, state } from './useInverterState'

vi.mock('../config/publicMode', () => ({
  apiUrl: (path: string) => path,
  isPublicMode: () => false,
}))
vi.mock('./useChart', () => ({ addHistoryPoint: vi.fn() }))

class MockSocket {
  static OPEN = 1
  static latest: MockSocket
  readyState = 1
  onmessage: ((event: MessageEvent) => void) | null = null
  constructor() {
    MockSocket.latest = this
  }
  close() {}
  send() {}
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('backend transport status', () => {
  it('does not label a disconnect frame or HTTP fallback numeric defaults as live MQTT', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', MockSocket)
    const offline = {
      gt: 0,
      battery_soc: 0,
      mqtt_connected: false,
      telemetry_available: { gt: false, battery_soc: false },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => offline }))
    const connection = useConnection()
    connection.connectMqtt()
    await vi.advanceTimersByTimeAsync(0)
    const deliver = (payload: object) =>
      MockSocket.latest.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }))
    deliver({ gt: 0, mqtt_connected: true, telemetry_available: { gt: true } })
    expect(mqttConnected.value).toBe(true)
    expect(state.value.gt).toBe(0)
    deliver(offline)
    expect(mqttConnected.value).toBe(false)
    expect(state.value.gt).toBeUndefined()
    deliver({ gt: 100, mqtt_connected: true })
    await vi.advanceTimersByTimeAsync(9000)
    expect(mqttConnected.value).toBe(false)
    expect(state.value.gt).toBeUndefined()
    connection.cleanup()
  })
})
