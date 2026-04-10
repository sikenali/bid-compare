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
  let segmentId = 0

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
