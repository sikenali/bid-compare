import { ref } from 'vue'
import {
  selectStrategy,
  findSimilarSegments,
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
        const segments = findSimilarSegments(text1, text2, settings)
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
        // Worker 不可用，降级到主线程
        console.warn('Worker 不可用，使用主线程 LCS')
        isProcessing.value = false
        canCancel.value = false
        const segments = findSimilarSegments(text1, text2, settings)
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
