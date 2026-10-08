import {
  findSimilarSegments,
  findSimilarSegmentsRabinKarp,
  findSimilarSegmentsMinHash,
  findSimilarSegmentsSimHash,
  findSimilarSegmentsMyers,
  findSimilarSegmentsSmart,
  type ComparisonSettings,
  type SimilarSegment,
  type PageMap
} from '../utils/textAlgorithms'

interface ComparisonMessage {
  type: 'START'
  text1: string
  text2: string
  settings: ComparisonSettings
  strategy: 'lcs' | 'rabin-karp' | 'minhash' | 'simhash' | 'myers' | 'smart'
  pageMap1?: PageMap
  pageMap2?: PageMap
}

interface CancelMessage {
  type: 'CANCEL'
}

type WorkerMessage = ComparisonMessage | CancelMessage

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  if (e.data.type === 'CANCEL') {
    return
  }

  if (e.data.type === 'START') {
    // 验证消息数据
    const data = e.data as ComparisonMessage
    if (!validateMessage(data)) {
      self.postMessage({
        type: 'ERROR',
        message: '消息数据验证失败：缺少必要字段'
      })
      return
    }
    handleComparison(data)
  }
}

/**
 * 验证消息数据完整性
 */
function validateMessage(data: ComparisonMessage): boolean {
  if (!data || typeof data !== 'object') return false
  if (data.type !== 'START') return false
  if (typeof data.text1 !== 'string' || typeof data.text2 !== 'string') return false
  if (!data.settings || typeof data.settings !== 'object') return false
  if (typeof data.settings.minDuplicateWords !== 'number') return false
  
  const validStrategies = ['lcs', 'rabin-karp', 'minhash', 'simhash', 'myers', 'smart']
  if (!validStrategies.includes(data.strategy)) return false
  
  return true
}

function handleComparison(data: ComparisonMessage) {
  const { text1, text2, settings, strategy, pageMap1, pageMap2 } = data
  const startTime = performance.now()
  let cancelled = false

  // 允许取消
  const origOnmessage = self.onmessage
  self.onmessage = function (e: MessageEvent<WorkerMessage>) {
    if (e.data.type === 'CANCEL') {
      cancelled = true
    }
  }

  try {
    let filtered1 = text1
    let filtered2 = text2

    // 步骤1: 条款过滤（如启用）— 所有策略统一使用过滤后的文本
    if (settings.clauseRemovalEnabled) {
      [filtered1, filtered2] = removeCommonClauses(
        text1, text2,
        settings.clauseRemovalGranularity || 5
      )
    }

    let segments: SimilarSegment[] = []
    let similarity = 0

    switch (strategy) {
      case 'lcs':
        // 小文件：使用暴力 LCS 算法
        segments = findSimilarSegments(filtered1, filtered2, settings, 10, pageMap1, pageMap2)
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break
      case 'rabin-karp':
        segments = findSimilarSegmentsRabinKarp(
          filtered1, filtered2, settings, 10,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: '正在分析...' })
            }
          },
          () => cancelled,
          pageMap1,
          pageMap2
        )
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break
      case 'minhash':
        segments = findSimilarSegmentsMinHash(
          filtered1, filtered2, settings,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: 'MinHash 计算中...' })
            }
          },
          () => cancelled,
          pageMap1,
          pageMap2
        )
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break
      case 'simhash':
        // SimHash 快速粗筛 - 用于大文件
        segments = findSimilarSegmentsSimHash(
          filtered1, filtered2, settings,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: 'SimHash 粗筛中...' })
            }
          },
          () => cancelled,
          pageMap1,
          pageMap2
        )
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break
      case 'myers':
        // Myers Diff 精确比对 - 用于中等长度文本
        segments = findSimilarSegmentsMyers(
          filtered1, filtered2, settings,
          settings.minDuplicateWords, 10,
          pageMap1, pageMap2,
          undefined, () => cancelled
        )
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break

      case 'smart':
        // 智能策略 - 自动选择最佳算法
        segments = findSimilarSegmentsSmart(
          filtered1, filtered2, settings,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: '智能分析中...' })
            }
          },
          () => cancelled,
          pageMap1,
          pageMap2
        )
        similarity = estimateSimilarityFromSegments(segments, filtered1.length)
        break
    }

    const elapsed = performance.now() - startTime

    if (!cancelled) {
      self.postMessage({
        type: 'DONE',
        segments,
        similarity,
        elapsed: Math.round(elapsed),
        strategy
      })
    }
  } catch (error) {
    if (!cancelled) {
      self.postMessage({
        type: 'ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack
      })
    }
  } finally {
    self.onmessage = origOnmessage
  }
}

// 基于匹配片段估算整体相似度
function estimateSimilarityFromSegments(segments: SimilarSegment[], textLength: number): number {
  if (textLength === 0 || segments.length === 0) return 0

  const matchedPositions = new Set<number>()
  for (const seg of segments) {
    const start = seg.leftStartIndex ?? 0
    const end = seg.leftEndIndex ?? 0
    for (let i = start; i < end; i++) {
      matchedPositions.add(i)
    }
  }

  return Math.round((matchedPositions.size / textLength) * 100)
}
