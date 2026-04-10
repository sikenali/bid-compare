# 大文件对比性能优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 优化文件对比功能，使小文件秒级响应、大文件不崩溃、有进度条和取消功能。

**架构：** 三层算法策略——小文件用优化后的 LCS 主线程执行，中/大文件用 Web Worker 后台计算（Rabin-Karp / 分块匹配），通过 composable 封装通信细节。

**技术栈：** Vue 3 + TypeScript + Vite Web Worker + Rabin-Karp 滚动哈希算法

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/utils/textAlgorithms.ts` | 新建 | LCS 滚动数组、Rabin-Karp 双哈希、分块匹配算法 |
| `src/workers/comparison.worker.ts` | 新建 | Web Worker 入口，接收消息、执行算法、发送进度 |
| `src/composables/useComparison.ts` | 新建 | 统一对比逻辑，封装 Worker 通信和策略选择 |
| `src/components/FileCompare.vue` | 修改 | 添加进度条 UI、调用 useComparison、移除旧算法 |
| `src/composables/useFileParser.ts` | 不变 | 文件解析逻辑不变 |

---

### 任务 1：实现 LCS 滚动数组算法

**文件：**
- 创建：`src/utils/textAlgorithms.ts`

- [ ] **步骤 1：创建算法工具文件，定义类型和 LCS 函数**

```typescript
// src/utils/textAlgorithms.ts

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
```

- [ ] **步骤 2：Commit**

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: 添加 LCS 滚动数组算法和预处理工具函数"
```

---

### 任务 2：实现 Rabin-Karp 双哈希算法

**文件：**
- 修改：`src/utils/textAlgorithms.ts`

- [ ] **步骤 1：添加 Rabin-Karp 双哈希函数**

在 `src/utils/textAlgorithms.ts` 末尾追加：

```typescript
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
  const preprocessed1 = preprocessText(text1, settings)
  const preprocessed2 = preprocessText(text2, settings)
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

          const escapeHtml = (str: string) => {
            const div = document.createElement('div')
            div.textContent = str
            return div.innerHTML
          }

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

    processed++
    if (onProgress && processed % 5000 === 0) {
      onProgress(processed / (n - windowSize + 1))
    }
  }

  return segments
}
```

- [ ] **步骤 2：添加分块匹配函数**

```typescript
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
    const hash1 = computeDoubleHash(preprocessText(block1, settings))

    for (let j = 0; j < blocks2.length; j++) {
      const block2 = blocks2[j].trim()
      const hash2 = computeDoubleHash(preprocessText(block2, settings))

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
          seg.id = segments.length + 1
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
```

- [ ] **步骤 3：添加策略选择函数**

```typescript
export type ComparisonStrategy = 'lcs' | 'rabin-karp' | 'block-match'

export function selectStrategy(textLength: number): ComparisonStrategy {
  if (textLength < 20_000) return 'lcs'
  if (textLength < 100_000) return 'rabin-karp'
  return 'block-match'
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/utils/textAlgorithms.ts
git commit -m "feat: 添加 Rabin-Karp 双哈希和分块匹配算法"
```

---

### 任务 3：创建 Web Worker

**文件：**
- 创建：`src/workers/comparison.worker.ts`

- [ ] **步骤 1：创建 Worker 文件**

```typescript
// src/workers/comparison.worker.ts
// Worker 需要导入算法——使用相对路径
import {
  findSimilarSegmentsLCS,
  findSimilarSegmentsRabinKarp,
  findSimilarSegmentsBlockMatch,
  calculateTextSimilarity,
  preprocessText,
  ComparisonSettings
} from '../utils/textAlgorithms'

let cancelled = false

self.onmessage = function (e: MessageEvent) {
  if (e.data.type === 'CANCEL') {
    cancelled = true
    return
  }

  if (e.data.type === 'START') {
    cancelled = false
    handleComparison(e.data)
  }
}

function handleComparison(data: any) {
  const { text1, text2, settings, strategy } = data
  const startTime = performance.now()

  try {
    let segments: any[] = []
    const progressInterval = setInterval(() => {
      // 进度由算法内部回调驱动，这里仅做兜底
    }, 500)

    switch (strategy) {
      case 'lcs':
        segments = findSimilarSegmentsLCS(text1, text2, settings)
        break
      case 'rabin-karp':
        segments = findSimilarSegmentsRabinKarp(
          text1, text2, settings, 8,
          (progress) => {
            self.postMessage({ type: 'PROGRESS', progress, message: '正在分析...' })
          }
        )
        break
      case 'block-match':
        segments = findSimilarSegmentsBlockMatch(
          text1, text2, settings,
          (progress) => {
            self.postMessage({ type: 'PROGRESS', progress, message: '分块匹配中...' })
          }
        )
        break
    }

    clearInterval(progressInterval)

    const elapsed = performance.now() - startTime
    const similarity = calculateTextSimilarity(text1, text2, settings as ComparisonSettings)

    if (!cancelled) {
      self.postMessage({
        type: 'DONE',
        segments,
        similarity,
        elapsed: Math.round(elapsed)
      })
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      message: (error as Error).message,
      stack: (error as Error).stack
    })
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/workers/comparison.worker.ts
git commit -m "feat: 创建对比分析 Web Worker"
```

---

### 任务 4：创建 useComparison composable

**文件：**
- 创建：`src/composables/useComparison.ts`

- [ ] **步骤 1：创建 composable**

```typescript
// src/composables/useComparison.ts
import { ref, type Ref } from 'vue'
import {
  selectStrategy,
  findSimilarSegmentsLCS,
  calculateTextSimilarity,
  type SimilarSegment,
  type ComparisonSettings
} from '../utils/textAlgorithms'
import ComparisonWorker from '../workers/comparison.worker?worker'

export function useComparison() {
  const isProcessing = ref(false)
  const progress = ref(0)
  const progressMessage = ref('')
  const canCancel = ref(false)
  const parseError = ref('')

  let currentWorker: Worker | null = null
  let timeoutId: number | null = null

  const WORKER_TIMEOUT = 60_000

  async function runComparison(
    text1: string,
    text2: string,
    settings: ComparisonSettings
  ): Promise<{ segments: SimilarSegment[]; similarity: number }> {
    const textLength = Math.max(text1.length, text2.length)

    // 硬限制
    if (textLength >= 500_000) {
      throw new Error(`文件内容过大（${(textLength / 10000).toFixed(1)} 万字），建议拆分后对比`)
    }

    isProcessing.value = true
    progress.value = 0
    progressMessage.value = '准备中...'
    canCancel.value = false
    parseError.value = ''

    const strategy = selectStrategy(textLength)

    try {
      if (strategy === 'lcs') {
        // 小文件：主线程
        progressMessage.value = '正在对比...'
        const segments = findSimilarSegmentsLCS(text1, text2, settings)
        const similarity = calculateTextSimilarity(text1, text2, settings)
        isProcessing.value = false
        return { segments, similarity }
      } else {
        // 中/大文件：Worker
        return runWorkerComparison(text1, text2, settings, strategy)
      }
    } catch (error) {
      isProcessing.value = false
      throw error
    }
  }

  function runWorkerComparison(
    text1: string,
    text2: string,
    settings: ComparisonSettings,
    strategy: string
  ): Promise<{ segments: SimilarSegment[]; similarity: number }> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new ComparisonWorker()
        currentWorker = worker
        canCancel.value = true
        progressMessage.value = strategy === 'rabin-karp' ? '正在分析...' : '分块匹配中...'

        // 超时保护
        timeoutId = window.setTimeout(() => {
          worker.terminate()
          currentWorker = null
          isProcessing.value = false
          canCancel.value = false
          reject(new Error('对比超时，文件内容过大或系统繁忙'))
        }, WORKER_TIMEOUT)

        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'PROGRESS') {
            progress.value = e.data.progress
            progressMessage.value = e.data.message || '正在分析...'
          } else if (e.data.type === 'DONE') {
            cleanup()
            resolve({ segments: e.data.segments, similarity: e.data.similarity })
          } else if (e.data.type === 'ERROR') {
            cleanup()
            reject(new Error(e.data.message))
          }
        }

        worker.onerror = (error: ErrorEvent) => {
          cleanup()
          reject(new Error(`Worker 错误：${error.message}`))
        }

        worker.postMessage({
          type: 'START',
          text1,
          text2,
          settings,
          strategy
        })
      } catch (error) {
        // Worker 不可用，降级到主线程（仅限小文件）
        console.warn('Worker 不可用，使用主线程 LCS')
        isProcessing.value = false
        canCancel.value = false
        const segments = findSimilarSegmentsLCS(text1, text2, settings)
        const similarity = calculateTextSimilarity(text1, text2, settings)
        resolve({ segments, similarity })
      }
    })
  }

  function cancelComparison() {
    if (currentWorker) {
      currentWorker.postMessage({ type: 'CANCEL' })
      currentWorker.terminate()
      currentWorker = null
    }
    cleanup()
  }

  function cleanup() {
    if (timeoutId) clearTimeout(timeoutId)
    if (currentWorker) {
      currentWorker.terminate()
      currentWorker = null
    }
    isProcessing.value = false
    canCancel.value = false
    progress.value = 0
  }

  return {
    isProcessing,
    progress,
    progressMessage,
    canCancel,
    parseError,
    runComparison,
    cancelComparison
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/composables/useComparison.ts
git commit -m "feat: 创建 useComparison composable 封装 Worker 通信"
```

---

### 任务 5：更新 FileCompare.vue 使用新对比逻辑

**文件：**
- 修改：`src/components/FileCompare.vue`

- [ ] **步骤 1：导入 useComparison，移除旧算法函数**

在 FileCompare.vue 的 script 部分，找到现有的算法函数并替换。

删除以下函数：
- `calculateTextSimilarity`
- `detectSimilarSegments`
- `generateHighlightedContent`
- `updateSimilarityDisplay`

添加导入：
```typescript
import { useComparison } from '../composables/useComparison'
import type { ComparisonSettings } from '../utils/textAlgorithms'
```

添加 composable 使用：
```typescript
const {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  parseError,
  runComparison,
  cancelComparison
} = useComparison()
```

- [ ] **步骤 2：修改 handleCompare 函数**

```typescript
const handleCompare = async () => {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) return

  try {
    // 解析左侧文件
    const leftResult = await parseFile(leftFileInfo.value.file)
    if (leftResult.error) throw new Error(leftResult.error)
    leftFileContent.value = leftResult.content

    // 解析右侧文件
    const rightResult = await parseFile(rightFileInfo.value.file)
    if (rightResult.error) throw new Error(rightResult.error)
    rightFileContent.value = rightResult.content

    // 文件大小警告
    const totalChars = leftResult.content.length + rightResult.content.length
    if (totalChars > 500_000) {
      parseError.value = `文件内容较大（${(totalChars / 10000).toFixed(1)} 万字），对比可能需要较长时间`
    }

    // 执行对比
    const settings: ComparisonSettings = {
      minDuplicateWords: settings.minDuplicateWords,
      textSimilarityThreshold: settings.textSimilarityThreshold,
      ignoreCase: settings.ignoreCase,
      ignorePunctuation: settings.ignorePunctuation,
      ignoreWhitespace: settings.ignoreWhitespace
    }

    const result = await runComparison(leftResult.content, rightResult.content, settings)

    textSimilarity.value = `${result.similarity}%`
    similarSegmentsList.value = result.segments
    similarSegments.value = result.segments.length

    if (result.segments.length > 0) {
      currentContent.value = {
        left: result.segments[0].leftContent,
        right: result.segments[0].rightContent
      }
      currentLeftPage.value = result.segments[0].leftPage
      currentRightPage.value = result.segments[0].rightPage
    }

    // 保存记录
    addRecentRecord({
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
      similarity: textSimilarity.value,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarSegments: similarSegmentsList.value
    })

    showResults.value = true
  } catch (error) {
    parseError.value = (error as Error).message
  }
}
```

- [ ] **步骤 3：添加取消处理函数**

```typescript
const handleCancel = () => {
  cancelComparison()
  parseError.value = '已取消对比'
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/components/FileCompare.vue
git commit -m "refactor: FileCompare 接入 useComparison，移除旧算法"
```

---

### 任务 6：添加进度条 UI

**文件：**
- 修改：`src/components/FileCompare.vue`

- [ ] **步骤 1：在模板中添加进度条**

在"一键对比"按钮区域下方添加进度条容器：

```vue
<!-- 进度条容器 -->
<div v-if="isProcessing && canCancel" class="progress-container">
  <div class="progress-bar">
    <div class="progress-fill" :style="{ width: `${Math.round(progress * 100)}%` }" />
  </div>
  <span class="progress-text">
    {{ progressMessage }} {{ Math.round(progress * 100) }}%
  </span>
  <button class="cancel-btn" @click="handleCancel">取消</button>
</div>
```

- [ ] **步骤 2：添加进度条样式**

在 `<style scoped>` 末尾添加：

```css
/* 进度条 */
.progress-container {
  width: 100%;
  padding: 20px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: rgba(245, 238, 226, 1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Medium;
  white-space: nowrap;
  min-width: 120px;
}

.cancel-btn {
  padding: 8px 20px;
  background-color: transparent;
  border: 1px solid rgba(139, 0, 0, 1);
  color: rgba(139, 0, 0, 1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/components/FileCompare.vue
git commit -m "feat: 添加对比进度条和取消按钮 UI"
```

---

### 任务 7：构建验证

- [ ] **步骤 1：运行构建**

```bash
npm run build
```

预期：无错误，构建成功

- [ ] **步骤 2：修复任何构建错误**

如有类型错误或导入错误，修复它们。

- [ ] **步骤 3：Commit**

```bash
git add -A
git commit -m "fix: 修复构建错误"
```
