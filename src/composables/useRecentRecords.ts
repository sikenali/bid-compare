import { ref, reactive, onMounted, onActivated, computed, type Ref, type ComputedRef } from 'vue'
import type { SimilarSegment } from '../utils/textAlgorithms'

// 属性对比详情类型
export interface PropertyDetail {
  name: string
  leftValue: string
  rightValue: string
  status: 'match' | 'mismatch' | 'warning'
}

// 定义最近记录类型
export interface RecentRecord {
  id: number
  filename: string
  timestamp: string
  similarity: string
  leftFileName: string
  rightFileName: string
  similarSegments?: SimilarSegment[]
  propertyDetails?: PropertyDetail[]
}

// 模块级存储 - 按类型区分，确保单例
const recordStores = new Map<string, {
  recentRecords: RecentRecord[]
  showRecentRecords: boolean
}>()

// 清理 HTML 标签，减少存储大小
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').substring(0, 200)
}

// 获取或创建指定类型的存储
const getStore = (recordType: string) => {
  if (!recordStores.has(recordType)) {
    recordStores.set(recordType, {
      recentRecords: reactive<RecentRecord[]>([]),
      showRecentRecords: false
    })
  }
  return recordStores.get(recordType)!
}

// 从 localStorage 加载记录到指定存储
const loadFromStorage = (recordType: string) => {
  const storageKey = `${recordType}RecentRecords`
  const store = getStore(recordType)

  try {
    const savedRecords = localStorage.getItem(storageKey)
    if (savedRecords) {
      const parsed = JSON.parse(savedRecords) as RecentRecord[]
      store.recentRecords.length = 0
      parsed.forEach(record => store.recentRecords.push(record))
      store.showRecentRecords = parsed.length > 0
    } else {
      store.recentRecords.length = 0
      store.showRecentRecords = false
    }
  } catch (error) {
    store.recentRecords.length = 0
    store.showRecentRecords = false
  }
}

// 保存指定类型的记录到 localStorage
const saveToStorage = (recordType: string) => {
  const storageKey = `${recordType}RecentRecords`
  const store = getStore(recordType)
  let maxRetries = 20

  while (maxRetries > 0) {
    const compressed = store.recentRecords.map(record => ({
      ...record,
      // 只保留前 10 个相似片段，减少存储大小
      similarSegments: record.similarSegments
        ? record.similarSegments.slice(0, 10).map(seg => ({
            ...seg,
            leftContent: stripHtml(seg.leftContent),
            rightContent: stripHtml(seg.rightContent)
          }))
        : undefined
    }))

    try {
      localStorage.setItem(storageKey, JSON.stringify(compressed))
      store.showRecentRecords = store.recentRecords.length > 0
      return // 保存成功，退出
    } catch (e) {
      // 删除最旧的记录
      if (store.recentRecords.length > 1) {
        store.recentRecords.pop()
        maxRetries--
      } else {
        // 如果只有一条记录还是失败，清空
        store.recentRecords.length = 0
        store.showRecentRecords = false
        localStorage.removeItem(storageKey)
        return
      }
    }
  }

  // 超过最大重试次数，强制清空
  store.recentRecords.length = 0
  store.showRecentRecords = false
  localStorage.removeItem(storageKey)
}

// 导出最近记录组合式函数
export function useRecentRecords(recordType: 'fileCompare' | 'propertyCheck') {
  const store = getStore(recordType)

  // 创建计算属性以确保响应式
  const recentRecords = computed(() => store.recentRecords) as ComputedRef<RecentRecord[]>
  const showRecentRecords = computed(() => store.showRecentRecords) as ComputedRef<boolean>

  // 添加新记录
  const addRecentRecord = (record: Omit<RecentRecord, 'id'>) => {
    const newId = Math.max(0, ...store.recentRecords.map(r => r.id)) + 1
    const newRecord: RecentRecord = { id: newId, ...record }
    store.recentRecords.unshift(newRecord)
    if (store.recentRecords.length > 10) {
      store.recentRecords.pop()
    }
    saveToStorage(recordType)
  }

  // 删除单条记录
  const deleteRecord = (id: number) => {
    const index = store.recentRecords.findIndex(r => r.id === id)
    if (index !== -1) {
      store.recentRecords.splice(index, 1)
      saveToStorage(recordType)
    }
  }

  // 一键清除记录
  const clearAllRecords = () => {
    store.recentRecords.length = 0
    store.showRecentRecords = false
    localStorage.removeItem(`${recordType}RecentRecords`)
  }

  // 手动触发加载（供外部调用）
  const loadRecentRecords = () => {
    loadFromStorage(recordType)
  }

  // 组件挂载时加载
  onMounted(() => {
    loadFromStorage(recordType)
  })

  // keep-alive 激活时重新加载
  onActivated(() => {
    loadFromStorage(recordType)
  })

  return {
    recentRecords,
    showRecentRecords,
    addRecentRecord,
    deleteRecord,
    clearAllRecords,
    loadRecentRecords
  }
}
