import { ref, onUnmounted } from 'vue'
import {
  selectStrategy,
  selectSmartStrategy,
  findSimilarSegments,
  findSimilarSegmentsMyers,
  calculateTextSimilarity,
  type SimilarSegment,
  type ComparisonSettings,
  type ComparisonStrategy,
  type PageMap
} from '../utils/textAlgorithms'
import ComparisonWorker from '../workers/comparison.worker?worker'

export function useComparison() {
  const isProcessing = ref(false)
  const progress = ref(0)
  const progressMessage = ref('')
  const canCancel = ref(false)
  const parseError = ref('')

  onUnmounted(cleanup)

  let currentWorker: Worker | null = null
  let timeoutId: number | null = null
  let abortController: AbortController | null = null

  const WORKER_TIMEOUT_BASE = 60_000
  const WORKER_TIMEOUT_PER_CHAR = 0.1
  const MAX_WORKER_TIMEOUT = 120_000

  async function runComparison(
    text1: string,
    text2: string,
    settings: ComparisonSettings,
    pageMap1?: PageMap,
    pageMap2?: PageMap,
    forceStrategy?: ComparisonStrategy
  ): Promise<{ segments: SimilarSegment[]; similarity: number }> {
    const textLength = Math.max(text1.length, text2.length)

    // 硬限制
    if (textLength >= 1_000_000) {
      throw new Error(`文件内容过大（${(textLength / 10000).toFixed(1)} 万字），建议拆分后对比`)
    }

    abortController = new AbortController()
    isProcessing.value = true
    progress.value = 0
    progressMessage.value = '准备中...'
    canCancel.value = false
    parseError.value = ''

    // 使用强制策略或智能策略选择
    const strategy = forceStrategy || selectSmartStrategy(text1, text2)

    try {
      // 小文件和中等文件在主线程处理
      if (strategy === 'lcs' || strategy === 'myers') {
        progressMessage.value = strategy === 'lcs' ? '正在对比...' : '精确比对中...'
        const onCancel = () => abortController?.signal.aborted ?? false

        // 如果启用条款剔除，先过滤条款再比对
        let effectiveText1 = text1
        let effectiveText2 = text2

        if (settings.clauseRemovalEnabled) {
          const [filtered1, filtered2] = removeCommonClauses(
            text1, text2,
            settings.clauseRemovalGranularity || 5
          )
          effectiveText1 = filtered1
          effectiveText2 = filtered2
        }

        const segments = strategy === 'lcs'
          ? findSimilarSegments(effectiveText1, effectiveText2, settings, 10, pageMap1, pageMap2)
          : findSimilarSegmentsMyers(
              effectiveText1, effectiveText2, settings,
              settings.minDuplicateWords, 10,
              pageMap1, pageMap2,
              undefined, onCancel
            )

        const similarity = calculateTextSimilarity(text1, text2, settings)
        isProcessing.value = false
        return { segments, similarity }
      } else {
        // 大文件：Worker
        return runWorkerComparison(text1, text2, settings, strategy, pageMap1, pageMap2)
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
    strategy: ComparisonStrategy,
    pageMap1?: PageMap,
    pageMap2?: PageMap
  ): Promise<{ segments: SimilarSegment[]; similarity: number }> {
    const textLength = Math.max(text1.length, text2.length)
    return new Promise((resolve, reject) => {
      try {
        const worker = new ComparisonWorker()
        currentWorker = worker
        canCancel.value = true
        
        // 根据策略设置不同的进度消息
        switch (strategy) {
          case 'rabin-karp':
            progressMessage.value = '正在分析...'
            break
          case 'minhash':
            progressMessage.value = 'MinHash 计算中...'
            break
          case 'simhash':
            progressMessage.value = 'SimHash 粗筛中...'
            break
          case 'smart':
            progressMessage.value = '智能分析中...'
            break
          default:
            progressMessage.value = '正在分析...'
        }

        // 超时保护
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
          } else {
            cleanup()
            reject(new Error(`Worker 返回未知消息类型: ${e.data.type}`))
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
          strategy,
          pageMap1,
          pageMap2
        })
      } catch (error) {
        // Worker 不可用，降级到主线程（仅限小文件）
        const textLength = Math.max(text1.length, text2.length)
        if (textLength >= 20_000) {
          cleanup()
          reject(new Error('Worker 不可用且文件过大，无法降级处理'))
          return
        }
        isProcessing.value = false
        canCancel.value = false
        const segments = findSimilarSegments(text1, text2, settings, 10, pageMap1, pageMap2)
        const similarity = calculateTextSimilarity(text1, text2, settings)
        resolve({ segments, similarity })
      }
    })
  }

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

  function getAbortSignal(): AbortSignal | undefined {
    return abortController?.signal
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
    cancelComparison,
    getAbortSignal
  }
}
