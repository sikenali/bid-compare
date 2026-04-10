import {
  findSimilarSegments,
  findSimilarSegmentsRabinKarp,
  findSimilarSegmentsBlockMatch,
  calculateTextSimilarity,
  type ComparisonSettings,
  type SimilarSegment
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
    let segments: SimilarSegment[] = []
    let similarity = 0

    switch (strategy) {
      case 'lcs':
        segments = findSimilarSegments(text1, text2, settings)
        similarity = calculateTextSimilarity(text1, text2, settings)
        break
      case 'rabin-karp':
        segments = findSimilarSegmentsRabinKarp(
          text1, text2, settings, 8,
          (progress) => {
            self.postMessage({ type: 'PROGRESS', progress, message: '正在分析...' })
          }
        )
        similarity = calculateTextSimilarity(text1, text2, settings)
        break
      case 'block-match':
        segments = findSimilarSegmentsBlockMatch(
          text1, text2, settings,
          (progress) => {
            self.postMessage({ type: 'PROGRESS', progress, message: '分块匹配中...' })
          }
        )
        similarity = calculateTextSimilarity(text1, text2, settings)
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
    self.postMessage({
      type: 'ERROR',
      message: (error as Error).message,
      stack: (error as Error).stack
    })
  }
}
