import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const configuration = vi.hoisted(() => ({ apiBase: '' }))
vi.mock('../config/publicMode', () => ({
  apiUrl: (path: string) => `${configuration.apiBase}${path}`,
  gatewaySnapshotUrl: () => '/snapshot',
  isPublicMode: () => false,
}))
vi.mock('./useChart', () => ({ addHistoryPoint: vi.fn() }))

import { useConnection } from './useConnection'
import { mqttConnected } from './useInverterState'

class FakeWebSocket {
  static OPEN = 1
  static instances: FakeWebSocket[] = []
  readyState = FakeWebSocket.OPEN
  url: string
  onopen: ((ev?: unknown) => void) | null = null
  onclose: ((ev?: unknown) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  close() {
    this.readyState = 3
  }
  send() {}
}

describe('private mode forwards page token', () => {
  let connection: ReturnType<typeof useConnection>
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    configuration.apiBase = ''
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
    vi.stubGlobal('location', {
      protocol: 'https:',
      host: 'dash.example',
      search: '?token=a%26b%2Bc',
    })
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, mqtt_connected: true, gt: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)
    mqttConnected.value = false
    connection = useConnection()
  })

  afterEach(() => {
    connection.cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens WebSocket with token query', () => {
    connection.connectMqtt()
    expect(FakeWebSocket.instances[0]?.url).toBe('wss://dash.example/ws?token=a%26b%2Bc')
  })

  it('polls /api/state with token query', async () => {
    connection.connectMqtt()
    // force poll path: no recent WS message by leaving lastMessageTime old via timer
    await vi.advanceTimersByTimeAsync(0)
    // first poll happens in startHttpPoll; WS is OPEN so pollHttpState may skip if lastMessageTime fresh
    // advance past 8000ms silence window without messages
    await vi.advanceTimersByTimeAsync(9000)
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls.some((u) => String(u).includes('/api/state?token=a%26b%2Bc'))).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dash.example/api/state?token=a%26b%2Bc',
      expect.objectContaining({ credentials: 'same-origin', redirect: 'error' }),
    )
  })

  it.each([
    'https://other.example', '//other.example', 'http://dash.example',
    'https://user:password@dash.example', 'https://dash.example?forward=',
    'https://dash.example#forward=',
  ])('does not send page credentials to an unsafe API base: %s', async (base) => {
    configuration.apiBase = base
    connection.connectMqtt()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(FakeWebSocket.instances[0]?.url).toBe('wss://dash.example/ws?token=a%26b%2Bc')
  })

  it('supports a same-origin deployment prefix', async () => {
    configuration.apiBase = '/dashboard'
    connection.connectMqtt()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dash.example/dashboard/api/state?token=a%26b%2Bc', expect.any(Object),
    )
  })

  it('does not accept a redirected private response', async () => {
    fetchMock.mockResolvedValue({ ok: true, redirected: true, json: vi.fn() })
    connection.connectMqtt()
    await vi.advanceTimersByTimeAsync(0)
    expect(mqttConnected.value).toBe(false)
    expect((await fetchMock.mock.results[0].value).json).not.toHaveBeenCalled()
  })
})
