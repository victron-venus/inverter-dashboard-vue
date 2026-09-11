/** Public / here.now mode: poll inverter-gateway snapshot instead of MQTT WS backend. */

export type PublicRuntimeConfig = {
  enabled?: boolean
  snapshotPath?: string
  apiBase?: string
}

declare global {
  interface Window {
    __INVERTER_PUBLIC__?: boolean | PublicRuntimeConfig
  }
}

function metaContent(name: string): string | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`meta[name="${name}"]`)
  return el?.getAttribute('content') ?? null
}

function runtimeConfig(): PublicRuntimeConfig | null {
  if (typeof window === 'undefined') return null
  const v = window.__INVERTER_PUBLIC__
  if (v === true) return { enabled: true }
  if (v && typeof v === 'object') return v
  return null
}

export function isPublicMode(): boolean {
  if (import.meta.env.VITE_PUBLIC_MODE === 'true') return true
  const rt = runtimeConfig()
  if (rt?.enabled === true) return true
  const meta = metaContent('inverter-public-mode')
  return meta === 'true' || meta === '1'
}

export function gatewaySnapshotPath(): string {
  const fromEnv = import.meta.env.VITE_GATEWAY_SNAPSHOT_PATH
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
  const rt = runtimeConfig()
  if (rt?.snapshotPath) return rt.snapshotPath
  const meta = metaContent('inverter-gateway-snapshot')
  if (meta?.trim()) return meta.trim()
  return '/api/gateway/snapshot'
}

export function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE
  if (typeof fromEnv === 'string') return fromEnv.replace(/\/$/, '')
  const rt = runtimeConfig()
  if (typeof rt?.apiBase === 'string') return rt.apiBase.replace(/\/$/, '')
  const meta = metaContent('inverter-api-base')
  if (meta) return meta.replace(/\/$/, '')
  return ''
}

/** Join API base with a path beginning with `/`. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = apiBase()
  return base ? `${base}${p}` : p
}
