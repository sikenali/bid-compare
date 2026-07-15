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
    h = h & h
  }
  return Math.abs(h).toString(36).padStart(8, '0') +
    '-' + Date.now().toString(36).slice(-6)
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

// Canvas 指纹
function getCanvasFingerprint(): string {
  try {
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
  } catch {
    return '00000000'
  }
}

// WebGL GPU 信息
function getWebGLInfo(): { vendor: string; renderer: string; fingerprint: string } {
  const empty = { vendor: '未知', renderer: '未知', fingerprint: 'webgl_unavailable' }
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return empty

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) {
      return {
        vendor: '未知',
        renderer: '未知',
        fingerprint: 'webgl_debug_unavailable'
      }
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '未知'
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '未知'

    let hash = 0
    const str = vendor + renderer
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash
    }

    return {
      vendor,
      renderer,
      fingerprint: Math.abs(hash).toString(36).padStart(8, '0')
    }
  } catch {
    return empty
  }
}

// 获取网络信息（浏览器原生 API）
function getNetworkInfo(): { type: string; downlink: string; effectiveType: string; rtt: string } {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (!conn) {
    return { type: '未知', downlink: '未知', effectiveType: '未知', rtt: '未知' }
  }
  return {
    type: conn.type || conn.effectiveType || '未知',
    downlink: conn.downlink ? `${conn.downlink} Mbps` : '未知',
    effectiveType: conn.effectiveType || '未知',
    rtt: conn.rtt !== undefined ? `${conn.rtt} ms` : '未知'
  }
}

// 获取电池信息
async function getBatteryInfo(): Promise<{ level: string; charging: string; chargingTime: string }> {
  try {
    if (!('getBattery' in navigator)) {
      return { level: '不支持', charging: '不支持', chargingTime: '不支持' }
    }
    const battery = await (navigator as any).getBattery()
    return {
      level: `${Math.round(battery.level * 100)}%`,
      charging: battery.charging ? '充电中' : '未充电',
      chargingTime: battery.chargingTime === Infinity ? '未知' : `${Math.round(battery.chargingTime / 60)} 分钟`
    }
  } catch {
    return { level: '获取失败', charging: '获取失败', chargingTime: '获取失败' }
  }
}

// 通过 WebRTC 获取本地 IP
async function getLocalIP(): Promise<string> {
  try {
    const ipPromise = new Promise<string>((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer))
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve('浏览器限制')
          return
        }
        const ipMatch = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        pc.close()
        resolve(ipMatch ? ipMatch[1] : '浏览器限制')
      }
      setTimeout(() => { pc.close(); resolve('获取超时') }, 3000)
    })
    return await ipPromise
  } catch {
    return '浏览器限制'
  }
}

// 获取公网 IP（多源容错）
async function getPublicIP(): Promise<string> {
  const sources = [
    // Cloudflare - 国内稳定
    { url: 'https://cloudflare.com/cdn-cgi/trace', parse: (text: string) => {
      const match = text.match(/ip=([\d.]+)/)
      return match?.[1] || null
    }},
    // httpbin
    { url: 'https://httpbin.org/ip', parse: (text: string) => {
      try { return JSON.parse(text).origin } catch { return null }
    }},
    // ipify
    { url: 'https://api.ipify.org/?format=json', parse: (text: string) => {
      try { return JSON.parse(text).ip } catch { return null }
    }}
  ]

  for (const source of sources) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const response = await fetch(source.url, {
        signal: controller.signal,
        mode: 'no-cors'
      })
      clearTimeout(timeoutId)

      // no-cors 模式下 response 不可读，跳到下一个源
      if (response.type === 'opaque') continue

      const text = await response.text()
      const ip = source.parse(text)
      if (ip) return ip
    } catch {
      continue
    }
  }

  return '获取失败'
}

// 浏览器模式获取硬件信息
async function getBrowserHardwareInfo(): Promise<HardwareData> {
  const ua = navigator.userAgent

  // 解析操作系统
  let osName = '未知操作系统'
  if (ua.includes('Windows NT')) {
    const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)
    const ntMap: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7'
    }
    osName = ntMap[ntVersion?.[1] || ''] || 'Windows'
  } else if (ua.includes('Mac OS X')) {
    const macVer = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    osName = macVer ? `macOS ${macVer[1].replace(/_/g, '.')}` : 'macOS'
  } else if (ua.includes('Linux')) {
    osName = 'Linux'
  } else if (ua.includes('Android')) {
    osName = 'Android'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    osName = 'iOS'
  }

  // CPU 信息
  const cpuCores = navigator.hardwareConcurrency || 0
  let cpuName = cpuCores ? `${cpuCores} 核处理器` : '未知'
  if (ua.includes('Intel')) {
    cpuName = `Intel ${cpuCores} 核`
  } else if (ua.includes('Apple') || ua.includes('ARM')) {
    cpuName = `Apple Silicon / ARM (${cpuCores} 核)`
  }

  // 内存信息
  const deviceMemory = (navigator as any).deviceMemory
  const memStr = deviceMemory ? `约 ${deviceMemory} GB` : '浏览器无法获取'

  // 架构信息
  const arch = navigator.platform || '未知架构'
  const is64 = ua.includes('Win64') || ua.includes('x64') || ua.includes('x86_64') || ua.includes('WOW64') || ua.includes('arm64')
  const systemType = is64 ? `64 位, ${arch}` : `32 位, ${arch}`

  // 屏幕信息
  const screenRes = `${screen.width} x ${screen.height}`
  const pixelRatio = window.devicePixelRatio || 1
  const screenInfo = `${screenRes} (${pixelRatio}x 像素比)`

  // GPU 信息
  const webglInfo = getWebGLInfo()

  // 并行获取网络和电池信息（不阻塞主流程）
  const [localIP, publicIP, networkInfo, batteryInfo] = await Promise.all([
    getLocalIP(),
    getPublicIP(),
    Promise.resolve(getNetworkInfo()),
    getBatteryInfo()
  ])

  // 浏览器信息
  const browserInfo = detectBrowser(ua)

  // Canvas 指纹
  const canvasFp = getCanvasFingerprint()

  // 设备指纹
  const deviceFingerprint = generateDeviceFingerprint([
    ua,
    String(cpuCores),
    String(deviceMemory),
    navigator.language,
    `${screen.width}x${screen.height}`,
    canvasFp,
    webglInfo.fingerprint
  ])

  return {
    systemInfo: {
      title: '设备信息',
      iconBg: 'rgba(219, 234, 254, 1)',
      iconColor: 'rgba(37, 99, 235, 1)',
      items: [
        { label: '浏览器', value: browserInfo },
        { label: '操作系统', value: osName },
        { label: '系统架构', value: systemType },
        { label: '处理器 (CPU)', value: cpuCores ? `${cpuName} / ${cpuCores} 线程` : '未知' },
        { label: '设备内存 (RAM)', value: memStr },
        { label: 'GPU 显卡', value: webglInfo.renderer !== '未知' ? webglInfo.renderer : '浏览器无法获取显卡型号' },
        { label: '屏幕尺寸', value: `${screen.width} x ${screen.height} (${pixelRatio}x 像素比)` },
        { label: '语言环境', value: navigator.language },
        { label: '设备编号', value: deviceFingerprint.substring(0, 16) },
        { label: '设备名称', value: `${osName} - ${browserInfo}` }
      ]
    },
    networkInfo: {
      title: '网络信息',
      iconBg: 'rgba(254, 243, 199, 1)',
      iconColor: 'rgba(217, 119, 6, 1)',
      items: [
        { label: '本地 IP (WebRTC)', value: localIP },
        { label: '公网 IP', value: publicIP },
        { label: '网络类型', value: networkInfo.type },
        { label: '下行速度', value: networkInfo.downlink },
        { label: '网络质量', value: networkInfo.effectiveType },
        { label: '延迟 (RTT)', value: networkInfo.rtt },
        { label: '有线网卡', value: '浏览器安全限制，无法获取' },
        { label: 'MAC 地址', value: '浏览器安全限制，无法获取' },
        { label: '无线网卡', value: navigator.connection?.type === 'wifi' ? 'WiFi 已连接' : '非 WiFi 连接' },
        { label: '蓝牙', value: navigator.bluetooth ? '支持 Bluetooth API' : '浏览器不支持' },
        { label: '电池电量', value: batteryInfo.level },
        { label: '充电状态', value: batteryInfo.charging }
      ]
    },
    fingerprintInfo: {
      title: '设备指纹信息',
      iconBg: 'rgba(252, 231, 243, 1)',
      iconColor: 'rgba(219, 39, 119, 1)',
      items: [
        { label: '设备标识', value: deviceFingerprint, isWide: true }
      ]
    }
  }
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
      const data = await getBrowserHardwareInfo()

      systemInfo.value = data.systemInfo
      networkInfo.value = data.networkInfo
      fingerprintInfo.value = data.fingerprintInfo
    } catch (err) {
      error.value = (err as Error).message
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
