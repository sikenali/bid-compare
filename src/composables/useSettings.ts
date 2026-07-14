import { reactive, onMounted } from 'vue'

// 定义设置类型
export interface FileCompareSettings {
  settingsVersion?: number
  // 对比参数
  ngramSize: number
  minDuplicateWords: number
  textSimilarityThreshold: number
  imageSimilarityThreshold: number
  maxResults: number
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
  ignoreCase: boolean
  ignoreInvisibleChars: boolean
  // 查重参数
  paragraphCount: number
  minDupChars: number
  clauseRemovalEnabled: boolean
  clauseRemovalGranularity: number
  removeWatermark: boolean
  // 图片查重
  enableImageCompare: boolean
  // OCR设置
  ocrLanguage: string
  enableOCRCompare: boolean
  // 多文件对比
  enableMultiFileCompare: boolean
  maxMultiFileCount: number
  // AI模型设置
  selectedModel: string
  apiKey: string
  apiEndpoint: string
  // 导出设置
  exportFormat: string
  includeHighlight: boolean
  includeCharts: boolean
  // 主题设置
  theme: string
}

const SETTINGS_VERSION = 2

// 定义默认设置
export const defaultSettings: FileCompareSettings = {
  settingsVersion: SETTINGS_VERSION,
  ngramSize: 3,
  minDuplicateWords: 8,
  textSimilarityThreshold: 75,
  imageSimilarityThreshold: 80,
  maxResults: 100,
  ignorePunctuation: true,
  ignoreWhitespace: true,
  ignoreCase: false,
  ignoreInvisibleChars: true,
  paragraphCount: 5,
  minDupChars: 8,
  clauseRemovalEnabled: false,
  clauseRemovalGranularity: 5,
  removeWatermark: true,
  enableImageCompare: false,
  ocrLanguage: 'chi_sim+eng',
  enableOCRCompare: false,
  enableMultiFileCompare: false,
  maxMultiFileCount: 3,
  selectedModel: 'deepseek',
  apiKey: '',
  apiEndpoint: '',
  exportFormat: 'word',
  includeHighlight: true,
  includeCharts: true,
  theme: 'light'
}

// 模块级单例 - 确保所有组件共享同一个 settings 对象
const settings = reactive<FileCompareSettings>({ ...defaultSettings })
let isInitialized = false

// 导出设置组合式函数
export function useSettings() {
  // 加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('fileCompareSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<FileCompareSettings>

        // 设置版本迁移
        if (!parsed.settingsVersion || parsed.settingsVersion < SETTINGS_VERSION) {
          parsed.settingsVersion = SETTINGS_VERSION
          const migrated = { ...defaultSettings, ...parsed }
          localStorage.setItem('fileCompareSettings', JSON.stringify(migrated))
          Object.assign(settings, migrated)
          return
        }

        Object.assign(settings, {
          ...defaultSettings,
          ...parsed
        })
      } else {
        Object.assign(settings, defaultSettings)
      }
      // Apply saved theme
      if (settings.theme) {
        document.documentElement.dataset.theme = settings.theme === 'light' ? '' : settings.theme
      }
    } catch (error) {
      Object.assign(settings, defaultSettings)
    }
  }

  // 保存设置
  const saveSettings = () => {
    try {
      localStorage.setItem('fileCompareSettings', JSON.stringify(settings))
      return true
    } catch (error) {
      return false
    }
  }

  // 重置为默认值并保存
  const resetToDefault = () => {
    Object.assign(settings, defaultSettings)
    saveSettings()
  }

  // 取消设置（恢复到之前保存的值）
  const cancelSettings = () => {
    loadSettings()
  }

  // 初始化时加载设置（仅执行一次）
  if (!isInitialized) {
    onMounted(() => {
      loadSettings()
    })
    isInitialized = true
    loadSettings()
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    resetToDefault,
    cancelSettings
  }
}
