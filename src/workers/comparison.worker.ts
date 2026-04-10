import {
  findSimilarSegments,
  findSimilarSegmentsRabinKarp,
  findSimilarSegmentsBlockMatch,
  type ComparisonSettings,
  type SimilarSegment
} from '../utils/textAlgorithms'

interface ComparisonMessage {
  type: 'START'
  text1: string
  text2: string
  settings: ComparisonSettings
  strategy: 'lcs' | 'rabin-karp' | 'block-match'
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
    handleComparison(e.data)
  }
}

function handleComparison(data: ComparisonMessage) {
  const { text1, text2, settings, strategy } = data
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
    let segments: SimilarSegment[] = []
    let similarity = 0

    switch (strategy) {
      case 'lcs':
        segments = findSimilarSegments(text1, text2, settings)
        // LCS 同时计算了所有匹配，相似度可从片段估算
        similarity = segments.length > 0 ? 100 : 0
        break
      case 'rabin-karp':
        segments = findSimilarSegmentsRabinKarp(
          text1, text2, settings, 8,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: '正在分析...' })
            }
          }
        )
        similarity = estimateSimilarityFromSegments(segments, text1.length)
        break
      case 'block-match':
        segments = findSimilarSegmentsBlockMatch(
          text1, text2, settings,
          (progress) => {
            if (!cancelled) {
              self.postMessage({ type: 'PROGRESS', progress, message: '分块匹配中...' })
            }
          }
        )
        similarity = estimateSimilarityFromSegments(segments, text1.length)
        break
    }

    const elapsed = performance.now() - startTime

    if (!cancelled) {
      self.postMessage({
        type: 'DONE',
        segments,
        similarity,
        elapsed: Math.round(elapsed)
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
  // 估算：统计被匹配覆盖的字符比例
  const matchedChars = new Set<number>()
  for (const seg of segments) {
    // 从 leftContent 中提取高亮部分的原始位置（简化估算）
    // 由于内容已被 HTML 包裹，这里使用片段数 * 平均匹配长度估算
    const estimatedMatchLength = segments.reduce((sum, s) => sum + s.leftContent.replace(/<[^>]*>/g, '').length, 0)
    const ratio = Math.min(1, estimatedMatchLength / textLength)
    return Math.round(ratio * 100)
  }
  return 0
}
