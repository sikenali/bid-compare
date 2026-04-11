export interface SimilarSegment {
  id: number
  similarity: string
  similarityValue: number
  leftContent: string
  rightContent: string
  leftPage: string
  rightPage: string
  level: 'high' | 'medium' | 'low'
  // 新增：原始位置索引
  leftStartIndex?: number
  leftEndIndex?: number
  rightStartIndex?: number
  rightEndIndex?: number
}

// 页码映射表
export interface PageMap {
  ranges: Array<{ start: number; end: number; page: number }>
  totalPages: number
}

export interface ComparisonSettings {
  minDuplicateWords: number
  textSimilarityThreshold: number
  ignoreCase: boolean
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
}

// 估算页码（基于字符位置）
// 这是一个后备方案，当无法获取真实页数时使用
const estimatePage = (charPosition: number, totalPages: number = 1): string => {
  // 假设平均每页约 1000 字符
  const CHARS_PER_PAGE = 1000
  const estimatedPage = Math.floor(charPosition / CHARS_PER_PAGE) + 1
  
  // 如果总页数已知，限制不超过总页数
  // 如果总页数为 1（未知），则直接显示估算页码
  if (totalPages > 1) {
    return `第${Math.min(estimatedPage, totalPages)}页/共${totalPages}页`
  } else {
    return `约第${estimatedPage}页`
  }
}

// HTML 转义工具函数（纯字符串实现，避免 DOM 创建开销）
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 基于索引生成高亮 HTML
 * @param fullText 完整原文
 * @param matchStart 匹配内容起始索引
 * @param matchEnd 匹配内容结束索引
 * @param contextLength 上下文长度（匹配内容前后各显示多少字符），默认 5
 */
export function buildHighlightedHtml(
  fullText: string,
  matchStart: number,
  matchEnd: number,
  contextLength: number = 10
): string {
  const contextStart = Math.max(0, matchStart - contextLength)
  const contextEnd = Math.min(fullText.length, matchEnd + contextLength)

  const before = escapeHtml(fullText.substring(contextStart, matchStart))
  const match = escapeHtml(fullText.substring(matchStart, matchEnd))
  const after = escapeHtml(fullText.substring(matchEnd, contextEnd))

  const prefix = contextStart > 0 ? '…' : ''
  const suffix = contextEnd < fullText.length ? '…' : ''

  return `${prefix}${before}<span class="highlighted-text">${match}</span>${after}${suffix}`
}

/**
 * 通过字符索引查找对应页码（二分查找）
 */
export function findPageByIndex(pageMap: PageMap, charIndex: number): number {
  let left = 0
  let right = pageMap.ranges.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const range = pageMap.ranges[mid]

    if (charIndex >= range.start && charIndex < range.end) {
      return range.page
    } else if (charIndex < range.start) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  return pageMap.ranges[pageMap.ranges.length - 1]?.page || 1
}

/**
 * 格式化页码显示
 */
export function formatPageRange(
  pageMap: PageMap,
  startIndex: number,
  endIndex: number
): string {
  const startPage = findPageByIndex(pageMap, startIndex)
  const endPage = findPageByIndex(pageMap, endIndex)

  if (startPage === endPage) {
    return `第${startPage}页/共${pageMap.totalPages}页`
  } else {
    return `第${startPage}-${endPage}页/共${pageMap.totalPages}页`
  }
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

// 基于最长公共子串的相似片段查找（暴力 LCS 算法）
// 适用于小文件（< 5000 字符），结果最准确
export function findSimilarSegments(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 50,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const preprocessed1 = preprocessText(text1, settings)
  const preprocessed2 = preprocessText(text2, settings)
  const m = preprocessed1.processed.length
  const n = preprocessed2.processed.length
  const minMatchLength = settings.minDuplicateWords

  const matchedPositions = new Set<string>()
  const segments: SimilarSegment[] = []
  let segmentId = 0

  // 暴力双层循环 - O(m*n) 时间复杂度
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const key = `${i},${j}`
      if (matchedPositions.has(key)) continue

      let k = 0
      while (i + k < m && j + k < n && preprocessed1.processed[i + k] === preprocessed2.processed[j + k]) {
        k++
      }

      if (k >= minMatchLength) {
        // 标记已匹配位置
        for (let l = 0; l < k; l++) {
          matchedPositions.add(`${i + l},${j + l}`)
        }

        // 通过索引映射获取原文本位置
        const origStart1 = preprocessed1.indexMap[i]
        const origEnd1 = preprocessed1.indexMap[i + k - 1] + 1
        const origStart2 = preprocessed2.indexMap[j]
        const origEnd2 = preprocessed2.indexMap[j + k - 1] + 1

        segments.push({
          id: ++segmentId,
          similarity: '100%',
          similarityValue: 100,
          leftContent: buildHighlightedHtml(text1, origStart1, origEnd1, contextLength),
          rightContent: buildHighlightedHtml(text2, origStart2, origEnd2, contextLength),
          leftPage: pageMap1 ? formatPageRange(pageMap1, origStart1, origEnd1) : '第1页',
          rightPage: pageMap2 ? formatPageRange(pageMap2, origStart2, origEnd2) : '第1页',
          level: 'high',
          leftStartIndex: origStart1,
          leftEndIndex: origEnd1,
          rightStartIndex: origStart2,
          rightEndIndex: origEnd2
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
  contextLength: number = 50,
  onProgress?: (progress: number) => void,
  pageMap1?: PageMap,
  pageMap2?: PageMap
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
      hash2 = ((hash2 - preprocessed1.charCodeAt(i - 1) * high2) * HASH2_BASE + preprocessed1.charCodeAt(i + windowSize - 1)) % HASH2_MOD
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

          segments.push({
            id: ++segmentId,
            similarity: '100%',
            similarityValue: 100,
            leftContent: buildHighlightedHtml(text1, i, i + matchLen, contextLength),
            rightContent: buildHighlightedHtml(text2, j, j + matchLen, contextLength),
            leftPage: pageMap1 ? formatPageRange(pageMap1, i, i + matchLen) : '第1页',
            rightPage: pageMap2 ? formatPageRange(pageMap2, j, j + matchLen) : '第1页',
            level: 'high',
            leftStartIndex: i,
            leftEndIndex: i + matchLen,
            rightStartIndex: j,
            rightEndIndex: j + matchLen
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

export type ComparisonStrategy = 'lcs' | 'rabin-karp' | 'minhash'

// 选择对比策略
export function selectStrategy(textLength: number): ComparisonStrategy {
  // 小文件（< 3K 字符）：使用暴力 LCS，结果最准确
  // 中文件（3K-100K）：使用 Rabin-Karp 滚动哈希，性能 O(m+n)
  // 大文件（> 100K）：使用 MinHash + LSH，避免内存溢出
  if (textLength < 3_000) return 'lcs'
  if (textLength < 100_000) return 'rabin-karp'
  return 'minhash'
}

// ========== MinHash + LSH 算法 ==========

/**
 * 将文本转换为 k-shingle 集合
 */
export function generateShingles(text: string, k: number = 5): Set<string> {
  const shingles = new Set<string>()
  const processed = text.toLowerCase().replace(/\s+/g, ' ').trim()

  for (let i = 0; i <= processed.length - k; i++) {
    shingles.add(processed.substring(i, i + k))
  }

  return shingles
}

function generateHashSeeds(numHashes: number): number[] {
  const seeds: number[] = []
  for (let i = 0; i < numHashes; i++) {
    seeds.push(1000000007 + i * 1000003)
  }
  return seeds
}

function hashWithSeed(shingle: string, seed: number): number {
  let hash = seed
  for (let i = 0; i < shingle.length; i++) {
    hash = ((hash << 5) - hash + shingle.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * 计算 MinHash 签名
 */
export function computeMinHashSignature(
  text: string,
  numHashes: number = 128
): number[] {
  const shingles = Array.from(generateShingles(text))
  const seeds = generateHashSeeds(numHashes)
  const signature = new Array(numHashes).fill(Infinity)

  for (const shingle of shingles) {
    for (let i = 0; i < numHashes; i++) {
      const hash = hashWithSeed(shingle, seeds[i])
      signature[i] = Math.min(signature[i], hash)
    }
  }

  return signature
}

interface LSHPair {
  chunkIndex1: number
  chunkIndex2: number
  estimatedSimilarity: number
}

function estimateJaccardSimilarity(sig1: number[], sig2: number[]): number {
  let matchCount = 0
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) {
      matchCount++
    }
  }
  return matchCount / sig1.length
}

/**
 * LSH 查找候选对
 */
export function findLSHCandidates(
  signatures1: number[][],
  signatures2: number[][],
  numBuckets: number = 20
): LSHPair[] {
  const candidates = new Map<string, LSHPair>()
  const rowsPerBand = Math.floor(signatures1[0].length / numBuckets)

  for (let band = 0; band < numBuckets; band++) {
    const startRow = band * rowsPerBand
    const endRow = startRow + rowsPerBand

    const buckets1 = new Map<string, number[]>()
    for (let i = 0; i < signatures1.length; i++) {
      const bandSignature = signatures1[i].slice(startRow, endRow).join(',')
      if (!buckets1.has(bandSignature)) {
        buckets1.set(bandSignature, [])
      }
      buckets1.get(bandSignature)!.push(i)
    }

    const buckets2 = new Map<string, number[]>()
    for (let j = 0; j < signatures2.length; j++) {
      const bandSignature = signatures2[j].slice(startRow, endRow).join(',')
      if (!buckets2.has(bandSignature)) {
        buckets2.set(bandSignature, [])
      }
      buckets2.get(bandSignature)!.push(j)

      if (buckets1.has(bandSignature)) {
        for (const i of buckets1.get(bandSignature)!) {
          const key = `${i},${j}`
          if (!candidates.has(key)) {
            const similarity = estimateJaccardSimilarity(
              signatures1[i],
              signatures2[j]
            )
            candidates.set(key, {
              chunkIndex1: i,
              chunkIndex2: j,
              estimatedSimilarity: similarity
            })
          }
        }
      }
    }
  }

  return Array.from(candidates.values())
    .filter(c => c.estimatedSimilarity > 0.7)
    .sort((a, b) => b.estimatedSimilarity - a.estimatedSimilarity)
}

function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }
  return chunks
}

/**
 * MinHash + LSH 相似片段查找
 */
export function findSimilarSegmentsMinHash(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const segments: SimilarSegment[] = []
  const chunkSize = 1000
  let segmentIdCounter = 0

  const chunks1 = chunkText(text1, chunkSize)
  const chunks2 = chunkText(text2, chunkSize)

  if (onProgress) onProgress(0.1)

  const signatures1 = chunks1.map(c => computeMinHashSignature(c, 128))
  const signatures2 = chunks2.map(c => computeMinHashSignature(c, 128))

  if (onProgress) onProgress(0.3)

  const candidates = findLSHCandidates(signatures1, signatures2, 20)

  if (onProgress) onProgress(0.5)

  const totalCandidates = candidates.length
  let processed = 0

  for (const candidate of candidates) {
    const chunk1 = chunks1[candidate.chunkIndex1]
    const chunk2 = chunks2[candidate.chunkIndex2]

    const blockSegments = findSimilarSegmentsRabinKarp(
      chunk1,
      chunk2,
      settings,
      50,
      undefined,
      pageMap1,
      pageMap2
    )

    const offset1 = candidate.chunkIndex1 * chunkSize
    const offset2 = candidate.chunkIndex2 * chunkSize

    for (const seg of blockSegments) {
      seg.id = ++segmentIdCounter
      if (seg.leftStartIndex !== undefined) seg.leftStartIndex += offset1
      if (seg.leftEndIndex !== undefined) seg.leftEndIndex += offset1
      if (seg.rightStartIndex !== undefined) seg.rightStartIndex += offset2
      if (seg.rightEndIndex !== undefined) seg.rightEndIndex += offset2
      segments.push(seg)
    }

    processed++
    if (onProgress && processed % 10 === 0) {
      const progress = 0.5 + (processed / Math.max(1, totalCandidates)) * 0.5
      onProgress(Math.min(1, progress))
    }
  }

  return mergeOverlappingSegments(segments)
}

// ========== 重叠片段合并 ==========

function areOverlapping(seg1: SimilarSegment, seg2: SimilarSegment): boolean {
  const s1Start = seg1.leftStartIndex ?? 0
  const s1End = seg1.leftEndIndex ?? 0
  const s2Start = seg2.leftStartIndex ?? 0
  const s2End = seg2.leftEndIndex ?? 0

  return s2Start < s1End && s2End > s1Start
}

function mergeTwoSegments(seg1: SimilarSegment, seg2: SimilarSegment): void {
  seg1.leftStartIndex = Math.min(seg1.leftStartIndex ?? 0, seg2.leftStartIndex ?? 0)
  seg1.leftEndIndex = Math.max(seg1.leftEndIndex ?? 0, seg2.leftEndIndex ?? 0)
  seg1.rightStartIndex = Math.min(seg1.rightStartIndex ?? 0, seg2.rightStartIndex ?? 0)
  seg1.rightEndIndex = Math.max(seg1.rightEndIndex ?? 0, seg2.rightEndIndex ?? 0)
  seg1.similarityValue = Math.max(seg1.similarityValue, seg2.similarityValue)
  seg1.similarity = `${seg1.similarityValue}%`
}

/**
 * 合并重叠片段
 */
export function mergeOverlappingSegments(
  segments: SimilarSegment[]
): SimilarSegment[] {
  if (segments.length === 0) return []

  segments.sort((a, b) => (a.leftStartIndex ?? 0) - (b.leftStartIndex ?? 0))

  const merged: SimilarSegment[] = [{ ...segments[0] }]

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i]
    const last = merged[merged.length - 1]

    if (areOverlapping(last, current)) {
      mergeTwoSegments(last, current)
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

