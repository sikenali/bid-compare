import { ref, onMounted } from 'vue'

interface HardwareData {
  systemInfo: {
    title: string
    icon: any
    iconBg: string
    iconColor: string
    items: { label: string; value: string }[]
  }
  networkInfo: {
    title: string
    icon: any
    iconBg: string
    iconColor: string
    items: { label: string; value: string }[]
  }
  fingerprintInfo: {
    title: string
    icon: any
    iconBg: string
    iconColor: string
    items: { label: string; value: string; isWide: boolean }[]
  }
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 生成设备指纹
function generateDeviceFingerprint(components: string[]): string {
  const hash = components.join('|')
  let h = 0
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i)
    h = ((h << 5) - h) + char
    h = h & h // Convert to 32bit integer
  }
  return Math.abs(h).toString(36).padStart(8, '0') +
    '-' + Date.now().toString(36).slice(-6)
}

// 浏览器模式获取硬件信息
async function getBrowserHardwareInfo(): Promise<HardwareData> {
  // 解析 User Agent 获取操作系统信息
  const ua = navigator.userAgent
  let osName = '未知操作系统'
  let osVersion = ''

  if (ua.includes('Windows NT')) {
    const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)
    const ntMap: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7'
    }
    osName = ntMap[ntVersion?.[1] || ''] || 'Windows'
    // 尝试获取更详细的版本
    const winVer = ua.match(/Windows NT 10\.0;.*?(\d{4})/)
    if (winVer) osVersion = `${osName} ${winVer[1]}`
    else osVersion = osName
  } else if (ua.includes('Mac OS X')) {
    const macVer = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    osName = 'macOS'
    osVersion = macVer ? `macOS ${macVer[1].replace(/_/g, '.')}` : 'macOS'
  } else if (ua.includes('Linux')) {
    osName = 'Linux'
    osVersion = 'Linux'
  }

  // CPU 信息
  const cpuCores = navigator.hardwareConcurrency || '未知'
  let cpuName = `${cpuCores} 核处理器`
  if (ua.includes('Intel')) {
    const intelMatch = ua.match(/Intel.*?;\s*([^)]+)/)
    if (intelMatch) cpuName = intelMatch[1].trim()
    else cpuName = `Intel ${cpuCores} 核`
  } else if (ua.includes('Apple')) {
    cpuName = `Apple Silicon (${cpuCores} 核)`
  } else if (ua.includes('ARM')) {
    cpuName = `ARM ${cpuCores} 核`
  }

  // 内存信息
  const deviceMemory = (navigator as any).deviceMemory
  const memStr = deviceMemory ? `${deviceMemory} GB` : '未知'

  // 系统类型
  const arch = navigator.platform || '未知架构'
  const is64 = ua.includes('Win64') || ua.includes('x64') || ua.includes('x86_64') || ua.includes('WOW64')
  const systemType = is64 ? `64 位操作系统, ${arch}` : `32 位操作系统, ${arch}`

  // 网络信息
  let ipAddress = '获取中...'
  let macAddress = '浏览器模式不可用'
  let subnetMask = '浏览器模式不可用'
  let gateway = '浏览器模式不可用'

  // 尝试通过 WebRTC 获取本地 IP
  try {
    const ipPromise = new Promise<string>((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer))
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve('获取失败')
          return
        }
        const ipMatch = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        pc.close()
        resolve(ipMatch ? ipMatch[1] : '获取失败')
      }
      setTimeout(() => { pc.close(); resolve('获取超时') }, 3000)
    })
    ipAddress = await ipPromise
  } catch {
    ipAddress = '获取失败'
  }

  // Canvas 指纹
  function getCanvasFingerprint(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (!ctx) return '00000000'
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('fingerprint', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('fingerprint', 4, 17)
    const dataUrl = canvas.toDataURL()
    let hash = 0
    for (let i = 0; i < dataUrl.length; i++) {
      hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(36).padStart(8, '0')
  }

  const canvasFp = getCanvasFingerprint()
  const deviceFingerprint = generateDeviceFingerprint([
    ua,
    String(navigator.hardwareConcurrency),
    String(deviceMemory),
    navigator.language,
    String(screen.width) + 'x' + String(screen.height),
    canvasFp
  ])

  return {
    systemInfo: {
      title: '操作系统信息',
      icon: null, // Will be set by component
      iconBg: 'rgba(219, 234, 254, 1)',
      iconColor: 'rgba(37, 99, 235, 1)',
      items: [
        { label: '用户名', value: navigator.language || '未知' },
        { label: '操作系统版本', value: osVersion },
        { label: '处理器', value: cpuName },
        { label: '内存', value: memStr },
        { label: '系统类型', value: systemType },
        { label: '计算机名称', value: '浏览器模式' }
      ]
    },
    networkInfo: {
      title: '网络信息',
      icon: null,
      iconBg: 'rgba(254, 243, 199, 1)',
      iconColor: 'rgba(217, 119, 6, 1)',
      items: [
        { label: 'IP 地址', value: ipAddress },
        { label: 'MAC 地址', value: macAddress },
        { label: '子网掩码', value: subnetMask },
        { label: '网关', value: gateway }
      ]
    },
    fingerprintInfo: {
      title: '设备指纹信息',
      icon: null,
      iconBg: 'rgba(252, 231, 243, 1)',
      iconColor: 'rgba(219, 39, 119, 1)',
      items: [
        { label: '设备唯一标识', value: deviceFingerprint, isWide: true }
      ]
    }
  }
}

// NW.js 模式获取硬件信息
async function getNWJSHardwareInfo(): Promise<HardwareData> {
  // 这些需要在 NW.js 环境下通过 require('os') 获取
  // 浏览器构建时会跳过，实际运行时由 NW.js 提供
  try {
    // @ts-ignore - NW.js 运行时
    const osModule = window.require?.('os') || window.nw?.require?.('os')
    if (!osModule) throw new Error('os module not available')

    const os = osModule

    const hostname = os.hostname()
    const osType = os.type()
    const osRelease = os.release()
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const arch = os.arch()
    const networkInterfaces = os.networkInterfaces()

    // 操作系统版本
    let osVersion = `${osType} ${osRelease}`
    if (osType === 'Windows_NT') {
      if (osRelease.startsWith('10.')) osVersion = 'Windows 10/11'
      else if (osRelease.startsWith('6.3')) osVersion = 'Windows 8.1'
      else if (osRelease.startsWith('6.1')) osVersion = 'Windows 7'
    }

    // CPU 信息
    const cpuModel = cpus[0]?.model || '未知处理器'
    const cpuCores = cpus.length

    // 内存信息
    const totalMemGB = formatBytes(totalMem)
    const availMemGB = formatBytes(freeMem)
    const memStr = `${totalMemGB} (${availMemGB} 可用)`

    // 系统类型
    const is64 = osRelease.includes('64') || arch.includes('64') || arch === 'x64' || arch === 'arm64'
    const systemType = is64 ? `64 位操作系统, 基于 ${arch} 的处理器` : `32 位操作系统, 基于 ${arch} 的处理器`

    // 网络信息
    let ipAddress = '未找到'
    let macAddress = '未找到'
    let subnetMask = '未找到'
    let gateway = '未找到'

    // 遍历网络接口获取信息
    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of (interfaces as any[])) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address
          macAddress = iface.mac.toUpperCase().replace(/-/g, ':')
          subnetMask = iface.netmask
          // 网关需要通过其他方式获取，这里暂时设为默认网关
          gateway = ipAddress.split('.').slice(0, 3).join('.') + '.1'
          break
        }
      }
      if (ipAddress !== '未找到') break
    }

    // 设备指纹
    const components = [
      hostname,
      macAddress,
      cpuModel,
      String(totalMem),
      arch
    ]
    const deviceFingerprint = generateDeviceFingerprint(components)

    return {
      systemInfo: {
        title: '操作系统信息',
        icon: null,
        iconBg: 'rgba(219, 234, 254, 1)',
        iconColor: 'rgba(37, 99, 235, 1)',
        items: [
          { label: '用户名', value: process.env.USERNAME || process.env.USER || hostname },
          { label: '操作系统版本', value: osVersion },
          { label: '处理器', value: `${cpuModel} (${cpuCores} 核)` },
          { label: '内存', value: memStr },
          { label: '系统类型', value: systemType },
          { label: '计算机名称', value: hostname }
        ]
      },
      networkInfo: {
        title: '网络信息',
        icon: null,
        iconBg: 'rgba(254, 243, 199, 1)',
        iconColor: 'rgba(217, 119, 6, 1)',
        items: [
          { label: 'IP 地址', value: ipAddress },
          { label: 'MAC 地址', value: macAddress },
          { label: '子网掩码', value: subnetMask },
          { label: '网关', value: gateway }
        ]
      },
      fingerprintInfo: {
        title: '设备指纹信息',
        icon: null,
        iconBg: 'rgba(252, 231, 243, 1)',
        iconColor: 'rgba(219, 39, 119, 1)',
        items: [
          { label: '设备唯一标识', value: deviceFingerprint, isWide: true }
        ]
      }
    }
  } catch {
    // NW.js 不可用时回退到浏览器模式
    return getBrowserHardwareInfo()
  }
}

// 检测是否为 NW.js 环境
function isNWJSEnvironment(): boolean {
  // @ts-ignore
  return typeof window !== 'undefined' && (typeof window.require === 'function' || typeof window.nw !== 'undefined')
}

export function useHardwareInfo() {
  const systemInfo = ref<HardwareData['systemInfo'] | null>(null)
  const networkInfo = ref<HardwareData['networkInfo'] | null>(null)
  const fingerprintInfo = ref<HardwareData['fingerprintInfo'] | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const loadHardwareInfo = async () => {
    isLoading.value = true
    error.value = null

    try {
      const data = isNWJSEnvironment()
        ? await getNWJSHardwareInfo()
        : await getBrowserHardwareInfo()

      systemInfo.value = data.systemInfo
      networkInfo.value = data.networkInfo
      fingerprintInfo.value = data.fingerprintInfo
    } catch (err) {
      error.value = (err as Error).message
      console.error('获取硬件信息失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    loadHardwareInfo()
  })

  return {
    systemInfo,
    networkInfo,
    fingerprintInfo,
    isLoading,
    error,
    refresh: loadHardwareInfo
  }
}
