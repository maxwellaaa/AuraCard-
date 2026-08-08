const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('auraDesktop', {
  platform: process.platform,
  isDesktop: true,
  /** Native save dialog + write (Blob/<a download> is unreliable in Electron, esp. macOS). */
  saveFile: (payload) => ipcRenderer.invoke('aura:save-file', payload),
  /** Write to an absolute path (e.g. sibling PNGs after first save dialog). */
  writeFile: (payload) => ipcRenderer.invoke('aura:write-file', payload),
  /** Load API keys from Electron userData (survives localhost port changes). */
  getSecrets: () => ipcRenderer.invoke('aura:secrets-get'),
  /** Persist API keys (safeStorage when available). */
  setSecrets: (payload) => ipcRenderer.invoke('aura:secrets-set', payload),
})
