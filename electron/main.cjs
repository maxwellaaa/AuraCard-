const path = require('path')
const { app, BrowserWindow, shell } = require('electron')
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
