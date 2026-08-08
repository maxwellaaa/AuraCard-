const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('auraDesktop', {
  platform: process.platform,
  isDesktop: true,
  /**
   * Native save dialog + write file.
   * Blob / <a download> is unreliable in Electron (especially macOS).
   * @param {{ defaultPath: string, dataBase64: string, filters?: { name: string, extensions: string[] }[] }} payload
   */
  saveFile: (payload) => ipcRenderer.invoke('aura:save-file', payload),
  /**
   * Write bytes to an absolute path (no dialog) — used for multi-PNG after first save.
   * @param {{ filePath: string, dataBase64: string }} payload
   */
  writeFile: (payload) => ipcRenderer.invoke('aura:write-file', payload),
})
