// Electron 主进程文件
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')

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
      preload: path.join(__dirname, 'preload.js'),
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
    // 打开开发者工具（由环境变量控制）
    if (process.env.OPEN_DEV_TOOLS === 'true') {
      mainWindow.webContents.openDevTools()
    }
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

// 获取硬件信息
ipcMain.handle('get-hardware-info', () => {
  try {
    const hostname = os.hostname()
    const osType = os.type()
    const osRelease = os.release()
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const arch = os.arch()
    const networkInterfaces = os.networkInterfaces()
    const uptime = os.uptime()

    // 操作系统版本
    let osVersion = `${osType} ${osRelease}`
    if (osType === 'Windows_NT') {
      if (osRelease.startsWith('10.')) osVersion = 'Windows 10/11'
      else if (osRelease.startsWith('6.3')) osVersion = 'Windows 8.1'
      else if (osRelease.startsWith('6.1')) osVersion = 'Windows 7'
    } else if (osType === 'Darwin') {
      osVersion = `macOS ${osRelease}`
    } else if (osType === 'Linux') {
      osVersion = `Linux ${osRelease}`
    }

    // CPU 信息
    const cpuModel = cpus[0]?.model || '未知处理器'
    const cpuCores = cpus.length
    const cpuSpeed = cpus[0]?.speed || 0

    // 内存信息
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const totalMemGB = formatBytes(totalMem)
    const availMemGB = formatBytes(freeMem)
    const usedMemGB = formatBytes(totalMem - freeMem)
    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100)

    // 系统类型
    const is64 = arch.includes('64') || arch === 'x64' || arch === 'arm64'
    const systemType = is64 ? `64 位操作系统, ${arch} 架构` : `32 位操作系统, ${arch} 架构`

    // 网络信息
    let ipAddress = '未找到'
    let macAddress = '未找到'
    let subnetMask = '未找到'
    let gateway = '未找到'
    let networkName = '未找到'

    // 遍历网络接口获取信息
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          networkName = name
          ipAddress = iface.address
          macAddress = iface.mac.toUpperCase().replace(/-/g, ':')
          subnetMask = iface.netmask
          // 默认网关通常是 IP 的第一个地址段 + .1
          gateway = ipAddress.split('.').slice(0, 3).join('.') + '.1'
          break
        }
      }
      if (ipAddress !== '未找到') break
    }

    // 设备指纹（基于 MAC 地址和 CPU 信息）
    const generateDeviceFingerprint = () => {
      const components = [
        hostname,
        macAddress,
        cpuModel,
        String(totalMem),
        arch,
        osRelease
      ]
      const hash = components.join('|')
      let h = 0
      for (let i = 0; i < hash.length; i++) {
        const char = hash.charCodeAt(i)
        h = ((h << 5) - h) + char
        h = h & h
      }
      return Math.abs(h).toString(36).padStart(8, '0') +
        '-' + Date.now().toString(36).slice(-6)
    }

    const deviceFingerprint = generateDeviceFingerprint()

    // 格式化运行时间
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${days} 天 ${hours} 小时 ${minutes} 分钟`
    }

    return {
      systemInfo: {
        title: '操作系统信息',
        iconBg: 'rgba(219, 234, 254, 1)',
        iconColor: 'rgba(37, 99, 235, 1)',
        items: [
          { label: '用户名', value: process.env.USERNAME || process.env.USER || hostname },
          { label: '操作系统版本', value: osVersion },
          { label: '处理器', value: `${cpuModel} (${cpuCores} 核 @ ${cpuSpeed} MHz)` },
          { label: '内存', value: `${totalMemGB} (已用 ${usedMemGB} / ${availMemGB} 可用, ${memPercent}%)` },
          { label: '系统类型', value: systemType },
          { label: '计算机名称', value: hostname },
          { label: '运行时间', value: formatUptime(uptime) }
        ]
      },
      networkInfo: {
        title: '网络信息',
        iconBg: 'rgba(254, 243, 199, 1)',
        iconColor: 'rgba(217, 119, 6, 1)',
        items: [
          { label: '网络适配器', value: networkName },
          { label: 'IPv4 地址', value: ipAddress },
          { label: 'MAC 地址', value: macAddress },
          { label: '子网掩码', value: subnetMask },
          { label: '默认网关', value: gateway }
        ]
      },
      fingerprintInfo: {
        title: '设备指纹信息',
        iconBg: 'rgba(252, 231, 243, 1)',
        iconColor: 'rgba(219, 39, 119, 1)',
        items: [
          { label: '设备唯一标识', value: deviceFingerprint, isWide: true }
        ]
      }
    }
  } catch (error) {
    console.error('获取硬件信息失败:', error)
    return {
      systemInfo: {
        title: '操作系统信息',
        iconBg: 'rgba(219, 234, 254, 1)',
        iconColor: 'rgba(37, 99, 235, 1)',
        items: [{ label: '错误', value: error.message }]
      },
      networkInfo: {
        title: '网络信息',
        iconBg: 'rgba(254, 243, 199, 1)',
        iconColor: 'rgba(217, 119, 6, 1)',
        items: [{ label: '错误', value: error.message }]
      },
      fingerprintInfo: {
        title: '设备指纹信息',
        iconBg: 'rgba(252, 231, 243, 1)',
        iconColor: 'rgba(219, 39, 119, 1)',
        items: [{ label: '错误', value: error.message, isWide: true }]
      }
    }
  }
})
