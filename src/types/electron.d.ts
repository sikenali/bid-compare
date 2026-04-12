// Electron API 类型定义
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getHardwareInfo: () => Promise<HardwareInfoResult>
}

export interface HardwareInfoResult {
  systemInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: Array<{ label: string; value: string }>
  }
  networkInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: Array<{ label: string; value: string }>
  }
  fingerprintInfo: {
    title: string
    iconBg: string
    iconColor: string
    items: Array<{ label: string; value: string; isWide?: boolean }>
  }
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
