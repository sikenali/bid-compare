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

// ========== SimHash 算法实现 ==========
// 用于快速粗筛，百万字秒级过滤

// SimHash 配置
const SIMHASH_BITS = 64
const SIMHASH_WINDOW = 5

/**
 * 计算字符串的哈希值（使用 FNV-1a 算法）
 */
function fnv1aHash(str: string): number {
  let hash = 0xcbf29ce484222325n // FNV offset basis
  const prime = 0x100000001b3n // FNV prime

  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i))
    hash = (hash * prime) & 0xffffffffffffffffn // 保持 64 位
  }

  return Number(hash)
}

/**
 * 计算 SimHash 指纹
 * @param text 输入文本
 * @param window 滑动窗口大小，默认 5
 * @returns 64 位 SimHash 指纹
 */
export function computeSimHash(text: string, window: number = SIMHASH_WINDOW): number {
  if (!text || text.length === 0) return 0

  // 初始化 64 位向量
  const v = new Array(SIMHASH_BITS).fill(0)

  // 按窗口切分文本
  for (let i = 0; i <= text.length - window; i++) {
    const word = text.substring(i, i + window)
    const hash = fnv1aHash(word)

    // 对每一位进行加权
    for (let j = 0; j < SIMHASH_BITS; j++) {
      if (hash & (1n << BigInt(j))) {
        v[j]++
      } else {
        v[j]--
      }
    }
  }

  // 生成最终的 64 位指纹
  let fingerprint = 0n
  for (let j = 0; j < SIMHASH_BITS; j++) {
    if (v[j] > 0) {
      fingerprint |= 1n << BigInt(j)
    }
  }

  return Number(fingerprint)
}

/**
 * 计算两个 SimHash 指纹的汉明距离
 */
export function hammingDistance(hash1: number, hash2: number): number {
  let xor = BigInt(hash1) ^ BigInt(hash2)
  let distance = 0

  while (xor > 0n) {
    distance++
    xor &= xor - 1n // Brian Kernighan's algorithm
  }

  return distance
}

/**
 * SimHash 粗筛结果
 */
export interface SimHashCandidate {
  leftIndex: number
  rightIndex: number
  distance: number
  estimatedSimilarity: number
}

/**
 * 使用 SimHash 进行快速粗筛
 * @param text1 文档1
 * @param text2 文档2
 * @param windowSize 窗口大小
 * @param threshold 汉明距离阈值（默认 3，距离≤3 视为高度相似）
 * @returns 候选匹配对
 */
export function simHashFilter(
  text1: string,
  text2: string,
  windowSize: number = 1000,
  overlap: number = 200,
  threshold: number = 3,
  maxChunks: number = 500
): SimHashCandidate[] {
  // 将文档切分为块
  const chunks1 = chunkTextForSimHash(text1, windowSize, overlap)
  const chunks2 = chunkTextForSimHash(text2, windowSize, overlap)

  // 限制最大块数，避免性能问题
  const limitedChunks1 = chunks1.slice(0, maxChunks)
  const limitedChunks2 = chunks2.slice(0, maxChunks)

  // 计算每个块的 SimHash
  const hashes1 = limitedChunks1.map(chunk => computeSimHash(chunk))
  const hashes2 = limitedChunks2.map(chunk => computeSimHash(chunk))

  // 使用分桶（LSH）优化比对，避免O(n*m)双重循环
  const BAND_SIZE = 8  // 每8位作为一个桶键
  const candidates: SimHashCandidate[] = []
  const usedPairs = new Set<string>()

  // 构建文档2的桶索引
  const bucketIndex = new Map<string, number[]>()
  for (let j = 0; j < hashes2.length; j++) {
    const hash = hashes2[j]
    // 将64位哈希分成8个8位的桶
    for (let band = 0; band < 8; band++) {
      const shift = band * BAND_SIZE
      const bucketKey = (hash >> shift) & 0xFF
      const key = `${band}_${bucketKey}`
      if (!bucketIndex.has(key)) {
        bucketIndex.set(key, [])
      }
      bucketIndex.get(key)!.push(j)
    }
  }

  // 对文档1的每个块，在桶中查找候选
  for (let i = 0; i < hashes1.length; i++) {
    const hash = hashes1[i]
    const potentialMatches = new Set<number>()

    // 从8个桶中收集候选
    for (let band = 0; band < 8; band++) {
      const shift = band * BAND_SIZE
      const bucketKey = (hash >> shift) & 0xFF
      const key = `${band}_${bucketKey}`
      const matches = bucketIndex.get(key)
      if (matches) {
        for (const j of matches) {
          potentialMatches.add(j)
        }
      }
    }

    // 验证候选对
    for (const j of potentialMatches) {
      const pairKey = `${i}_${j}`
      if (usedPairs.has(pairKey)) continue
      usedPairs.add(pairKey)

      const distance = hammingDistance(hashes1[i], hashes2[j])
      if (distance <= threshold) {
        candidates.push({
          leftIndex: i,
          rightIndex: j,
          distance,
          estimatedSimilarity: 1 - distance / SIMHASH_BITS
        })
      }
    }
  }

  // 按相似度排序，只返回前100个最佳候选
  candidates.sort((a, b) => b.estimatedSimilarity - a.estimatedSimilarity)
  return candidates.slice(0, 100)
}

/**
 * 为 SimHash 切分文本块
 */
function chunkTextForSimHash(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.substring(start, end))
    if (end >= text.length) break
    start += chunkSize - overlap
  }

  return chunks
}

/**
 * 基于 SimHash 的快速粗筛比对
 * 用于大文件（>50K字符）的快速过滤
 */
export function findSimilarSegmentsSimHash(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const segments: SimilarSegment[] = []
  let segmentId = 0

  // 第一步：SimHash 粗筛
  if (onProgress) onProgress(0.1)
  const candidates = simHashFilter(text1, text2)
  if (onProgress) onProgress(0.3)

  if (onCancel?.()) return []

  // 第二步：对候选对进行精比
  const chunkSize = 1000
  const overlap = 200

  for (let ci = 0; ci < candidates.length; ci++) {
    if (onCancel?.()) return segments

    const candidate = candidates[ci]
    const start1 = candidate.leftIndex * (chunkSize - overlap)
    const end1 = Math.min(start1 + chunkSize, text1.length)
    const start2 = candidate.rightIndex * (chunkSize - overlap)
    const end2 = Math.min(start2 + chunkSize, text2.length)

    const chunk1 = text1.substring(start1, end1)
    const chunk2 = text2.substring(start2, end2)

    // 使用 Rabin-Karp 进行精比
    const chunkSegments = findSimilarSegmentsRabinKarp(
      chunk1,
      chunk2,
      settings,
      50,
      undefined,
      onCancel
    )

    // 调整位置索引
    for (const seg of chunkSegments) {
      seg.id = ++segmentId
      if (seg.leftStartIndex !== undefined) seg.leftStartIndex += start1
      if (seg.leftEndIndex !== undefined) seg.leftEndIndex += start1
      if (seg.rightStartIndex !== undefined) seg.rightStartIndex += start2
      if (seg.rightEndIndex !== undefined) seg.rightEndIndex += start2

      seg.leftContent = buildHighlightedHtml(text1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0, 10)
      seg.rightContent = buildHighlightedHtml(text2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0, 10)

      seg.leftPage = pageMap1 ? formatPageRange(pageMap1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0) : '第1/1页'
      seg.rightPage = pageMap2 ? formatPageRange(pageMap2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0) : '第1/1页'

      segments.push(seg)
    }

    if (onProgress) {
      onProgress(0.3 + 0.7 * ((ci + 1) / Math.max(1, candidates.length)))
    }
  }

  return mergeOverlappingSegments(segments)
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
/**
 * 移除两个文档中的相同条款（标准模板条款）
 * @param text1 文档1内容
 * @param text2 文档2内容
 * @param minChars 最小匹配字符数（低于此长度的不视为条款）
 * @returns [处理后的text1, 处理后的text2]
 */
export function removeCommonClauses(
  text1: string,
  text2: string,
  minChars: number = 10
): [string, string] {
  // 按句号、分号、换行切分为子句
  const splitClauses = (text: string): string[] => {
    const raw = text.split(/(?<=[。；;．])\s*/)
    return raw.map(s => s.trim()).filter(s => s.length >= minChars)
  }

  const clauses1 = splitClauses(text1)
  const clauses2 = splitClauses(text2)

  if (clauses1.length === 0 || clauses2.length === 0) {
    return [text1, text2]
  }

  const set2 = new Set(clauses2.map(c => c.replace(/\s+/g, '')))

  const filtered1 = clauses1.filter(c => !set2.has(c.replace(/\s+/g, '')))
  const filtered2 = clauses2.filter(c => {
    const normalized = c.replace(/\s+/g, '')
    return !new Set(filtered1.map(f => f.replace(/\s+/g, ''))).has(normalized)
  })

  // 重新过滤text2（基于text1过滤后保留的）
  const filtered1Set = new Set(filtered1.map(c => c.replace(/\s+/g, '')))
  const finalFiltered2 = clauses2.filter(c => !filtered1Set.has(c.replace(/\s+/g, '')))

  return [filtered1.join('\n'), finalFiltered2.join('\n')]
}

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
    return `第${startPage}/${pageMap.totalPages}页`
  } else {
    return `第${startPage}-${endPage}/${pageMap.totalPages}页`
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
          leftPage: pageMap1 ? formatPageRange(pageMap1, origStart1, origEnd1) : '第1/1页',
          rightPage: pageMap2 ? formatPageRange(pageMap2, origStart2, origEnd2) : '第1/1页',
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
  onCancel?: () => boolean,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const preprocessed1 = preprocessText(text1, settings)
  const preprocessed2 = preprocessText(text2, settings)
  const m = preprocessed1.processed.length
  const n = preprocessed2.processed.length
  const windowSize = settings.minDuplicateWords

  if (windowSize > m || windowSize > n) return []

  // 局部 segmentId 计数器
  let segmentId = 0

  // 构建 text1 的所有窗口哈希 → 位置映射
  const hashToPositions = new Map<string, number[]>()
  let hash1 = 0, hash2 = 0

  // 计算第一个窗口
  for (let i = 0; i < windowSize; i++) {
    hash1 = (hash1 * HASH1_BASE + preprocessed1.processed.charCodeAt(i)) % HASH1_MOD
    hash2 = (hash2 * HASH2_BASE + preprocessed1.processed.charCodeAt(i)) % HASH2_MOD
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
      hash1 = ((hash1 - preprocessed1.processed.charCodeAt(i - 1) * high1) * HASH1_BASE + preprocessed1.processed.charCodeAt(i + windowSize - 1)) % HASH1_MOD
      hash2 = ((hash2 - preprocessed1.processed.charCodeAt(i - 1) * high2) * HASH2_BASE + preprocessed1.processed.charCodeAt(i + windowSize - 1)) % HASH2_MOD
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
    hash1 = (hash1 * HASH1_BASE + preprocessed2.processed.charCodeAt(i)) % HASH1_MOD
    hash2 = (hash2 * HASH2_BASE + preprocessed2.processed.charCodeAt(i)) % HASH2_MOD
  }

  const matchedPairs = new Set<string>()
  const segments: SimilarSegment[] = []
  let processed = 0

  for (let j = 0; j <= n - windowSize; j++) {
    if (onCancel?.()) return segments
    if (j > 0) {
      hash1 = ((hash1 - preprocessed2.processed.charCodeAt(j - 1) * high1) * HASH1_BASE + preprocessed2.processed.charCodeAt(j + windowSize - 1)) % HASH1_MOD
      hash2 = ((hash2 - preprocessed2.processed.charCodeAt(j - 1) * high2) * HASH2_BASE + preprocessed2.processed.charCodeAt(j + windowSize - 1)) % HASH2_MOD
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
        while (i + matchLen < m && j + matchLen < n && preprocessed1.processed[i + matchLen] === preprocessed2.processed[j + matchLen]) {
          matchLen++
        }

        if (matchLen >= settings.minDuplicateWords) {
          matchedPairs.add(pairKey)

          // 关键修复：将预处理后的索引映射回原文本索引
          const origStart1 = preprocessed1.indexMap[i]
          const origEnd1 = preprocessed1.indexMap[i + matchLen - 1] + 1
          const origStart2 = preprocessed2.indexMap[j]
          const origEnd2 = preprocessed2.indexMap[j + matchLen - 1] + 1

          segments.push({
            id: ++segmentId,
            similarity: '100%',
            similarityValue: 100,
            leftContent: buildHighlightedHtml(text1, origStart1, origEnd1, contextLength),
            rightContent: buildHighlightedHtml(text2, origStart2, origEnd2, contextLength),
            leftPage: pageMap1 ? formatPageRange(pageMap1, origStart1, origEnd1) : '第1/1页',
            rightPage: pageMap2 ? formatPageRange(pageMap2, origStart2, origEnd2) : '第1/1页',
            level: 'high',
            leftStartIndex: origStart1,
            leftEndIndex: origEnd1,
            rightStartIndex: origStart2,
            rightEndIndex: origEnd2
          })
        }
      }
    }

    processed++
    if (onProgress && processed % 500 === 0) {
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
  // 局部 segmentId 计数器
  let segmentId = 0
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

export type ComparisonStrategy = 'lcs' | 'rabin-karp' | 'minhash' | 'simhash' | 'myers' | 'smart'

// 选择对比策略
export function selectStrategy(textLength: number): ComparisonStrategy {
  // 小文件（< 3K 字符）：使用暴力 LCS，结果最准确
  // 中小文件（3K-10K）：使用 Myers Diff，精确比对
  // 中文件（10K-50K）：使用 Rabin-Karp 滚动哈希，性能 O(m+n)
  // 大文件（50K-200K）：使用 MinHash + LSH，避免内存溢出
  // 超大文件（> 200K）：使用 SimHash 快速粗筛
  if (textLength < 3_000) return 'lcs'
  if (textLength < 10_000) return 'myers'
  if (textLength < 50_000) return 'rabin-karp'
  if (textLength < 200_000) return 'minhash'
  return 'simhash'
}

// 智能策略选择 - 根据文本特征自动选择
export function selectSmartStrategy(text1: string, text2: string): ComparisonStrategy {
  const totalLength = text1.length + text2.length
  
  // 如果总长度很小，直接使用 LCS
  if (totalLength < 6_000) return 'lcs'
  
  // 检查文本是否包含大量重复内容（如标准条款）
  const hasRepetitiveContent = checkRepetitiveContent(text1) || checkRepetitiveContent(text2)
  
  if (hasRepetitiveContent) {
    // 如果有大量重复内容，使用 SimHash 粗筛
    return 'simhash'
  }
  
  // 根据总长度选择
  return selectStrategy(totalLength)
}

/**
 * 检查文本是否包含大量重复内容
 */
function checkRepetitiveContent(text: string): boolean {
  if (text.length < 1000) return false
  
  // 按段落切分
  const paragraphs = text.split(/\n\s*\n/)
  if (paragraphs.length < 5) return false
  
  // 统计段落重复率
  const uniqueParagraphs = new Set(paragraphs.map(p => p.trim()))
  const repeatRate = 1 - uniqueParagraphs.size / paragraphs.length
  
  return repeatRate > 0.3 // 如果重复率超过 30%，认为有大量重复内容
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

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (chunkSize <= overlap) {
    throw new Error('chunkSize must be greater than overlap')
  }
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.substring(start, end))
    if (end >= text.length) break
    start += chunkSize - overlap
  }
  return chunks
}

function buildChunkOffsets(totalLength: number, chunkSize: number, overlap: number): number[] {
  if (totalLength <= chunkSize) return [0]
  const offsets: number[] = []
  let start = 0
  while (start < totalLength) {
    offsets.push(start)
    const end = Math.min(start + chunkSize, totalLength)
    if (end >= totalLength) break
    start += chunkSize - overlap
  }
  return offsets
}

/**
 * MinHash + LSH 相似片段查找
 */
export function findSimilarSegmentsMinHash(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const segments: SimilarSegment[] = []
  const chunkSize = 1000
  const overlap = 200
  let segmentIdCounter = 0

  const chunks1 = chunkText(text1, chunkSize, overlap)
  const chunks2 = chunkText(text2, chunkSize, overlap)
  const chunkOffsets1 = buildChunkOffsets(text1.length, chunkSize, overlap)
  const chunkOffsets2 = buildChunkOffsets(text2.length, chunkSize, overlap)

  if (onCancel?.()) return []

  const totalChunks = chunks1.length + chunks2.length
  let completedChunks = 0

  const signatures1: number[][] = []
  for (const c of chunks1) {
    if (onCancel?.()) return []
    signatures1.push(computeMinHashSignature(c, 128))
    completedChunks++
    if (onProgress) onProgress(0.4 * (completedChunks / totalChunks))
  }

  const signatures2: number[][] = []
  for (const c of chunks2) {
    if (onCancel?.()) return []
    signatures2.push(computeMinHashSignature(c, 128))
    completedChunks++
    if (onProgress) onProgress(0.4 * (completedChunks / totalChunks))
  }

  const candidates = findLSHCandidates(signatures1, signatures2, 20)

  if (onProgress) onProgress(0.5)
  if (onCancel?.()) return []

  const totalCandidates = candidates.length

  for (let ci = 0; ci < candidates.length; ci++) {
    if (onCancel?.()) return segments
    const candidate = candidates[ci]
    const chunk1 = chunks1[candidate.chunkIndex1]
    const chunk2 = chunks2[candidate.chunkIndex2]

    const blockSegments = findSimilarSegmentsRabinKarp(
      chunk1,
      chunk2,
      settings,
      50,
      undefined,
      onCancel
    )

    const offset1 = chunkOffsets1[candidate.chunkIndex1]
    const offset2 = chunkOffsets2[candidate.chunkIndex2]

    for (const seg of blockSegments) {
      seg.id = ++segmentIdCounter
      if (seg.leftStartIndex !== undefined) seg.leftStartIndex += offset1
      if (seg.leftEndIndex !== undefined) seg.leftEndIndex += offset1
      if (seg.rightStartIndex !== undefined) seg.rightStartIndex += offset2
      if (seg.rightEndIndex !== undefined) seg.rightEndIndex += offset2

      seg.leftContent = buildHighlightedHtml(text1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0, 10)
      seg.rightContent = buildHighlightedHtml(text2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0, 10)

      seg.leftPage = pageMap1 ? formatPageRange(pageMap1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0) : '第1/1页'
      seg.rightPage = pageMap2 ? formatPageRange(pageMap2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0) : '第1/1页'

      segments.push(seg)
    }

    if (onProgress) {
      onProgress(0.5 + 0.5 * ((ci + 1) / Math.max(1, totalCandidates)))
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

// ========== Myers Diff 算法实现 ==========
// 用于精确比对，定位到字符级

/**
 * Myers Diff 算法 - 计算两个序列的编辑距离
 * 适用于中等长度文本（<10K字符）
 */

interface DiffEdit {
  type: 'insert' | 'delete' | 'equal' | 'replace'
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
}

/**
 * Myers Diff 算法核心实现
 * 时间复杂度: O((n+m)d)，d=编辑距离
 */
export function myersDiff(
  oldSeq: string[],
  newSeq: string[],
  maxInputLength: number = 8000
): DiffEdit[] {
  const n = oldSeq.length
  const m = newSeq.length
  const max = n + m

  // 内存限制检查：trace数组大小为O(d²)，d为编辑距离
  // 对于长度为L的输入，最坏情况d=2L，内存消耗为O(L²)
  // 限制输入总长度不超过阈值，避免内存溢出
  if (n + m > maxInputLength) {
    throw new Error(`Myers Diff 输入过长（${n + m} 字符），建议使用其他算法`)
  }

  if (max === 0) return []

  // V 数组：存储每个 k 值对应的最远 x 坐标
  const v = new Array(2 * max + 1).fill(0)
  const trace: number[][] = []

  // D 从 0 到 max
  for (let d = 0; d <= max; d++) {
    trace.push([...v])

    for (let k = -d; k <= d; k += 2) {
      let x: number

      if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
        x = v[k + 1 + max] // 向下移动（插入）
      } else {
        x = v[k - 1 + max] + 1 // 向右移动（删除）
      }

      let y = x - k

      // 沿对角线移动（匹配）
      while (x < n && y < m && oldSeq[x] === newSeq[y]) {
        x++
        y++
      }

      v[k + max] = x

      if (x >= n && y >= m) {
        return backtrack(trace, n, m, max)
      }
    }
  }

  return backtrack(trace, n, m, max)
}

/**
 * 回溯构建编辑路径
 */
function backtrack(
  trace: number[][],
  n: number,
  m: number,
  max: number
): DiffEdit[] {
  const edits: DiffEdit[] = []
  let x = n
  let y = m

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d]
    const k = x - y
    let prevK: number

    if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }

    const prevX = v[prevK + max]
    const prevY = prevX - prevK

    // 对角线移动（匹配）
    while (x > prevX && y > prevY) {
      x--
      y--
      edits.push({
        type: 'equal',
        oldStart: x,
        oldEnd: x + 1,
        newStart: y,
        newEnd: y + 1
      })
    }

    if (d > 0) {
      if (x === prevX) {
        // 插入
        y--
        edits.push({
          type: 'insert',
          oldStart: x,
          oldEnd: x,
          newStart: y,
          newEnd: y + 1
        })
      } else {
        // 删除
        x--
        edits.push({
          type: 'delete',
          oldStart: x,
          oldEnd: x + 1,
          newStart: y,
          newEnd: y
        })
      }
    }
  }

  return edits.reverse()
}

/**
 * 使用 Myers Diff 查找相似片段
 * @param text1 文本1
 * @param text2 文本2
 * @param minMatch 最小匹配长度
 * @returns 相似片段数组
 */
export function findSimilarSegmentsMyers(
  text1: string,
  text2: string,
  minMatch: number = 2,
  contextLength: number = 10,
  pageMap1?: PageMap,
  pageMap2?: PageMap,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean
): SimilarSegment[] {
  const segments: SimilarSegment[] = []
  let segmentId = 0

  // 将文本转换为字符数组
  const oldSeq = Array.from(text1)
  const newSeq = Array.from(text2)

  // 计算编辑脚本，如果失败则降级到Rabin-Karp
  let edits: DiffEdit[]
  try {
    if (onProgress) onProgress(0.3)
    edits = myersDiff(oldSeq, newSeq)
  } catch (error) {
    // Myers Diff内存不足，降级到Rabin-Karp
    console.warn('Myers Diff 失败，降级到 Rabin-Karp:', error)
    const settings: ComparisonSettings = {
      minDuplicateWords: minMatch,
      textSimilarityThreshold: 75,
      ignoreCase: false,
      ignorePunctuation: false,
      ignoreWhitespace: false
    }
    return findSimilarSegmentsRabinKarp(text1, text2, settings, contextLength, onProgress, onCancel, pageMap1, pageMap2)
  }

  // 提取连续相等的片段
  let i = 0
  while (i < edits.length) {
    if (edits[i].type === 'equal') {
      const start = i
      while (i < edits.length && edits[i].type === 'equal') {
        i++
      }

      const matchLength = i - start
      if (matchLength >= minMatch) {
        const leftStart = edits[start].oldStart
        const leftEnd = edits[i - 1].oldEnd
        const rightStart = edits[start].newStart
        const rightEnd = edits[i - 1].newEnd

        segments.push({
          id: ++segmentId,
          similarity: '100%',
          similarityValue: 100,
          leftContent: buildHighlightedHtml(text1, leftStart, leftEnd, contextLength),
          rightContent: buildHighlightedHtml(text2, rightStart, rightEnd, contextLength),
          leftPage: pageMap1 ? formatPageRange(pageMap1, leftStart, leftEnd) : '第1/1页',
          rightPage: pageMap2 ? formatPageRange(pageMap2, rightStart, rightEnd) : '第1/1页',
          level: 'high',
          leftStartIndex: leftStart,
          leftEndIndex: leftEnd,
          rightStartIndex: rightStart,
          rightEndIndex: rightEnd
        })
      }
    } else {
      i++
    }
  }

  return segments
}

/**
 * 基于 Myers Diff 的智能比对
 * 自动选择最佳策略
 */
export function findSimilarSegmentsSmart(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  const textLength = text1.length + text2.length

  // 小文本：使用 Myers Diff
  if (textLength < 10_000) {
    if (onProgress) onProgress(0.5)
    const segments = findSimilarSegmentsMyers(
      text1,
      text2,
      settings.minDuplicateWords,
      10,
      pageMap1,
      pageMap2
    )
    if (onProgress) onProgress(1)
    return segments
  }

  // 中等文本：使用 Rabin-Karp
  if (textLength < 100_000) {
    return findSimilarSegmentsRabinKarp(
      text1,
      text2,
      settings,
      10,
      onProgress,
      onCancel,
      pageMap1,
      pageMap2
    )
  }

  // 大文本：使用 SimHash 粗筛
  return findSimilarSegmentsSimHash(
    text1,
    text2,
    settings,
    onProgress,
    onCancel,
    pageMap1,
    pageMap2
  )
}

