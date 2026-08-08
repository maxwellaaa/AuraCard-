const path = require('path')
const fs = require('fs/promises')
const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron')
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

function registerDesktopIpc() {
  ipcMain.handle('aura:save-file', async (event, payload = {}) => {
    try {
      const defaultPath = String(payload.defaultPath || 'download.bin')
      const dataBase64 = String(payload.dataBase64 || '')
      const filters = Array.isArray(payload.filters) ? payload.filters : undefined
      if (!dataBase64) {
        return { ok: false, error: 'empty file data' }
      }

      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showSaveDialog(win ?? undefined, {
        title: '保存文件',
        defaultPath,
        filters:
          filters && filters.length
            ? filters
            : [{ name: 'All Files', extensions: ['*'] }],
      })

      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true }
      }

      await fs.writeFile(result.filePath, Buffer.from(dataBase64, 'base64'))
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
      const dataBase64 = String(payload.dataBase64 || '')
      if (!filePath) return { ok: false, error: 'Missing filePath' }
      if (!dataBase64) return { ok: false, error: 'empty file data' }
      await fs.writeFile(filePath, Buffer.from(dataBase64, 'base64'))
      return { ok: true, filePath }
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
  registerDesktopIpc()
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
