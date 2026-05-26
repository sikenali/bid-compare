# 大文件对比优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持 500 页 / 750K 字符级别的文件对比，修复 MinHash 跨块匹配 Bug，优化解析性能，改进进度反馈

**Architecture:** 保持现有架构不变，逐项增量优化。核心改动在解析器（useFileParser.ts）、对比算法（textAlgorithms.ts）、Worker 通信、以及前端进度显示。

**Tech Stack:** Vue 3 + TypeScript, Web Worker, PDF.js, JSZip, Mammoth, SheetJS

---

### 任务 1：修复 PDF 解析 O(n²) 字符串拼接 + PPTX 提取上限

**文件：**
- 修改：`src/composables/useFileParser.ts:248-274`（PDF 解析）
- 修改：`src/composables/useFileParser.ts:492-508`（PPTX 上限）

- [ ] **Step 1: 修复 PDF 解析中的字符串拼接**

将 `let textContent = ''` 和 `textContent += pageText + '\n'` 改为数组模式：

修改 `useFileParser.ts` 第 248-273 行：

```typescript
// 初始化文本内容和页码映射
const textParts: string[] = []
const pageMap: PageMap = { ranges: [], totalPages: pageCount }

// 全量提取所有页数
const extractPageCount = pageCount

// 逐页提取文本，同时构建页码映射
let offset = 0
for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
  const page = await pdfDocument.getPage(pageNum);
  const textContentResult = await page.getTextContent();

  // 提取文本内容
  const pageText = textContentResult.items
    .map((item: any) => item.str)
    .join('');

  // 添加页码映射
  pageMap.ranges.push({
    start: offset,
    end: offset + pageText.length,
    page: pageNum
  })

  textParts.push(pageText)
  offset += pageText.length + 1
}

const textContent = textParts.join('\n')
```

- [ ] **Step 2: 提升 PPTX 提取上限**

修改 `useFileParser.ts` 第 492 行：

```typescript
const MAX_EXTRACT_SLIDES = 200;
```

同时更新第 507-509 行的提示信息，删除限制提示（因为 200 页基本够用）：

```typescript
properties.页码范围 = `1-${slideFiles.length}`;
// 删除以下行：
// if (slideFiles.length > MAX_EXTRACT_SLIDES) {
//   textContent += `... 仅显示前${MAX_EXTRACT_SLIDES}张幻灯片，共${slideFiles.length}张 ...\n`;
// }
```

- [ ] **Step 3: 验证构建通过**

Run: `npm run build 2>&1`
Expected: Build success, no errors

- [ ] **Step 4: 提交**

```bash
git add src/composables/useFileParser.ts
git commit -m "perf: 修复PDF解析O(n²)字符串拼接，提升PPTX提取上限至200页"
```

---

### 任务 2：解除硬上限 + 调整策略阈值 + 动态 Worker 超时

**文件：**
- 修改：`src/composables/useComparison.ts:34`（硬上限）
- 修改：`src/utils/textAlgorithms.ts:467`（策略阈值）
- 修改：`src/components/FileCompare.vue:437`（警告阈值）

- [ ] **Step 1: 修改硬上限和动态超时**

修改 `useComparison.ts`：

```typescript
const WORKER_TIMEOUT_BASE = 60_000
const WORKER_TIMEOUT_PER_CHAR = 0.1  // 每字符额外 0.1ms
const MAX_WORKER_TIMEOUT = 120_000

// 在 runComparison 中计算动态超时
const textLength = Math.max(text1.length, text2.length)

// 硬限制
if (textLength >= 1_000_000) {
  throw new Error(`文件内容过大（${(textLength / 10000).toFixed(1)} 万字），建议拆分后对比`)
}
```

在 `runWorkerComparison` 中使用动态超时（第 80 行）：

```typescript
const dynamicTimeout = Math.min(
  MAX_WORKER_TIMEOUT,
  Math.max(WORKER_TIMEOUT_BASE, Math.round(textLength * WORKER_TIMEOUT_PER_CHAR))
)

timeoutId = window.setTimeout(() => {
  worker.terminate()
  currentWorker = null
  isProcessing.value = false
  canCancel.value = false
  reject(new Error('对比超时，文件内容过大或系统繁忙'))
}, dynamicTimeout)
```

注意需要将 `textLength` 从 `runComparison` 传入 `runWorkerComparison`，或重新计算：

```typescript
function runWorkerComparison(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  strategy: string,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): Promise<{ segments: SimilarSegment[]; similarity: number }> {
  const textLength = Math.max(text1.length, text2.length)
  // ...rest
```

- [ ] **Step 2: 调整策略选择阈值**

修改 `textAlgorithms.ts` 第 467 行：

```typescript
// 小文件（< 3K 字符）：使用暴力 LCS，结果最准确
// 中文件（3K-50K）：使用 Rabin-Karp 滚动哈希，性能 O(m+n)
// 大文件（> 50K）：使用 MinHash + LSH，避免内存溢出
if (textLength < 3_000) return 'lcs'
if (textLength < 50_000) return 'rabin-karp'
return 'minhash'
```

- [ ] **Step 3: 调整文件对比警告阈值**

修改 `FileCompare.vue` 第 437 行：

```typescript
if (totalChars > 800_000) {
  comparisonParseError.value = `文件内容较大（${(totalChars / 10000).toFixed(1)} 万字），对比可能需要较长时间，请耐心等待...`
}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build 2>&1`
Expected: Build success

- [ ] **Step 5: 提交**

```bash
git add src/composables/useComparison.ts src/utils/textAlgorithms.ts src/components/FileCompare.vue
git commit -m "perf: 解除500K硬上限至1M，调整策略阈值至50K，动态Worker超时"
```

---

### 任务 3：Worker 取消检查 + 进度报告粒度改进

**文件：**
- 修改：`src/utils/textAlgorithms.ts:391`（Rabin-Karp 进度频率）
- 修改：`src/utils/textAlgorithms.ts:607-670`（MinHash 进度 + 取消检查）
- 修改：`src/workers/comparison.worker.ts:63-65`（取消检查）

- [ ] **Step 1: 提高 Rabin-Karp 进度报告频率**

修改 `textAlgorithms.ts` 第 391 行：

```typescript
if (onProgress && processed % 500 === 0) {
  onProgress(processed / (n - windowSize + 1))
}
```

- [ ] **Step 2: 为 textAlgorithms 添加取消回调参数**

修改 `findSimilarSegmentsRabinKarp` 签名，添加 `onCancel` 回调：

```typescript
export function findSimilarSegmentsRabinKarp(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 50,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean,  // 新增：返回 true 表示已取消
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
```

在 Rabin-Karp 主循环中（第 342 行 `for (let j = 0; ...)` 每次迭代添加取消检查）：

```typescript
for (let j = 0; j <= n - windowSize; j++) {
  if (onCancel && onCancel()) return segments
  // ... rest
```

修改 `findSimilarSegmentsMinHash` 的签名和循环：

```typescript
export function findSimilarSegmentsMinHash(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): SimilarSegment[] {
```

在签名计算循环和候选处理循环中添加取消检查：

```typescript
const signatures1 = chunks1.map(c => computeMinHashSignature(c, 128))
const signatures2 = chunks2.map(c => computeMinHashSignature(c, 128))

if (onCancel && onCancel()) return []

const candidates = findLSHCandidates(signatures1, signatures2, 20)

if (onCancel && onCancel()) return []

for (const candidate of candidates) {
  if (onCancel && onCancel()) return segments
  // ... rest
```

- [ ] **Step 3: 更新 Worker 传递取消检查**

修改 `comparison.worker.ts` 第 59-84 行，在调用算法时传入取消检查回调：

```typescript
case 'rabin-karp':
  segments = findSimilarSegmentsRabinKarp(
    text1, text2, settings, 10,
    (progress) => {
      if (!cancelled) {
        self.postMessage({ type: 'PROGRESS', progress, message: '正在分析...' })
      }
    },
    () => cancelled,  // 传入取消检查回调
    pageMap1,
    pageMap2
  )
  similarity = estimateSimilarityFromSegments(segments, text1.length)
  break
case 'minhash':
  segments = findSimilarSegmentsMinHash(
    text1, text2, settings,
    (progress) => {
      if (!cancelled) {
        self.postMessage({ type: 'PROGRESS', progress, message: 'MinHash 计算中...' })
      }
    },
    () => cancelled,
    pageMap1,
    pageMap2
  )
  similarity = estimateSimilarityFromSegments(segments, text1.length)
  break
```

- [ ] **Step 4: 改进 MinHash 进度报告**

修改 `findSimilarSegmentsMinHash`，增加更多进度点：

```typescript
// 签名计算后（占总进度 40%）
const totalChunks = chunks1.length + chunks2.length
let completedChunks = 0

for (const c of chunks1) {
  if (onCancel && onCancel()) return []
  signatures1.push(computeMinHashSignature(c, 128))
  completedChunks++
  if (onProgress) onProgress(0.4 * (completedChunks / totalChunks))
}

for (const c of chunks2) {
  if (onCancel && onCancel()) return []
  signatures2.push(computeMinHashSignature(c, 128))
  completedChunks++
  if (onProgress) onProgress(0.4 * (completedChunks / totalChunks))
}

// LSH 候选搜索后（40%-50%）
if (onProgress) onProgress(0.5)

// 每个候选对处理时报告（50%-100%）
for (let i = 0; i < candidates.length; i++) {
  if (onCancel && onCancel()) return segments
  const candidate = candidates[i]
  // ...
  if (onProgress) {
    onProgress(0.5 + 0.5 * ((i + 1) / candidates.length))
  }
}
```

- [ ] **Step 5: 验证构建通过**

Run: `npm run build 2>&1`
Expected: Build success

- [ ] **Step 6: 提交**

```bash
git add src/utils/textAlgorithms.ts src/workers/comparison.worker.ts
git commit -m "perf: 增加Worker取消检查回调，提高进度报告粒度"
```

---

### 任务 4：支持解析阶段可取消

**文件：**
- 修改：`src/composables/useFileParser.ts`（AbortSignal 支持）
- 修改：`src/composables/useComparison.ts`（暴露 AbortController）
- 修改：`src/components/FileCompare.vue`（连接取消逻辑）

- [ ] **Step 1: useFileParser.ts 添加 AbortSignal 支持**

修改 `parseFile` 函数签名，添加可选的 `signal?: AbortSignal` 参数，并传递到各解析函数：

```typescript
const parseFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
  switch (fileExtension) {
    case 'txt':
      return parseTxtFile(file);
    case 'docx':
      return parseDocxFile(file);
    case 'doc':
      return parseDocFile(file);
    case 'pdf':
      return parsePdfFile(file, signal);
    case 'xlsx':
    case 'xls':
      return parseXlsxFile(file);
    case 'pptx':
    case 'ppt':
      return parsePptxFile(file, signal);
    default:
      return {
        content: '',
        properties: {},
        error: '不支持的文件类型'
      };
  }
};
```

修改 `parsePdfFile` 签名并添加循环中断检查：

```typescript
const parsePdfFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
  // ...原有逻辑...
  for (let pageNum = 1; pageNum <= extractPageCount; pageNum++) {
    if (signal?.aborted) {
      throw new DOMException('用户取消了文件解析', 'AbortError')
    }
    // ...原有解析逻辑...
  }
}
```

修改 `parsePptxFile` 同步添加 `signal` 参数和检查：

```typescript
const parsePptxFile = async (file: File, signal?: AbortSignal): Promise<FileParseResult> => {
  // ...在幻灯片循环中添加：
  for (let i = 0; i < extractSlides.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('用户取消了文件解析', 'AbortError')
    }
    // ...
  }
}
```

同时更新 `useFileParser` 返回的函数签名暴露 `signal` 参数：

```typescript
return {
  parseFile,
  parseTxtFile,
  parseDocxFile,
  parsePdfFile,
  parseDocFile,
  parseXlsxFile,
  parsePptxFile
};
```

注意：`parseTxtFile` 使用 Promise 和 FileReader，本身无法通过 AbortSignal 中断，但如果是 `signal.aborted` 可以在开始时检查。

- [ ] **Step 2: useComparison.ts 暴露 AbortController**

添加 `abortController` 并在 `cancelComparison` 中使用：

```typescript
let currentWorker: Worker | null = null
let timeoutId: number | null = null
let abortController: AbortController | null = null

function cancelComparison() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  if (currentWorker) {
    currentWorker.postMessage({ type: 'CANCEL' })
    currentWorker.terminate()
    currentWorker = null
  }
  cleanup()
}
```

在 `runComparison` 开始时创建新的 `AbortController`：

```typescript
async function runComparison(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  pageMap1?: PageMap,
  pageMap2?: PageMap
): Promise<{ segments: SimilarSegment[]; similarity: number }> {
  abortController = new AbortController()
  // ...
```

同时返回 `abortController` 的 `signal` 供外部使用：

在 `runComparison` 中不直接暴露 `signal`，而是通过 `cancelComparison` 统一控制。`useComparison` 内部不需要将 `signal` 传给 `runComparison`，因为它自己管理 `abortController`。

- [ ] **Step 3: FileCompare.vue 连接取消逻辑**

在 `handleCompare` 中传递 `signal`：

修改第 426 和 431 行的 `parseFile` 调用：

```typescript
// 需要在 handleCompare 中获取 signal
// 暴露 abortController 的 signal 给外部
// 在 setup 中：
const { abortSignal } = useComparison() // 或者通过 ref 暴露
```

更简单的方案：在 `useComparison` 中添加 `getAbortSignal()` 方法：

```typescript
function getAbortSignal(): AbortSignal | undefined {
  return abortController?.signal
}

return {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  parseError,
  runComparison,
  cancelComparison,
  getAbortSignal
}
```

在 `FileCompare.vue` 中使用：

```typescript
const {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  parseError: comparisonParseError,
  runComparison,
  cancelComparison,
  getAbortSignal
} = useComparison()

// handleCompare 中：
const leftResult = await parseFile(leftFileInfo.value.file, getAbortSignal())
// ...
const rightResult = await parseFile(rightFileInfo.value.file, getAbortSignal())
```

修改 `handleCancel` 同时中止解析（现有逻辑已调用 `cancelComparison`，会触发 `abortController.abort()`）：

```typescript
const handleCancel = () => {
  cancelComparison()  // 这会调用 abortController.abort() 和 worker.terminate()
}
```

- [ ] **Step 4: 验证构建通过**

Run: `npm run build 2>&1`
Expected: Build success

- [ ] **Step 5: 提交**

```bash
git add src/composables/useFileParser.ts src/composables/useComparison.ts src/components/FileCompare.vue
git commit -m "feat: 解析阶段支持AbortSignal取消，贯通取消链路"
```

---

### 任务 5：修复 MinHash 跨块匹配 Bug（重叠窗口 + 偏移修正）

**文件：**
- 修改：`src/utils/textAlgorithms.ts:596-670`（chunkText + findSimilarSegmentsMinHash）

- [ ] **Step 1: 修改 chunkText 支持重叠窗口**

将 `chunkText` 改为带重叠参数的版本：

```typescript
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
```

- [ ] **Step 2: 修复 findSimilarSegmentsMinHash 的偏移计算和重叠去重**

重写 `findSimilarSegmentsMinHash` 函数的核心逻辑：

```typescript
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

  // 计算每个 chunk 在原始文本中的起始偏移
  const chunkOffsets1 = buildChunkOffsets(text1.length, chunkSize, overlap)
  const chunkOffsets2 = buildChunkOffsets(text2.length, chunkSize, overlap)

  if (onCancel?.()) return []

  // 进度：签名计算阶段（0-40%）
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

  // 进度：LSH 候选搜索（40%-50%）
  const candidates = findLSHCandidates(signatures1, signatures2, 20)
  if (onProgress) onProgress(0.5)
  if (onCancel?.()) return []

  const totalCandidates = candidates.length

  // 进度：精细验证阶段（50%-100%）
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

      // 重新构建高亮 HTML（使用完整文本和正确的偏移）
      seg.leftContent = buildHighlightedHtml(text1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0, 10)
      seg.rightContent = buildHighlightedHtml(text2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0, 10)

      // 重新计算页码（使用完整文本的 pageMap）
      seg.leftPage = pageMap1 ? formatPageRange(pageMap1, seg.leftStartIndex ?? 0, seg.leftEndIndex ?? 0) : '第1/1页'
      seg.rightPage = pageMap2 ? formatPageRange(pageMap2, seg.rightStartIndex ?? 0, seg.rightEndIndex ?? 0) : '第1/1页'

      segments.push(seg)
    }

    if (onProgress) {
      onProgress(0.5 + 0.5 * ((ci + 1) / Math.max(1, totalCandidates)))
    }
  }

  // 合并重叠 + 去重
  return mergeOverlappingSegments(segments)
}

function buildChunkOffsets(totalLength: number, chunkSize: number, overlap: number): number[] {
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
```

注意：`findSimilarSegmentsRabinKarp` 在第 640-648 行的调用不再传入 `pageMap1/pageMap2`（因为这些是 chunk 级别的），而是在上层用完整偏移重新计算。需要确保 Rabin-Karp 的第 647-648 行的 pageMap 参数在 chunk 级别调用时传入 `undefined`（上面代码已体现：不传 pageMap1/pageMap2）。

- [ ] **Step 3: 验证构建通过**

Run: `npm run build 2>&1`
Expected: Build success

- [ ] **Step 4: 提交**

```bash
git add src/utils/textAlgorithms.ts src/workers/comparison.worker.ts
git commit -m "fix: MinHash跨块匹配修复-重叠窗口+偏移修正+去重合并"
```

---

### 任务 6：整合验证

**文件：**
- 验证：构建和整体功能

- [ ] **Step 1: 全量构建**

Run: `npm run build 2>&1`
Expected: Build success, no TypeScript errors

- [ ] **Step 2: 提交最终版本**

```bash
git add -A
git commit -m "perf: 大文件对比全面优化-上限提升/重叠窗口/取消链路/进度改进"
```
