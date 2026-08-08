const path = require('path')
const fs = require('fs/promises')
const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage } = require('electron')
const { startDesktopServer } = require('./server.cjs')

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {{ close: () => void, port: number } | null} */
let desktopServer = null

function resolveDistDir() {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', 'dist')
  }
  return path.join(process.resourcesPath, 'dist')
}

function secretsPath() {
  return path.join(app.getPath('userData'), 'ai-secrets.json')
}

/** @param {unknown} payload */
function payloadToBuffer(payload) {
  const body = payload && typeof payload === 'object' ? payload : {}
  if (typeof body.dataBase64 === 'string' && body.dataBase64) {
    return Buffer.from(body.dataBase64, 'base64')
  }
  if (body.data != null) {
    return Buffer.from(body.data)
  }
  throw new Error('empty file data')
}

function encryptSecret(plain) {
  const text = String(plain || '')
  if (!text) return { enc: false, data: '' }
  if (safeStorage.isEncryptionAvailable()) {
    return {
      enc: true,
      data: safeStorage.encryptString(text).toString('base64'),
    }
  }
  return { enc: false, data: text }
}

function decryptSecret(entry) {
  if (!entry || typeof entry !== 'object') return ''
  const data = String(entry.data || '')
  if (!data) return ''
  if (entry.enc && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(data, 'base64'))
    } catch {
      return ''
    }
  }
  return data
}

function registerIpc() {
  ipcMain.handle('aura:save-file', async (event, payload = {}) => {
    try {
      const defaultPath = String(payload.defaultPath || 'download.bin')
      const filters = Array.isArray(payload.filters) ? payload.filters : undefined
      const buffer = payloadToBuffer(payload)

      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showSaveDialog(win ?? undefined, {
        defaultPath,
        filters:
          filters && filters.length
            ? filters
            : [{ name: 'All Files', extensions: ['*'] }],
      })

      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true }
      }

      await fs.writeFile(result.filePath, buffer)
      return { ok: true, filePath: result.filePath }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

  ipcMain.handle('aura:write-file', async (_event, payload = {}) => {
    try {
      const filePath = String(payload.filePath || '')
      if (!filePath) return { ok: false, error: 'missing filePath' }
      const buffer = payloadToBuffer(payload)
      await fs.writeFile(filePath, buffer)
      return { ok: true, filePath }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

  ipcMain.handle('aura:secrets-get', async () => {
    try {
      const raw = await fs.readFile(secretsPath(), 'utf8')
      const parsed = JSON.parse(raw)
      const keys = parsed?.keys && typeof parsed.keys === 'object' ? parsed.keys : {}
      /** @type {Record<string, string>} */
      const out = {}
      for (const [provider, entry] of Object.entries(keys)) {
        const value = decryptSecret(entry)
        if (value) out[provider] = value
      }
      return { ok: true, keys: out, activeProvider: parsed.activeProvider || null }
    } catch (err) {
      if (err && typeof err === 'object' && err.code === 'ENOENT') {
        return { ok: true, keys: {}, activeProvider: null }
      }
      return {
        ok: false,
        keys: {},
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

  ipcMain.handle('aura:secrets-set', async (_event, payload = {}) => {
    try {
      const keysIn = payload.keys && typeof payload.keys === 'object' ? payload.keys : {}
      /** @type {Record<string, { enc: boolean, data: string }>} */
      const keys = {}
      for (const [provider, value] of Object.entries(keysIn)) {
        const plain = String(value || '').trim()
        if (!plain) continue
        keys[provider] = encryptSecret(plain)
      }
      const body = {
        version: 1,
        updatedAt: new Date().toISOString(),
        activeProvider: payload.activeProvider || null,
        keys,
      }
      await fs.writeFile(secretsPath(), JSON.stringify(body, null, 2), 'utf8')
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })
}

async function createWindow() {
  desktopServer = await startDesktopServer({
    distDir: resolveDistDir(),
    preferredPort: 17831,
  })

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: '光语 AuraCard',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  await mainWindow.loadURL(`http://127.0.0.1:${desktopServer.port}/`)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function shutdownServer() {
  if (desktopServer) {
    desktopServer.close()
    desktopServer = null
  }
}

app.whenReady().then(async () => {
  registerIpc()
  await createWindow()
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  shutdownServer()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', shutdownServer)
