import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as url from 'url'

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#FAF6F0',
    icon: path.join(__dirname, '../../public/logo-icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 标题栏显示版本和架构信息
  const version = app.getVersion()
  const arch = process.arch
  const platform = process.platform
  win.setTitle(`bid-compare v${version} (${platform}/${arch})`)

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    )
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: 获取应用版本
ipcMain.handle('get-app-version', () => app.getVersion())

// IPC: 获取当前架构
ipcMain.handle('get-app-arch', () => process.arch)

// IPC: 获取当前平台
ipcMain.handle('get-app-platform', () => process.platform)

// IPC: 打开关于对话框
ipcMain.handle('show-about-dialog', () => {
  dialog.showMessageBox({
    type: 'info',
    title: '关于 bid-compare',
    message: `bid-compare\n版本 ${app.getVersion()}\n${process.platform}/${process.arch}`,
    buttons: ['确定'],
  })
})
