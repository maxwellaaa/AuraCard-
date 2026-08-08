/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface AuraDesktopFileResult {
  ok: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

interface AuraDesktopSecretsResult {
  ok: boolean
  keys: Record<string, string>
  activeProvider?: string | null
  error?: string
}

interface AuraDesktopApi {
  platform: string
  isDesktop: true
  saveFile: (payload: {
    defaultPath: string
    data?: ArrayBuffer | Uint8Array
    dataBase64?: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<AuraDesktopFileResult>
  writeFile: (payload: {
    filePath: string
    data?: ArrayBuffer | Uint8Array
    dataBase64?: string
  }) => Promise<AuraDesktopFileResult>
  getSecrets: () => Promise<AuraDesktopSecretsResult>
  setSecrets: (payload: {
    keys: Record<string, string>
    activeProvider?: string | null
  }) => Promise<{ ok: boolean; error?: string }>
}

interface Window {
  auraDesktop?: AuraDesktopApi
}
