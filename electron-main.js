// Electron 主进程文件
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// 保持对窗口对象的全局引用，如果不这样做，当 JavaScript 对象被垃圾回收时窗口会自动关闭
let mainWindow

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'dist/favicon.ico'),
    title: '文件对对碰',
    // 使用菜单栏隐藏选项
    autoHideMenuBar: true,
    // 窗口样式
    frame: true,
    backgroundColor: '#F8F4E9'
  })

  // 加载应用 - 在开发模式下加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式下加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    // 取消引用窗口对象
    mainWindow = null
  })

  // 可选：处理窗口就绪事件
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，
    // 通常会在应用中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 可选：处理 IPC 通信
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})
