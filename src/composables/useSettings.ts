import { reactive, onMounted } from 'vue'

// 定义设置类型
export interface FileCompareSettings {
  ngramSize: number
  minDuplicateWords: number
  textSimilarityThreshold: number
  imageSimilarityThreshold: number
  maxResults: number
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
  ignoreCase: boolean
  ignoreInvisibleChars: boolean
  // AI模型设置
  selectedModel: string
  apiKey: string
  apiEndpoint: string
  // 导出设置
  exportFormat: string
  includeHighlight: boolean
  includeCharts: boolean
}

// 定义默认设置
export const defaultSettings: FileCompareSettings = {
  ngramSize: 3,
  minDuplicateWords: 8,
  textSimilarityThreshold: 75,
  imageSimilarityThreshold: 80,
  maxResults: 100,
  ignorePunctuation: true,
  ignoreWhitespace: true,
  ignoreCase: false,
  ignoreInvisibleChars: true,
  selectedModel: 'deepseek',
  apiKey: '',
  apiEndpoint: '',
  exportFormat: 'word',
  includeHighlight: true,
  includeCharts: true
}

// 导出设置组合式函数
export function useSettings() {
  // 响应式设置对象
  const settings = reactive<FileCompareSettings>({ ...defaultSettings })

  // 加载设置
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('fileCompareSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as FileCompareSettings
        Object.assign(settings, {
          ...defaultSettings,
          ...parsed
        })
      } catch (error) {
        console.error('加载设置失败:', error)
        // 加载失败时使用默认值
        resetToDefault()
      }
    }
  }

  // 保存设置
  const saveSettings = () => {
    localStorage.setItem('fileCompareSettings', JSON.stringify(settings))
    console.log('保存设置成功：', settings)
    alert('设置已保存')
  }

  // 重置为默认值
  const resetToDefault = () => {
    Object.assign(settings, defaultSettings)
  }

  // 取消设置（恢复到之前保存的值）
  const cancelSettings = () => {
    loadSettings()
  }

  // 初始化时加载设置
  onMounted(() => {
    loadSettings()
  })

  return {
    settings,
    loadSettings,
    saveSettings,
    resetToDefault,
    cancelSettings
  }
}