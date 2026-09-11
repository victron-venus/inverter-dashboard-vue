import { markRaw } from 'vue'
import { apiUrl, gatewaySnapshotPath, isPublicMode } from '../config/publicMode'
import { logger } from '../logger'
import { type InverterState, mqttConnected, state } from './useInverterState'
import { type GatewaySnapshot, snapshotToState } from './publicGateway'

export function useConnection() {
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastMessageTime = Date.now()
  const publicMode = isPublicMode()

  function processState(newState: InverterState) {
    state.value = markRaw(newState)
  }

  async function pollPublicGateway() {
    try {
      const resp = await fetch(apiUrl(gatewaySnapshotPath()), {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!resp.ok) return
      const snap = (await resp.json()) as GatewaySnapshot
      const data = snapshotToState(snap)
      processState({ ...state.value, ...data })
      if (
        typeof data.gt === 'number' ||
        typeof data.battery_soc === 'number' ||
        typeof data.battery_power === 'number'
      ) {
        mqttConnected.value = true
        lastMessageTime = Date.now()
      }
    } catch {
      // keep polling
    }
  }

  async function pollHttpState() {
    // Fallback when WS is down or silent: /api/state carries live tiles (1.8.17+).
    if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMessageTime < 8000) {
      return
    }
    try {
      const resp = await fetch(apiUrl('/api/state'), { cache: 'no-store' })
      if (!resp.ok) return
      const data = (await resp.json()) as InverterState & { ok?: boolean }
      if (!data || data.ok === false) return
      processState({ ...state.value, ...data })
      if (typeof data.gt === 'number' || typeof data.battery_soc === 'number') {
        mqttConnected.value = true
        lastMessageTime = Date.now()
      }
    } catch {
      // ignore — WS reconnect path owns hard failures
    }
  }

  function startHttpPoll() {
    if (pollTimer) return
    const tick = publicMode ? pollPublicGateway : pollHttpState
    void tick()
    pollTimer = setInterval(() => {
      void tick()
    }, 3000)
  }

  function stopHttpPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function connectPublic() {
    startHttpPoll()
  }

  function connectMqtt() {
    if (publicMode) {
      connectPublic()
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) return
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    startHttpPoll()
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    try {
      ws = new WebSocket(`${proto}//${location.host}/ws`)
    } catch (e) {
      logger.error('WebSocket connection failed:', e)
      mqttConnected.value = false
      reconnectTimer = setTimeout(connectMqtt, 2000)
      return
    }

    ws.onopen = () => {
      logger.log('WebSocket connected')
      lastMessageTime = Date.now()
      startHeartbeat()
      startHttpPoll()
    }

    ws.onclose = () => {
      mqttConnected.value = false
      stopHeartbeat()
      reconnectTimer = setTimeout(connectMqtt, 2000)
    }

    ws.onerror = () => {
      logger.error('WebSocket error')
      mqttConnected.value = false
      ws?.close()
    }

    ws.onmessage = (e) => {
      lastMessageTime = Date.now()
      try {
        const data = JSON.parse(e.data) as InverterState
        processState(data)
        mqttConnected.value = true
      } catch (err) {
        logger.error('Failed to parse WS message:', err)
      }
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (Date.now() - lastMessageTime > 15000) {
        logger.log('No data received, reconnecting...')
        ws?.close()
      }
    }, 5000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function send(action: string, payload: Record<string, unknown> = {}) {
    if (publicMode) {
      // Read-only public host — writes disabled
      return
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...payload }))
    }
  }

  function cleanup() {
    if (ws) {
      ws.close()
      ws = null
    }
    stopHeartbeat()
    stopHttpPoll()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // Auto-reconnect on visibility change
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (publicMode) {
          void pollPublicGateway()
          return
        }
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          connectMqtt()
        }
      }
    })

    window.addEventListener('online', () => {
      if (publicMode) {
        void pollPublicGateway()
        return
      }
      ws?.close()
      setTimeout(connectMqtt, 500)
    })
  }

  return {
    state,
    mqttConnected,
    haMqttConnected: { value: null },
    appConfig: { value: null },
    connectMqtt,
    send,
    ensureNotificationPermission: async () => {},
    cleanup,
  }
}
