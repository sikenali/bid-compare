import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppArch: () => ipcRenderer.invoke('get-app-arch'),
  getAppPlatform: () => ipcRenderer.invoke('get-app-platform'),
  showAboutDialog: () => ipcRenderer.invoke('show-about-dialog'),
})
