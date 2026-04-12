import { ref, onMounted } from 'vue'

interface HardwareData {
  systemInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: { label: string; value: string }[]
  }
  networkInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: { label: string; value: string }[]
  }
  fingerprintInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: { label: string; value: string; isWide?: boolean }[]
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

// Electron 模式获取硬件信息（通过 IPC）
async function getElectronHardwareInfo(): Promise<HardwareData> {
  if (!window.electronAPI || !window.electronAPI.getHardwareInfo) {
    throw new Error('Electron API 不可用')
  }
  
  const result = await window.electronAPI.getHardwareInfo()
  return {
    systemInfo: result.systemInfo,
    networkInfo: result.networkInfo,
    fingerprintInfo: result.fingerprintInfo
  }
}

// 浏览器模式获取硬件信息
async function getBrowserHardwareInfo(): Promise<HardwareData> {
  // 解析 User Agent 获取操作系统信息
  const ua = navigator.userAgent
  let osName = '未知操作系统'
  let osVersion = '未知版本'

  if (ua.includes('Windows NT')) {
    const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)
    const ntMap: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7'
    }
    osName = ntMap[ntVersion?.[1] || ''] || 'Windows'
    osVersion = osName
  } else if (ua.includes('Mac OS X')) {
    const macVer = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    osName = 'macOS'
    osVersion = macVer ? `macOS ${macVer[1].replace(/_/g, '.')}` : 'macOS'
  } else if (ua.includes('Linux')) {
    osName = 'Linux'
    osVersion = 'Linux'
  } else if (ua.includes('Android')) {
    osName = 'Android'
    osVersion = 'Android'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    osName = 'iOS'
    osVersion = 'iOS'
  }

  // CPU 信息
  const cpuCores = navigator.hardwareConcurrency || '未知'
  let cpuName = `${cpuCores} 核处理器`
  if (ua.includes('Intel')) {
    cpuName = `Intel ${cpuCores} 核`
  } else if (ua.includes('Apple') || ua.includes('ARM')) {
    cpuName = `Apple Silicon / ARM (${cpuCores} 核)`
  }

  // 内存信息
  const deviceMemory = (navigator as any).deviceMemory
  const memStr = deviceMemory ? `约 ${deviceMemory} GB` : '浏览器无法获取'

  // 系统类型
  const arch = navigator.platform || '未知架构'
  const is64 = ua.includes('Win64') || ua.includes('x64') || ua.includes('x86_64') || ua.includes('WOW64') || ua.includes('arm64')
  const systemType = is64 ? `64 位环境, ${arch}` : `32 位环境, ${arch}`

  // 屏幕信息
  const screenRes = `${screen.width} x ${screen.height}`

  // 网络信息
  let ipAddress = '获取中...'
  let publicIP = '获取中...'

  // 尝试通过 WebRTC 获取本地 IP
  try {
    const ipPromise = new Promise<string>((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer))
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve('浏览器限制获取')
          return
        }
        const ipMatch = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        pc.close()
        resolve(ipMatch ? ipMatch[1] : '浏览器限制获取')
      }
      setTimeout(() => { pc.close(); resolve('获取超时') }, 3000)
    })
    ipAddress = await ipPromise
  } catch {
    ipAddress = '浏览器限制获取'
  }

  // 尝试获取公网 IP
  try {
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(3000) 
    })
    const data = await response.json()
    publicIP = data.ip || '获取失败'
  } catch {
    publicIP = '获取失败'
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
  
  // WebGL 指纹
  function getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) return 'webgl_unavailable'
      
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
      if (!debugInfo) return 'webgl_debug_unavailable'
      
      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      
      let hash = 0
      const str = vendor + renderer
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash = hash & hash
      }
      return Math.abs(hash).toString(36).padStart(8, '0')
    } catch {
      return 'webgl_error'
    }
  }

  const webglFp = getWebGLFingerprint()
  
  const deviceFingerprint = generateDeviceFingerprint([
    ua,
    String(navigator.hardwareConcurrency),
    String(deviceMemory),
    navigator.language,
    String(screen.width) + 'x' + String(screen.height),
    canvasFp,
    webglFp
  ])

  // 浏览器信息
  const browserInfo = detectBrowser(ua)

  return {
    systemInfo: {
      title: '浏览器环境信息',
      iconBg: 'rgba(219, 234, 254, 1)',
      iconColor: 'rgba(37, 99, 235, 1)',
      items: [
        { label: '浏览器', value: browserInfo },
        { label: '操作系统', value: osVersion },
        { label: '处理器核心', value: `${cpuCores} 逻辑核心` },
        { label: '设备内存', value: memStr },
        { label: '系统架构', value: systemType },
        { label: '屏幕分辨率', value: screenRes },
        { label: '语言环境', value: navigator.language }
      ]
    },
    networkInfo: {
      title: '网络信息（浏览器限制）',
      iconBg: 'rgba(254, 243, 199, 1)',
      iconColor: 'rgba(217, 119, 6, 1)',
      items: [
        { label: '本地 IP (WebRTC)', value: ipAddress },
        { label: '公网 IP', value: publicIP },
        { label: 'MAC 地址', value: '浏览器安全限制不可用' },
        { label: '子网掩码', value: '浏览器安全限制不可用' },
        { label: '默认网关', value: '浏览器安全限制不可用' }
      ]
    },
    fingerprintInfo: {
      title: '设备指纹信息（浏览器）',
      iconBg: 'rgba(252, 231, 243, 1)',
      iconColor: 'rgba(219, 39, 119, 1)',
      items: [
        { label: 'Canvas 指纹', value: canvasFp, isWide: true },
        { label: 'WebGL 指纹', value: webglFp, isWide: true },
        { label: '设备标识', value: deviceFingerprint, isWide: true }
      ]
    }
  }
}

// 检测浏览器类型
function detectBrowser(ua: string): string {
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/)
    return `Microsoft Edge ${match?.[1] || ''}`
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    return `Google Chrome ${match?.[1] || ''}`
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    return `Mozilla Firefox ${match?.[1] || ''}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/([\d.]+)/)
    return `Safari ${match?.[1] || ''}`
  }
  return '未知浏览器'
}

// 检测运行环境
function detectEnvironment(): 'electron' | 'browser' {
  // 检查是否存在 electronAPI
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'electron'
  }
  return 'browser'
}

export function useHardwareInfo() {
  const systemInfo = ref<HardwareData['systemInfo'] | null>(null)
  const networkInfo = ref<HardwareData['networkInfo'] | null>(null)
  const fingerprintInfo = ref<HardwareData['fingerprintInfo'] | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const isElectron = ref(false)

  const loadHardwareInfo = async () => {
    isLoading.value = true
    error.value = null

    try {
      const env = detectEnvironment()
      isElectron.value = env === 'electron'
      
      const data = env === 'electron'
        ? await getElectronHardwareInfo()
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
    isElectron,
    refresh: loadHardwareInfo
  }
}
