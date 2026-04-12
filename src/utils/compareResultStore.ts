/**
 * 对比结果数据存储模块
 * 使用模块级 Map 替代 window 全局变量，避免数据污染和竞争
 */

interface CompareResultData {
  segments: any[]
  leftFileName: string
  rightFileName: string
  textSimilarity: string
  similarSegmentsCount: number
  leftTotalPages?: number
  rightTotalPages?: number
}

// 模块级私有 Map，使用请求 ID 作为 key
const resultStore = new Map<string, CompareResultData>()

// 自增 ID 计数器
let nextId = 1

/**
 * 存储对比结果
 * @returns 存储 ID，用于后续读取
 */
export function storeCompareResult(data: CompareResultData): string {
  const id = `result_${nextId++}`
  resultStore.set(id, data)
  return id
}

/**
 * 读取对比结果
 * @param id 存储 ID
 * @returns 对比结果数据，如果不存在则返回 null
 */
export function getCompareResult(id: string): CompareResultData | null {
  return resultStore.get(id) || null
}

/**
 * 删除对比结果
 * @param id 存储 ID
 */
export function deleteCompareResult(id: string): void {
  resultStore.delete(id)
}

/**
 * 清理所有存储的对比结果
 */
export function clearAllCompareResults(): void {
  resultStore.clear()
}

/**
 * 获取存储的结果数量
 */
export function getStoreSize(): number {
  return resultStore.size
}
