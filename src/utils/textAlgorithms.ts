export interface SimilarSegment {
  id: number
  similarity: string
  similarityValue: number
  leftContent: string
  rightContent: string
  leftPage: string
  rightPage: string
  level: 'high' | 'medium' | 'low'
}

export interface ComparisonSettings {
  minDuplicateWords: number
  textSimilarityThreshold: number
  ignoreCase: boolean
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
}

// HTML 转义工具函数（提取到循环外，避免重复创建）
const escapeHtml = (str: string): string => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// 预处理文本，同时返回预处理后的文本和索引映射表
// indexMap[preprocessedIndex] = originalIndex，用于在截取时定位到原文本位置
export function preprocessText(
  text: string,
  settings: ComparisonSettings
): { processed: string; indexMap: number[] } {
  const indexMap: number[] = []
  let processed = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    let skip = false

    if (settings.ignoreCase) {
      // 小写转换不影响索引映射
    }
    if (settings.ignorePunctuation && /[\p{P}\p{S}]/u.test(char)) {
      skip = true
    }
    if (settings.ignoreWhitespace && /\s/.test(char)) {
      skip = true
    }

    if (!skip) {
      indexMap.push(i)
      processed += settings.ignoreCase ? char.toLowerCase() : char
    }
  }

  if (settings.ignoreWhitespace) {
    processed = processed.trim()
    // trim 后索引映射需要同步调整（这里简化处理：trim 只影响首尾空白，
    // 由于空白已被跳过，indexMap 已不包含空白字符的索引，无需额外调整）
  }

  return { processed, indexMap }
}

// 基于最长公共子串的相似片段查找
// 注：matchedPositions 使用 Set 存储，空间复杂度 O(m*n)，适用于小文件（<2万字）场景
export function findSimilarSegments(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 15
): SimilarSegment[] {
  const { processed: preprocessed1, indexMap: indexMap1 } = preprocessText(text1, settings)
  const { processed: preprocessed2, indexMap: indexMap2 } = preprocessText(text2, settings)
  const m = preprocessed1.length
  const n = preprocessed2.length
  const minMatchLength = settings.minDuplicateWords

  const matchedPositions = new Set<string>()
  const segments: SimilarSegment[] = []

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const key = `${i},${j}`
      if (matchedPositions.has(key)) continue

      let k = 0
      while (i + k < m && j + k < n && preprocessed1[i + k] === preprocessed2[j + k]) {
        k++
      }

      if (k >= minMatchLength) {
        for (let l = 0; l < k; l++) {
          matchedPositions.add(`${i + l},${j + l}`)
        }

        // 使用索引映射表获取原文本中的正确位置
        const origStart1 = indexMap1[i]
        const origEnd1 = indexMap1[i + k - 1] + 1
        const origStart2 = indexMap2[j]
        const origEnd2 = indexMap2[j + k - 1] + 1

        const originalMatch1 = text1.substring(origStart1, origEnd1)
        const originalMatch2 = text2.substring(origStart2, origEnd2)

        const leftStart = Math.max(0, origStart1 - contextLength)
        const leftEnd = Math.min(text1.length, origEnd1 + contextLength)
        const rightStart = Math.max(0, origStart2 - contextLength)
        const rightEnd = Math.min(text2.length, origEnd2 + contextLength)

        const safeLeft = escapeHtml(text1.substring(leftStart, leftEnd))
        const safeRight = escapeHtml(text2.substring(rightStart, rightEnd))
        const safeMatch1 = escapeHtml(originalMatch1)
        const safeMatch2 = escapeHtml(originalMatch2)

        const highlightedLeft = safeLeft.replace(
          new RegExp(escapeRegExp(safeMatch1), 'g'),
          `<span class="highlighted-text" style="background-color: rgba(255,215,0,0.9);color:#8B0000;padding:3px 6px;border-radius:4px;font-weight:700;">${safeMatch1}</span>`
        )
        const highlightedRight = safeRight.replace(
          new RegExp(escapeRegExp(safeMatch2), 'g'),
          `<span class="highlighted-text" style="background-color: rgba(255,215,0,0.9);color:#8B0000;padding:3px 6px;border-radius:4px;font-weight:700;">${safeMatch2}</span>`
        )

        segments.push({
          id: ++segmentId,
          similarity: '100%',
          similarityValue: 100,
          leftContent: highlightedLeft,
          rightContent: highlightedRight,
          leftPage: `第${Math.floor(origStart1 / 1000) + 1}页`,
          rightPage: `第${Math.floor(origStart2 / 1000) + 1}页`,
          level: 'high'
        })
      }
    }
  }

  return segments
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 全局 segmentId 计数器
let segmentId = 0

// 滚动数组实现——空间 O(min(m,n))
export function calculateTextSimilarity(
  text1: string,
  text2: string,
  settings: ComparisonSettings
): number {
  if (!text1 || !text2) return 0
  const { processed: p1 } = preprocessText(text1, settings)
  const { processed: p2 } = preprocessText(text2, settings)
  const m = p1.length
  const n = p2.length

  // 滚动数组 LCS
  let prevRow = new Array(n + 1).fill(0)
  let currRow = new Array(n + 1).fill(0)
  let maxLength = 0

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p1[i - 1] === p2[j - 1]) {
        currRow[j] = prevRow[j - 1] + 1
        maxLength = Math.max(maxLength, currRow[j])
      } else {
        currRow[j] = 0
      }
    }
    ;[prevRow, currRow] = [currRow, new Array(n + 1).fill(0)]
  }

  const minLength = Math.min(m, n)
  if (minLength === 0) return 0
  return Math.round((maxLength / minLength) * 100)
}

// Rabin-Karp 双哈希——用于减少哈希冲突
const HASH1_BASE = 31
const HASH1_MOD = 1_000_000_007
const HASH2_BASE = 37
const HASH2_MOD = 1_000_000_009

function computeDoubleHash(str: string): [number, number] {
  let h1 = 0, h2 = 0
  for (let i = 0; i < str.length; i++) {
    h1 = (h1 * HASH1_BASE + str.charCodeAt(i)) % HASH1_MOD
    h2 = (h2 * HASH2_BASE + str.charCodeAt(i)) % HASH2_MOD
  }
  return [h1, h2]
}

// Rabin-Karp 滚动哈希匹配
export function findSimilarSegmentsRabinKarp(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 8,
  onProgress?: (progress: number) => void
): SimilarSegment[] {
  const { processed: preprocessed1 } = preprocessText(text1, settings)
  const { processed: preprocessed2 } = preprocessText(text2, settings)
  const m = preprocessed1.length
  const n = preprocessed2.length
  const windowSize = settings.minDuplicateWords

  if (windowSize > m || windowSize > n) return []

  // 构建 text1 的所有窗口哈希 → 位置映射
  const hashToPositions = new Map<string, number[]>()
  let hash1 = 0, hash2 = 0

  // 计算第一个窗口
  for (let i = 0; i < windowSize; i++) {
    hash1 = (hash1 * HASH1_BASE + preprocessed1.charCodeAt(i)) % HASH1_MOD
    hash2 = (hash2 * HASH2_BASE + preprocessed1.charCodeAt(i)) % HASH2_MOD
  }

  // 计算最高位乘数
  let high1 = 1, high2 = 1
  for (let i = 0; i < windowSize - 1; i++) {
    high1 = (high1 * HASH1_BASE) % HASH1_MOD
    high2 = (high2 * HASH2_BASE) % HASH2_MOD
  }

  // 滑动窗口记录哈希
  for (let i = 0; i <= m - windowSize; i++) {
    if (i > 0) {
      hash1 = ((hash1 - preprocessed1.charCodeAt(i - 1) * high1) * HASH1_BASE + preprocessed1.charCodeAt(i + windowSize - 1)) % HASH1_MOD
      hash2 = ((hash2 - preprocessed2.charCodeAt(i - 1) * high2) * HASH2_BASE + preprocessed2.charCodeAt(i + windowSize - 1)) % HASH2_MOD
      if (hash1 < 0) hash1 += HASH1_MOD
      if (hash2 < 0) hash2 += HASH2_MOD
    }

    const key = `${hash1},${hash2}`
    if (!hashToPositions.has(key)) hashToPositions.set(key, [])
    hashToPositions.get(key)!.push(i)
  }

  // 在 text2 中滚动查找
  hash1 = 0; hash2 = 0
  for (let i = 0; i < windowSize; i++) {
    hash1 = (hash1 * HASH1_BASE + preprocessed2.charCodeAt(i)) % HASH1_MOD
    hash2 = (hash2 * HASH2_BASE + preprocessed2.charCodeAt(i)) % HASH2_MOD
  }

  const matchedPairs = new Set<string>()
  const segments: SimilarSegment[] = []
  let processed = 0

  for (let j = 0; j <= n - windowSize; j++) {
    if (j > 0) {
      hash1 = ((hash1 - preprocessed2.charCodeAt(j - 1) * high1) * HASH1_BASE + preprocessed2.charCodeAt(j + windowSize - 1)) % HASH1_MOD
      hash2 = ((hash2 - preprocessed2.charCodeAt(j - 1) * high2) * HASH2_BASE + preprocessed2.charCodeAt(j + windowSize - 1)) % HASH2_MOD
      if (hash1 < 0) hash1 += HASH1_MOD
      if (hash2 < 0) hash2 += HASH2_MOD
    }

    const key = `${hash1},${hash2}`
    const positions = hashToPositions.get(key)
    if (positions) {
      for (const i of positions) {
        const pairKey = `${i},${j}`
        if (matchedPairs.has(pairKey)) continue

        // 验证实际内容
        let matchLen = windowSize
        while (i + matchLen < m && j + matchLen < n && preprocessed1[i + matchLen] === preprocessed2[j + matchLen]) {
          matchLen++
        }

        if (matchLen >= settings.minDuplicateWords) {
          matchedPairs.add(pairKey)

          const leftStart = Math.max(0, i - contextLength)
          const leftEnd = Math.min(text1.length, i + matchLen + contextLength)
          const rightStart = Math.max(0, j - contextLength)
          const rightEnd = Math.min(text2.length, j + matchLen + contextLength)

          const safeLeft = escapeHtml(text1.substring(leftStart, leftEnd))
          const safeRight = escapeHtml(text2.substring(rightStart, rightEnd))
          const safeMatch1 = escapeHtml(text1.substring(i, i + matchLen))
          const safeMatch2 = escapeHtml(text2.substring(j, j + matchLen))

          const highlightedLeft = safeLeft.replace(
            new RegExp(escapeRegExp(safeMatch1), 'g'),
            `<span class="highlighted-text" style="background-color: rgba(255,215,0,0.9);color:#8B0000;padding:3px 6px;border-radius:4px;font-weight:700;">${safeMatch1}</span>`
          )
          const highlightedRight = safeRight.replace(
            new RegExp(escapeRegExp(safeMatch2), 'g'),
            `<span class="highlighted-text" style="background-color: rgba(255,215,0,0.9);color:#8B0000;padding:3px 6px;border-radius:4px;font-weight:700;">${safeMatch2}</span>`
          )

          segments.push({
            id: ++segmentId,
            similarity: '100%',
            similarityValue: 100,
            leftContent: highlightedLeft,
            rightContent: highlightedRight,
            leftPage: `第${Math.floor(i / 1000) + 1}页`,
            rightPage: `第${Math.floor(j / 1000) + 1}页`,
            level: 'high'
          })
        }
      }
    }

    processed++
    if (onProgress && processed % 5000 === 0) {
      onProgress(processed / (n - windowSize + 1))
    }
  }

  return segments
}

// 分块匹配——按段落切分后匹配
export function findSimilarSegmentsBlockMatch(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void
): SimilarSegment[] {
  // 按段落/空行切分
  const blocks1 = text1.split(/\n\s*\n|\r\n\s*\r\n/).filter(b => b.trim().length > 10)
  const blocks2 = text2.split(/\n\s*\n|\r\n\s*\r\n/).filter(b => b.trim().length > 10)

  if (blocks1.length === 0 || blocks2.length === 0) {
    // 如果无法分块，降级为 Rabin-Karp
    return findSimilarSegmentsRabinKarp(text1, text2, settings, 8, onProgress)
  }

  const segments: SimilarSegment[] = []
  const matchedBlocks = new Set<string>()
  let completedBlocks = 0
  const totalBlocks = blocks1.length

  for (let i = 0; i < blocks1.length; i++) {
    const block1 = blocks1[i].trim()
    const hash1 = computeDoubleHash(preprocessText(block1, settings).processed)

    for (let j = 0; j < blocks2.length; j++) {
      const block2 = blocks2[j].trim()
      const hash2 = computeDoubleHash(preprocessText(block2, settings).processed)

      const pairKey = `${i},${j}`
      if (matchedBlocks.has(pairKey)) continue

      // 如果块哈希匹配
      if (hash1[0] === hash2[0] && hash1[1] === hash2[1]) {
        matchedBlocks.add(pairKey)

        // 在块内做精细对比
        const blockSegments = findSimilarSegmentsRabinKarp(
          block1, block2, settings, 8
        )

        // 调整片段 ID
        for (const seg of blockSegments) {
          seg.id = ++segmentId
          segments.push(seg)
        }
      }
    }

    completedBlocks++
    if (onProgress && completedBlocks % 10 === 0) {
      onProgress(completedBlocks / totalBlocks)
    }
  }

  return segments
}

export type ComparisonStrategy = 'lcs' | 'rabin-karp' | 'block-match'

export function selectStrategy(textLength: number): ComparisonStrategy {
  if (textLength < 20_000) return 'lcs'
  if (textLength < 100_000) return 'rabin-karp'
  return 'block-match'
}

