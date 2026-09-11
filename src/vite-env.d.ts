/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_MODE?: string
  readonly VITE_GATEWAY_SNAPSHOT_PATH?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
