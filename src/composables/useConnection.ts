import { markRaw } from 'vue'
import { logger } from '../logger'
import {
  mqttConnected,
  type InverterState,
  state,
} from './useInverterState'

export function useConnection() {
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let lastMessageTime = Date.now()

  function processState(newState: InverterState) {
    state.value = markRaw(newState)
  }

  function connectMqtt() {
    if (ws && ws.readyState === WebSocket.OPEN) return
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

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
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // Auto-reconnect on visibility change
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          connectMqtt()
        }
      }
    })

    window.addEventListener('online', () => {
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
