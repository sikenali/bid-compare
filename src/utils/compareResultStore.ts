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
  leftFileContent?: string
  rightFileContent?: string
  imageDuplicates?: any[]
}

interface PropertyCheckResultData {
  leftFileName: string
  rightFileName: string
  leftFileProperties: Record<string, string>
  rightFileProperties: Record<string, string>
  propertyDetails: any[]
  similarity: number
  similarityStatus: string
}

// 模块级私有 Map，使用请求 ID 作为 key
const compareResultStore = new Map<string, CompareResultData>()
const propertyCheckResultStore = new Map<string, PropertyCheckResultData>()

// 自增 ID 计数器
let nextCompareId = 1
let nextPropertyCheckId = 1

/**
 * 存储对比结果
 * @returns 存储 ID，用于后续读取
 */
export function storeCompareResult(data: CompareResultData): string {
  const id = `compare_${nextCompareId++}`
  compareResultStore.set(id, data)
  return id
}

/**
 * 读取对比结果
 * @param id 存储 ID
 * @returns 对比结果数据，如果不存在则返回 null
 */
export function getCompareResult(id: string): CompareResultData | null {
  return compareResultStore.get(id) || null
}

/**
 * 删除对比结果
 * @param id 存储 ID
 */
export function deleteCompareResult(id: string): void {
  compareResultStore.delete(id)
}

/**
 * 存储属性检查结果
 * @returns 存储 ID，用于后续读取
 */
export function storePropertyCheckResult(data: PropertyCheckResultData): string {
  const id = `property_${nextPropertyCheckId++}`
  propertyCheckResultStore.set(id, data)
  return id
}

/**
 * 读取属性检查结果
 * @param id 存储 ID
 * @returns 属性检查结果数据，如果不存在则返回 null
 */
export function getPropertyCheckResult(id: string): PropertyCheckResultData | null {
  return propertyCheckResultStore.get(id) || null
}

/**
 * 删除属性检查结果
 * @param id 存储 ID
 */
export function deletePropertyCheckResult(id: string): void {
  propertyCheckResultStore.delete(id)
}

/**
 * 清理所有存储的对比结果
 */
export function clearAllResults(): void {
  compareResultStore.clear()
  propertyCheckResultStore.clear()
}

/**
 * 获取存储的结果数量
 */
export function getStoreSize(): number {
  return compareResultStore.size + propertyCheckResultStore.size
}
