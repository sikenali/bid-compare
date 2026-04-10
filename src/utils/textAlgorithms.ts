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

// 一次性预处理文本
export function preprocessText(
  text: string,
  settings: ComparisonSettings
): string {
  let processed = text
  if (settings.ignoreCase) processed = processed.toLowerCase()
  if (settings.ignorePunctuation) processed = processed.replace(/[\p{P}\p{S}]/gu, '')
  if (settings.ignoreWhitespace) processed = processed.replace(/\s+/g, ' ').trim()
  return processed
}

// LCS 滚动数组实现——空间 O(min(m,n))
export function findSimilarSegmentsLCS(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 15
): SimilarSegment[] {
  const preprocessed1 = preprocessText(text1, settings)
  const preprocessed2 = preprocessText(text2, settings)
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

        const originalMatch1 = text1.substring(i, i + k)
        const originalMatch2 = text2.substring(j, j + k)

        const leftStart = Math.max(0, i - contextLength)
        const leftEnd = Math.min(text1.length, i + k + contextLength)
        const rightStart = Math.max(0, j - contextLength)
        const rightEnd = Math.min(text2.length, j + k + contextLength)

        const escapeHtml = (str: string) => {
          const div = document.createElement('div')
          div.textContent = str
          return div.innerHTML
        }

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
          id: segments.length + 1,
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

  return segments
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function calculateTextSimilarity(
  text1: string,
  text2: string,
  settings: ComparisonSettings
): number {
  if (!text1 || !text2) return 0
  const p1 = preprocessText(text1, settings)
  const p2 = preprocessText(text2, settings)
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
