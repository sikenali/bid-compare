// Electron preload 脚本
// 在渲染进程中暴露安全的 IPC 通信接口

const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 获取平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // 获取硬件信息
  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info')
})
