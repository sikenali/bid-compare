// Electron 主进程文件 - ES Module 版本
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

// 在 ES Module 中模拟 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 获取应用根目录（兼容开发模式和生产模式）
// 开发模式: 返回项目根目录
// 生产模式: 返回 ASAR 包内的路径
const getAppRoot = () => {
  return app.getAppPath()
}

// 保持对窗口对象的全局引用
let mainWindow

function createWindow() {
  const appRoot = getAppRoot()
  
  // 图标路径 - 在生产环境中使用 ICO 文件
  const iconPath = path.join(appRoot, 'dist', 'favicon.ico')
  
  // preload 脚本路径（使用 .cjs 扩展名以支持 CommonJS 语法）
  const preloadPath = path.join(appRoot, 'preload.cjs')

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false
    },
    icon: iconPath,
    title: '文件对对碰',
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#F8F4E9',
    show: false  // 先不显示，等待内容加载完成
  })

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    // 开发模式: 加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    if (process.env.OPEN_DEV_TOOLS === 'true') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    // 生产模式: 加载构建后的 HTML 文件
    const indexPath = path.join(appRoot, 'dist', 'index.html')
    console.log('Loading production HTML:', indexPath)
    console.log('App root:', appRoot)
    console.log('Icon path:', iconPath)
    
    mainWindow.loadFile(indexPath)
  }

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show')
    mainWindow.show()
  })
  
  // 监听加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  // 窗口关闭时清理资源
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理
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

    // 操作系统版本（Windows NT 版本号和实际 Windows 版本映射）
    let osVersion = `${osType} ${osRelease}`
    if (osType === 'Windows_NT') {
      // os.release() 返回 NT 内核版本号，如 "10.0.26100"
      // 通过第三位构建版本号判断具体 Windows 版本
      const buildNumber = parseInt(osRelease.split('.')[2] || '0', 10)
      
      if (buildNumber >= 26100) {
        osVersion = 'Windows 11 24H2/25H2'
      } else if (buildNumber >= 22621) {
        osVersion = 'Windows 11 22H2/23H2'
      } else if (buildNumber >= 22000) {
        osVersion = 'Windows 11'
      } else if (buildNumber >= 19041) {
        osVersion = 'Windows 10'
      } else if (buildNumber >= 18362) {
        osVersion = 'Windows 10'
      } else if (buildNumber >= 17763) {
        osVersion = 'Windows 10 1809'
      } else if (buildNumber >= 10240) {
        osVersion = 'Windows 10'
      } else if (osRelease.startsWith('6.3')) {
        osVersion = 'Windows 8.1'
      } else if (osRelease.startsWith('6.1')) {
        osVersion = 'Windows 7'
      } else {
        osVersion = `Windows NT ${osRelease}`
      }
    } else if (osType === 'Darwin') {
      osVersion = `macOS ${osRelease}`
    } else if (osType === 'Linux') {
      osVersion = `Linux ${osRelease}`
    }

    // CPU 信息
    const cpuModel = cpus[0]?.model || '未知处理器'
    const cpuCores = cpus.length
    const cpuSpeed = cpus[0]?.speed || 0

    // 内存信息格式化
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

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          networkName = name
          ipAddress = iface.address
          macAddress = iface.mac.toUpperCase().replace(/-/g, ':')
          subnetMask = iface.netmask
          gateway = ipAddress.split('.').slice(0, 3).join('.') + '.1'
          break
        }
      }
      if (ipAddress !== '未找到') break
    }

    // 设备指纹生成
    const generateDeviceFingerprint = () => {
      const components = [hostname, macAddress, cpuModel, String(totalMem), arch, osRelease]
      const hash = components.join('|')
      let h = 0
      for (let i = 0; i < hash.length; i++) {
        const char = hash.charCodeAt(i)
        h = ((h << 5) - h) + char
        h = h & h
      }
      return Math.abs(h).toString(36).padStart(8, '0') + '-' + Date.now().toString(36).slice(-6)
    }

    const deviceFingerprint = generateDeviceFingerprint()

    // 运行时间格式化
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
