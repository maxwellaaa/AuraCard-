const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('auraDesktop', {
  platform: process.platform,
  isDesktop: true,
})
