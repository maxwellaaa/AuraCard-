/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface AuraDesktopSaveFileResult {
  ok: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

interface AuraDesktopApi {
  platform: string
  isDesktop: true
  saveFile: (payload: {
    defaultPath: string
    dataBase64: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<AuraDesktopSaveFileResult>
  writeFile: (payload: {
    filePath: string
    dataBase64: string
  }) => Promise<AuraDesktopSaveFileResult>
}

interface Window {
  auraDesktop?: AuraDesktopApi
}
