# 文件对比算法优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 优化文件对比算法，实现按文件大小分级策略（LCS/Rabin-Karp/MinHash）、精确页码定位和可靠的高亮显示

**架构：** 通过三级阈值（3K/100K）选择不同算法，为每个文件构建页码映射表实现精确页码查询，使用基于索引的高亮生成函数替代正则替换

**技术栈：** TypeScript、Web Worker、MinHash、LSH、Rabin-Karp

---

## 文件结构

```
src/
├── utils/
│   └── textAlgorithms.ts       # 修改：新增 MinHash/LSH、页码映射、高亮生成函数，修改接口和现有算法
├── workers/
│   └── comparison.worker.ts    # 修改：新增 minhash 策略处理，修复相似度估算
├── composables/
│   ├── useFileParser.ts        # 修改：新增页码映射构建函数
│   └── useComparison.ts        # 修改：接收和传递 pageMap 参数
└── components/
    └── FileCompare.vue         # 修改：传入 pageMap 参数到对比函数
docs/
└── superpowers/
    └── specs/
        └── 2026-04-11-comparison-algorithm-optimization.md  # 已存在
```

---

## 任务 1：扩展 SimilarSegment 接口和新增工具函数

**文件：**
- 修改：`src/utils/textAlgorithms.ts`

### 步骤 1：修改 SimilarSegment 接口

在 `SimilarSegment` 接口中添加 4 个新字段：

```typescript
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
  leftStartIndex: number
  leftEndIndex: number
  rightStartIndex: number
  rightEndIndex: number
}
```

### 步骤 2：新增 PageMap 接口和 FileParseResult 扩展

在文件顶部添加：

```typescript
// 页码映射表
export interface PageMap {
  ranges: Array<{ start: number; end: number; page: number }>
  totalPages: number
}

// 扩展 FileParseResult（在 useFileParser.ts 中也会定义，这里只用于算法类型）
// 注意：实际类型定义在 useFileParser.ts 中，这里只导出 PageMap 供其使用
```

### 步骤 3：新增高亮生成函数

在 `escapeHtml` 函数后添加：

```typescript
/**
 * 基于索引生成高亮 HTML
 */
export function buildHighlightedHtml(
  fullText: string,
  matchStart: number,
  matchEnd: number,
  contextLength: number = 50
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
```

### 步骤 4：新增页码查询函数

```typescript
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
```

### 步骤 5：运行构建验证

```bash
npm run build
```

预期：构建成功

### 步骤 6：Commit

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: 扩展 SimilarSegment 接口，新增高亮生成和页码查询函数"
```

---

## 任务 2：修改 LCS 算法使用新的高亮和页码逻辑

**文件：**
- 修改：`src/utils/textAlgorithms.ts`

### 步骤 1：修改 findSimilarSegments 函数签名

将函数签名从：

```typescript
export function findSimilarSegments(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 15,
  totalPages1: number = 1,
  totalPages2: number = 1
): SimilarSegment[]
```

改为：

```typescript
export function findSimilarSegments(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 50,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[]
```

### 步骤 2：修改片段生成逻辑

找到 `segments.push({...})` 部分，替换为：

```typescript
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
```

### 步骤 3：运行构建验证

```bash
npm run build
```

### 步骤 4：Commit

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: LCS 算法使用新的高亮和页码映射逻辑"
```

---

## 任务 3：修改 Rabin-Karp 算法

**文件：**
- 修改：`src/utils/textAlgorithms.ts`

### 步骤 1：修改函数签名

将 `findSimilarSegmentsRabinKarp` 的 `totalPages1/totalPages2` 参数替换为 `pageMap1/pageMap2`。

### 步骤 2：修改片段生成逻辑

找到 `segments.push({...})` 部分，使用与 LCS 相同的模式：

```typescript
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
```

### 步骤 3：修复相似度估算函数

找到 `estimateSimilarityFromSegments` 函数，替换为：

```typescript
export function estimateSimilarityFromSegments(
  segments: SimilarSegment[],
  textLength: number
): number {
  if (textLength === 0 || segments.length === 0) return 0
  
  const matchedPositions = new Set<number>()
  
  for (const seg of segments) {
    for (let i = seg.leftStartIndex; i < seg.leftEndIndex; i++) {
      matchedPositions.add(i)
    }
  }
  
  return Math.round((matchedPositions.size / textLength) * 100)
}
```

### 步骤 4：运行构建验证

```bash
npm run build
```

### 步骤 5：Commit

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: Rabin-Karp 算法使用新高亮逻辑，修复相似度估算 bug"
```

---

## 任务 4：实现 MinHash + LSH 算法

**文件：**
- 修改：`src/utils/textAlgorithms.ts`

### 步骤 1：新增 Shingling 函数

在文件末尾添加：

```typescript
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
```

### 步骤 2：新增 MinHash 签名计算函数

```typescript
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
```

### 步骤 3：新增 LSH 候选查找函数

```typescript
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
```

### 步骤 4：新增 MinHash 完整流程函数

```typescript
function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }
  return chunks
}

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
      seg.leftStartIndex += offset1
      seg.leftEndIndex += offset1
      seg.rightStartIndex += offset2
      seg.rightEndIndex += offset2
      segments.push(seg)
    }

    processed++
    if (onProgress && processed % 10 === 0) {
      const progress = 0.5 + (processed / totalCandidates) * 0.5
      onProgress(Math.min(1, progress))
    }
  }

  return mergeOverlappingSegments(segments)
}
```

### 步骤 5：新增重叠片段合并函数

```typescript
function areOverlapping(seg1: SimilarSegment, seg2: SimilarSegment): boolean {
  return (
    seg2.leftStartIndex < seg1.leftEndIndex &&
    seg2.leftEndIndex > seg1.leftStartIndex
  )
}

function mergeTwoSegments(seg1: SimilarSegment, seg2: SimilarSegment): void {
  seg1.leftStartIndex = Math.min(seg1.leftStartIndex, seg2.leftStartIndex)
  seg1.leftEndIndex = Math.max(seg1.leftEndIndex, seg2.leftEndIndex)
  seg1.rightStartIndex = Math.min(seg1.rightStartIndex, seg2.rightStartIndex)
  seg1.rightEndIndex = Math.max(seg1.rightEndIndex, seg2.rightEndIndex)
  seg1.similarityValue = Math.max(seg1.similarityValue, seg2.similarityValue)
  seg1.similarity = `${seg1.similarityValue}%`
}

export function mergeOverlappingSegments(
  segments: SimilarSegment[]
): SimilarSegment[] {
  if (segments.length === 0) return []

  segments.sort((a, b) => a.leftStartIndex - b.leftStartIndex)

  const merged: SimilarSegment[] = [segments[0]]

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i]
    const last = merged[merged.length - 1]

    if (areOverlapping(last, current)) {
      mergeTwoSegments(last, current)
    } else {
      merged.push(current)
    }
  }

  return merged
}
```

### 步骤 6：修改 selectStrategy 函数

将返回值类型从 `'lcs' | 'rabin-karp' | 'block-match'` 改为 `'lcs' | 'rabin-karp' | 'minhash'`，阈值从 5K/100K 改为 3K/100K：

```typescript
export type ComparisonStrategy = 'lcs' | 'rabin-karp' | 'minhash'

export function selectStrategy(textLength: number): ComparisonStrategy {
  if (textLength < 3_000) return 'lcs'
  if (textLength < 100_000) return 'rabin-karp'
  return 'minhash'
}
```

### 步骤 7：运行构建验证

```bash
npm run build
```

### 步骤 8：Commit

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: 实现 MinHash + LSH 算法和重叠片段合并"
```

---

## 任务 5：修改 useFileParser.ts 添加页码映射构建

**文件：**
- 修改：`src/composables/useFileParser.ts`

### 步骤 1：导入 PageMap 类型

在文件顶部添加：

```typescript
import { PageMap } from '../utils/textAlgorithms'
```

### 步骤 2：修改 FileParseResult 接口

将 `FileParseResult` 接口扩展为：

```typescript
export interface FileParseResult {
  content: string
  properties: FileProperties
  pages?: number
  pageMap?: PageMap
  error?: string
}
```

### 步骤 3：新增 PDF 页码映射构建函数

在 `parsePdfFile` 函数内部，提取完文本后添加：

```typescript
// 构建页码映射
const pageMap: PageMap = {
  ranges: [],
  totalPages: pageCount
}

// 注意：需要在逐页提取文本时同步构建 pageMap
// 修改提取循环：
let offset = 0
for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
  const page = await pdfDocument.getPage(pageNum)
  const textContentResult = await page.getTextContent()
  const pageText = textContentResult.items.map((item: any) => item.str).join('')

  pageMap.ranges.push({
    start: offset,
    end: offset + pageText.length,
    page: pageNum
  })

  textContent += pageText + '\n'
  offset += pageText.length + 1
}

// 返回结果中添加 pageMap
return {
  content: textContent,
  properties: pdfProperties,
  pages: pageCount,
  pageMap
}
```

### 步骤 4：修改其他文件解析函数

对于 TXT/DOCX/XLSX/PPTX，添加估算页码映射：

```typescript
// 在 parseTxtFile 中添加：
function buildEstimatedPageMap(content: string, charsPerPage: number = 1500): PageMap {
  const ranges: Array<{ start: number; end: number; page: number }> = []
  const totalPages = Math.max(1, Math.ceil(content.length / charsPerPage))

  for (let i = 1; i <= totalPages; i++) {
    ranges.push({
      start: (i - 1) * charsPerPage,
      end: Math.min(i * charsPerPage, content.length),
      page: i
    })
  }

  return { ranges, totalPages }
}

// 在每个解析函数的返回结果中添加：
pageMap: buildEstimatedPageMap(content)
```

### 步骤 5：运行构建验证

```bash
npm run build
```

### 步骤 6：Commit

```bash
git add src/composables/useFileParser.ts
git commit -m "feat: 文件解析器添加页码映射构建"
```

---

## 任务 6：修改 useComparison.ts 传递 pageMap

**文件：**
- 修改：`src/composables/useComparison.ts`

### 步骤 1：修改 runComparison 函数签名

将：

```typescript
async function runComparison(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  totalPages1: number = 1,
  totalPages2: number = 1
): Promise<{ segments: SimilarSegment[]; similarity: number }>
```

改为：

```typescript
import { PageMap } from '../utils/textAlgorithms'

async function runComparison(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): Promise<{ segments: SimilarSegment[]; similarity: number }>
```

### 步骤 2：修改 LCS 调用

将：

```typescript
const segments = findSimilarSegments(text1, text2, settings, 15, totalPages1, totalPages2)
```

改为：

```typescript
const segments = findSimilarSegments(text1, text2, settings, 50, pageMap1, pageMap2)
```

### 步骤 3：修改 Worker 调用

将 `worker.postMessage` 中的 `totalPages1/totalPages2` 替换为 `pageMap1/pageMap2`。

### 步骤 4：运行构建验证

```bash
npm run build
```

### 步骤 5：Commit

```bash
git add src/composables/useComparison.ts
git commit -m "feat: useComparison 传递 pageMap 参数"
```

---

## 任务 7：修改 comparison.worker.ts

**文件：**
- 修改：`src/workers/comparison.worker.ts`

### 步骤 1：修改消息接口

将 `ComparisonMessage` 中的 `totalPages1/totalPages2` 替换为 `pageMap1/pageMap2`。

### 步骤 2：修改策略处理

将 `case 'block-match'` 替换为 `case 'minhash'`，调用 `findSimilarSegmentsMinHash`。

### 步骤 3：运行构建验证

```bash
npm run build
```

### 步骤 4：Commit

```bash
git add src/workers/comparison.worker.ts
git commit -m "feat: Worker 添加 minhash 策略处理"
```

---

## 任务 8：修改 FileCompare.vue 调用

**文件：**
- 修改：`src/components/FileCompare.vue`

### 步骤 1：修改 handleCompare 函数

在解析文件后获取 pageMap：

```typescript
const leftResult = await parseFile(leftFileInfo.value.file)
const rightResult = await parseFile(rightFileInfo.value.file)

// 传递 pageMap
const result = await runComparison(
  leftResult.content,
  rightResult.content,
  comparisonSettings,
  leftResult.pageMap,
  rightResult.pageMap
)
```

### 步骤 2：运行构建验证

```bash
npm run build
```

### 步骤 3：Commit

```bash
git add src/components/FileCompare.vue
git commit -m "feat: FileCompare 传入 pageMap 参数"
```

---

## 任务 9：完整测试和最终验证

### 步骤 1：运行完整构建

```bash
npm run build
```

预期：构建成功，无错误

### 步骤 2：运行开发服务器测试

```bash
npm run dev
```

测试清单：
- [ ] 小文件（<3K 字符）：使用 LCS，瞬间完成，页码显示正确
- [ ] 中文件（3K-100K 字符）：使用 Rabin-Karp，5 秒内完成，进度条正常
- [ ] 大文件（100K-500K 字符）：使用 MinHash，15 秒内完成
- [ ] PDF 文件：页码显示为真实页码（如"第 3-5 页/共 20 页"）
- [ ] 高亮显示：只高亮精确匹配位置，上下文中相同文本不误高亮
- [ ] 取消对比：点击取消按钮能正常中断

### 步骤 3：最终 Commit

```bash
git add .
git commit -m "chore: 文件对比算法优化完成"
```

---

## 自检清单

对照设计文档 `docs/superpowers/specs/2026-04-11-comparison-algorithm-optimization.md`：

- [x] 三级阈值策略：LCS <3K、Rabin-Karp 3K-100K、MinHash >100K ✓ 任务 1,4
- [x] 页码映射架构：PageMap 接口、PDF 真实页码、其他文件估算 ✓ 任务 1,5
- [x] 精确高亮显示：基于索引插入，不用正则 ✓ 任务 1,2,3
- [x] MinHash + LSH 算法：Shingling、签名、分桶、候选验证 ✓ 任务 4
- [x] 重叠片段合并：mergeOverlappingSegments ✓ 任务 4
- [x] 相似度估算修复：estimateSimilarityFromSegments ✓ 任务 3
- [x] Worker 策略处理：新增 minhash case ✓ 任务 7
- [x] 接口一致性：SimilarSegment 新增 4 个索引字段 ✓ 任务 1
- [x] 文件解析器扩展：pageMap 字段 ✓ 任务 5

所有需求已覆盖，无占位符，无遗漏。
