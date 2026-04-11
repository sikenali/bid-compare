# 文件对比算法优化设计文档

## 概述

优化文件对比算法的性能、准确度和用户体验，实现按文件大小分级策略、精确页码定位和可靠的高亮显示。

## 目标

1. **性能优化**：小文件秒级完成，中文件 5 秒内，大文件 15 秒内
2. **页码精确**：PDF 使用真实页码，其他文件使用优化的估算策略
3. **高亮可靠**：基于索引的精确定位，避免正则替换导致的错误高亮

## 架构设计

### 文件大小分级策略

| 文件大小 | 算法 | 执行位置 | 时间复杂度 | 特点 |
|---------|------|---------|-----------|------|
| < 3K 字符 | 暴力 LCS | 主线程 | O(m×n) | 最准确，小文件无性能问题 |
| 3K-100K 字符 | Rabin-Karp 双哈希 | Web Worker | O(m+n) | 性能好，适合中等文件 |
| 100K-500K 字符 | MinHash + LSH | Web Worker | O(m+n) 近似 | 概率算法，大文件高效 |
| > 500K 字符 | 拒绝对比 | - | - | 建议用户拆分文件 |

### 数据流

```
用户点击"开始对比"
         │
         ▼
┌─────────────────────┐
│  runComparison()    │
│  1. 获取文件和页码映射 │
│  2. selectStrategy()│
│  3. 调度到对应算法   │
└────────┬────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
 <3K 字符  3K-100K   100K-500K   >500K
    │         │          │          │
    ▼         ▼          ▼          ▼
 LCS 主线程  Rabin-Karp  MinHash   抛出错误
            Worker      Worker
    │         │          │
    ▼         ▼          ▼
┌──────────────────────────────┐
│  合并/去重片段                │
│  基于索引生成高亮 HTML         │
│  通过页码映射查询真实页码      │
│  返回结果                     │
└──────────────┬───────────────┘
               │
               ▼
         更新 UI 显示
```

## 核心算法设计

### 1. 暴力 LCS（<3K 字符）

**保持不变**，仅调整阈值从 5K 降到 3K。

```typescript
export function selectStrategy(textLength: number): ComparisonStrategy {
  if (textLength < 3_000) return 'lcs'
  if (textLength < 100_000) return 'rabin-karp'
  return 'minhash'
}
```

### 2. 改进的 Rabin-Karp（3K-100K 字符）

**改进点：**
- 重叠片段合并
- 修复相似度计算 bug
- 精确进度回调

```typescript
// 修复后的相似度计算
export function estimateSimilarityFromSegments(
  segments: SimilarSegment[],
  textLength: number
): number {
  const matchedPositions = new Set<number>()
  
  for (const seg of segments) {
    for (let i = seg.leftStartIndex; i < seg.leftEndIndex; i++) {
      matchedPositions.add(i)
    }
  }
  
  return Math.round((matchedPositions.size / textLength) * 100)
}
```

### 3. MinHash + LSH（100K-500K 字符）

#### 3.1 Shingling

```typescript
export function generateShingles(text: string, k: number = 5): Set<string> {
  const shingles = new Set<string>()
  const processed = text.toLowerCase().replace(/\s+/g, ' ').trim()

  for (let i = 0; i <= processed.length - k; i++) {
    shingles.add(processed.substring(i, i + k))
  }

  return shingles
}
```

#### 3.2 MinHash 签名

```typescript
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

**参数：**
- 哈希函数数量：128
- 种子使用质数序列，减少冲突

#### 3.3 LSH 分桶

```typescript
export function findLSHCandidates(
  signatures1: number[][],
  signatures2: number[][],
  numBuckets: number = 20
): LSHPair[] {
  // 按 band 分桶查找候选对
  // 返回按相似度排序的候选列表
}
```

**参数：**
- 桶数：20
- 每 band 行数：签名长度 / 桶数
- 候选阈值：Jaccard 相似度 > 0.7

#### 3.4 完整流程

```typescript
export function findSimilarSegmentsMinHash(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
  // 1. 文本分块（1000 字符/块）
  // 2. 计算 MinHash 签名
  // 3. LSH 查找候选对
  // 4. 对候选对做 Rabin-Karp 精确验证
  // 5. 合并重叠片段
  // 6. 返回结果
}
```

## 页码映射架构

### 数据结构

```typescript
export interface PageMap {
  ranges: Array<{ start: number; end: number; page: number }>
  totalPages: number
}

export interface FileParseResult {
  content: string
  properties: FileProperties
  pages?: number
  pageMap?: PageMap  // 新增
  error?: string
}
```

### 各文件格式实现

#### PDF（真实页码）

逐页提取，构建精确映射：

```typescript
async function buildPdfPageMap(pdfDocument: any): Promise<PageMap> {
  const ranges = []
  let offset = 0

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i)
    const text = await page.getTextContent()
    const pageText = text.items.map(item => item.str).join('')

    ranges.push({
      start: offset,
      end: offset + pageText.length,
      page: i
    })

    offset += pageText.length + 1
  }

  return { ranges, totalPages: pdfDocument.numPages }
}
```

#### DOCX（估算优化）

通过字符数估算，但使用更合理的阈值（1500 字符/页）：

```typescript
function buildDocxPageMap(content: string): PageMap {
  const CHARS_PER_PAGE = 1500
  const totalPages = Math.max(1, Math.ceil(content.length / CHARS_PER_PAGE))
  // 构建 ranges...
}
```

#### TXT/其他（估算）

```typescript
function buildEstimatedPageMap(content: string, charsPerPage: number = 1500): PageMap {
  // 构建 ranges...
}
```

### 页码查询

```typescript
// 二分查找定位页码
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

## 精确高亮显示

### 问题回顾

当前使用 `String.replace` + 正则表达式：
1. 正则特殊字符可能失败
2. 相同文本多次出现时会全部高亮
3. HTML 转义后替换可能破坏结构

### 新方案：基于索引的精确插入

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

### 高亮生成函数

```typescript
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

**优势：**
- 不使用正则，避免特殊字符问题
- 只高亮精确匹配的位置
- 上下文中相同文本不会误高亮

## 接口设计

### textAlgorithms.ts 导出

| 函数 | 说明 |
|------|------|
| `selectStrategy(textLength)` | 选择对比策略 |
| `findSimilarSegments(...)` | 暴力 LCS 算法 |
| `findSimilarSegmentsRabinKarp(...)` | Rabin-Karp 算法 |
| `findSimilarSegmentsMinHash(...)` | MinHash + LSH 算法（新增） |
| `computeMinHashSignature(text, numHashes)` | MinHash 签名计算（新增） |
| `findLSHCandidates(sig1, sig2, numBuckets)` | LSH 候选查找（新增） |
| `generateShingles(text, k)` | n-gram 分片（新增） |
| `buildHighlightedHtml(...)` | 高亮 HTML 生成（新增） |
| `findPageByIndex(pageMap, charIndex)` | 页码查询（新增） |
| `formatPageRange(pageMap, start, end)` | 页码格式化（新增） |
| `mergeOverlappingSegments(segments)` | 重叠片段合并（新增） |
| `estimateSimilarityFromSegments(...)` | 相似度计算（修复） |

### Worker 消息协议

**输入：**
```typescript
interface ComparisonMessage {
  type: 'START'
  text1: string
  text2: string
  settings: ComparisonSettings
  strategy: 'lcs' | 'rabin-karp' | 'minhash'
  pageMap1?: PageMap
  pageMap2?: PageMap
  totalPages1?: number
  totalPages2?: number
}
```

**输出：**
```typescript
interface DoneMessage {
  type: 'DONE'
  segments: SimilarSegment[]
  similarity: number
  elapsed: number
  strategy: string
}
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `textAlgorithms.ts` | 新增 | MinHash、LSH、Shingling、高亮生成、页码映射函数 |
| `textAlgorithms.ts` | 修改 | 策略阈值调整、接口扩展、相似度修复 |
| `comparison.worker.ts` | 新增 | 'minhash' 策略处理 |
| `comparison.worker.ts` | 修复 | 相似度估算 bug |
| `useFileParser.ts` | 新增 | `buildPdfPageMap`、`buildDocxPageMap`、`buildEstimatedPageMap` |
| `useFileParser.ts` | 修改 | `FileParseResult` 增加 `pageMap` 字段 |
| `useComparison.ts` | 修改 | 接收和传递 `pageMap` 参数 |
| `FileCompare.vue` | 修改 | 传入 `pageMap` 参数到对比函数 |

## 性能预期

| 文件大小 | 预期耗时 | 说明 |
|---------|---------|------|
| < 3K | < 100ms | 主线程 LCS，瞬间完成 |
| 3K-50K | 1-3 秒 | Worker Rabin-Karp |
| 50K-100K | 3-5 秒 | Worker Rabin-Karp |
| 100K-300K | 5-10 秒 | Worker MinHash + LSH |
| 300K-500K | 10-15 秒 | Worker MinHash + LSH |

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| MinHash 漏掉短片段 | LSH 阈值设为 0.7，后续用 Rabin-Karp 精确验证 |
| Worker 超时 | 60 秒超时保护，用户可取消 |
| 内存溢出 | 大文件分块处理，不一次性加载全部内容 |
| 页码映射构建失败 | 降级为估算模式，不影响对比功能 |
