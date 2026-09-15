import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConnection } from './useConnection'
import { mqttConnected } from './useInverterState'

vi.mock('../config/publicMode', () => ({
  apiUrl: (path: string) => path,
  gatewaySnapshotUrl: () => '/snapshot',
  isPublicMode: () => false,
}))
vi.mock('./useChart', () => ({ addHistoryPoint: vi.fn() }))

class FakeSocket {
  static OPEN = 1
  static latest: FakeSocket
  readyState = 0
  onopen?: () => void
  onclose?: () => void
  onerror?: () => void
  onmessage?: (event: { data: string }) => void
  send = vi.fn()
  constructor() { FakeSocket.latest = this }
  close() { this.readyState = 3 }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('command channel availability', () => {
  it('keeps writes unavailable while HTTP telemetry is live but WebSocket is down', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ data_source: 'igw', gateway_connected: true }),
    }))
    const connection = useConnection()
    connection.connectMqtt()
    await vi.advanceTimersByTimeAsync(0)
    expect(mqttConnected.value).toBe(true)
    expect(connection.commandConnected.value).toBe(false)
    FakeSocket.latest.readyState = FakeSocket.OPEN
    FakeSocket.latest.onopen?.()
    expect(connection.commandConnected.value).toBe(true)
    FakeSocket.latest.onerror?.()
    await vi.advanceTimersByTimeAsync(3000)
    expect(mqttConnected.value).toBe(true)
    expect(connection.commandConnected.value).toBe(false)
    connection.cleanup()
  })
})
