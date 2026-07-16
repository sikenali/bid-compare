<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowRightLine,
  RiPercentLine,
  RiCloseLine,
  RiAddLine,
  RiInformationLine
} from '@remixicon/vue'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useComparison } from '../composables/useComparison'
import type { ComparisonSettings } from '../utils/textAlgorithms'
import { removeWatermarks } from '../utils/watermark'
import { BorderBeam } from 'vue3-border-beam'

const router = useRouter()
const { settings } = useSettings()
const { parseFile } = useFileParser()
const {
  isProcessing,
  progress,
  progressMessage,
  parseError,
  runComparison,
  cancelComparison,
  getAbortSignal
} = useComparison()

interface BatchFile {
  file: File | null
  name: string
  size: string
  content: string
}

const files = ref<BatchFile[]>([
  { file: null, name: '', size: '', content: '' },
  { file: null, name: '', size: '', content: '' },
  { file: null, name: '', size: '', content: '' },
])

const addFile = () => {
  if (files.value.length >= 10) return
  files.value.push({ file: null, name: '', size: '', content: '' })
}

const removeFile = (idx: number) => {
  if (files.value.length <= 3) return
  files.value.splice(idx, 1)
}

const handleFileSelect = (idx: number, event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const f = input.files[0]
  if (f.size > 100 * 1024 * 1024) {
    parseError.value = `文件 ${f.name} 超过 100MB 大小限制`
    return
  }
  files.value[idx] = {
    file: f,
    name: f.name,
    size: formatFileSize(f.size),
    content: '',
  }
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

interface BatchResult {
  leftName: string
  rightName: string
  similarity: number
  segmentCount: number
}

const batchResults = ref<BatchResult[]>([])
const showResults = ref(false)
const totalSimilarity = ref(0)

const handleBatchCompare = async () => {
  const validFiles = files.value.filter(f => f.file)
  if (validFiles.length < 2) {
    parseError.value = '请至少上传2个文件'
    return
  }

  isProcessing.value = true
  batchResults.value = []
  showResults.value = false

  try {
    for (let i = 0; i < validFiles.length; i++) {
      progressMessage.value = `正在解析文件 ${i + 1}/${validFiles.length}: ${validFiles[i].name}`
      progress.value = (i / validFiles.length) * 0.3
      const result = await parseFile(validFiles[i].file!, getAbortSignal())
      if (result.error) throw new Error(`${validFiles[i].name}: ${result.error}`)
      let content = result.content
      if (settings.removeWatermark) {
        content = removeWatermarks(content)
      }
      validFiles[i].content = content
    }

    const pairs: { i: number; j: number }[] = []
    for (let i = 0; i < validFiles.length; i++) {
      for (let j = i + 1; j < validFiles.length; j++) {
        pairs.push({ i, j })
      }
    }

    const comparisonSettings: ComparisonSettings = {
      minDuplicateWords: settings.minDupChars,
      textSimilarityThreshold: settings.textSimilarityThreshold,
      ignoreCase: settings.ignoreCase,
      ignorePunctuation: settings.ignorePunctuation,
      ignoreWhitespace: settings.ignoreWhitespace,
      ignoreInvisibleChars: settings.ignoreInvisibleChars,
      ngramSize: settings.ngramSize,
      paragraphCount: settings.paragraphCount,
    }

    const results: BatchResult[] = []

    for (let p = 0; p < pairs.length; p++) {
      const { i, j } = pairs[p]
      progressMessage.value = `正在对比 ${validFiles[i].name} vs ${validFiles[j].name} (${p + 1}/${pairs.length})`
      progress.value = 0.3 + ((p + 1) / pairs.length) * 0.6

      const compResult = await runComparison(
        validFiles[i].content,
        validFiles[j].content,
        comparisonSettings
      )

      results.push({
        leftName: validFiles[i].name,
        rightName: validFiles[j].name,
        similarity: compResult.similarity,
        segmentCount: compResult.segments.length,
      })
    }

    batchResults.value = results
    totalSimilarity.value = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.similarity, 0) / results.length)
      : 0
    showResults.value = true
    progress.value = 1
    progressMessage.value = '对比完成'
  } catch (err) {
    parseError.value = (err as Error).message
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="batch-compare-container">
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">批量文件对比</h1>
          <p class="page-subtitle">同时对比多个文档，快速找出重复内容</p>
        </div>
      </div>
    </div>

    <div class="batch-upload-area">
      <div
        v-for="(f, idx) in files"
        :key="idx"
        class="batch-file-card"
      >
        <div class="batch-file-header">
          <span class="batch-file-label">文件 {{ idx + 1 }}</span>
          <button
            v-if="files.length > 3"
            class="batch-remove-btn"
            @click="removeFile(idx)"
          >
            <RiCloseLine />
          </button>
        </div>
        <label class="batch-file-select">
          <input type="file" accept=".txt,.docx,.doc,.pdf,.xlsx,.xls,.pptx,.ppt" @change="handleFileSelect(idx, $event)" />
          <div class="batch-file-placeholder">
            <RiFileExcelLine class="batch-file-icon" />
            <span>{{ f.file ? f.name : '点击选择文件' }}</span>
          </div>
        </label>
      </div>

      <button
        v-if="files.length < 10"
        class="batch-add-btn"
        @click="addFile"
      >
        <RiAddLine class="batch-add-icon" />
        <span>添加文件</span>
      </button>
    </div>

    <div class="batch-action-area">
      <BorderBeam size="md" color-variant="colorful" theme="dark" :duration="2.4">
        <button
          class="batch-compare-btn"
          :disabled="isProcessing || files.filter(f => f.file).length < 2"
          @click="handleBatchCompare"
        >
          <RiPercentLine class="batch-compare-icon" />
          <span>{{ isProcessing ? '正在处理...' : '开始批量对比' }}</span>
        </button>
      </BorderBeam>
      <div v-if="isProcessing" class="progress-display">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
        </div>
        <span class="progress-text">{{ progressMessage }} {{ Math.round(progress * 100) }}%</span>
      </div>
    </div>

    <div v-if="parseError" class="error-message">{{ parseError }}</div>

    <div v-if="showResults && batchResults.length" class="batch-results-section">
      <div class="results-header">
        <h2>批量对比结果</h2>
        <div class="results-summary">
          <span>对比组数：<strong>{{ batchResults.length }}</strong></span>
          <span>平均相似度：<strong>{{ totalSimilarity }}%</strong></span>
        </div>
      </div>
      <div class="results-table">
        <div class="results-table-header">
          <div class="rt-col idx">#</div>
          <div class="rt-col left">文件A</div>
          <div class="rt-col right">文件B</div>
          <div class="rt-col sim">相似度</div>
          <div class="rt-col seg">雷同处</div>
        </div>
        <div
          v-for="(r, idx) in batchResults"
          :key="idx"
          class="results-table-row"
        >
          <div class="rt-col idx">{{ idx + 1 }}</div>
          <div class="rt-col left">{{ r.leftName }}</div>
          <div class="rt-col right">{{ r.rightName }}</div>
          <div class="rt-col sim">
            <span
              class="sim-badge"
              :class="{ high: r.similarity >= 80, mid: r.similarity >= 50 && r.similarity < 80, low: r.similarity < 50 }"
            >
              {{ r.similarity }}%
            </span>
          </div>
          <div class="rt-col seg">{{ r.segmentCount }} 处</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.batch-compare-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  background: var(--color-parchment);
  font-family: var(--font-ui);
}

.page-header {
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: var(--text-heading-lg);
  font-weight: 700;
  color: var(--color-brown-dark);
  margin: 0 0 4px 0;
  font-family: var(--font-ui);
}

.page-subtitle {
  font-size: var(--text-caption);
  color: var(--color-brown);
  margin: 0;
}

.batch-upload-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
}

.batch-file-card {
  background: var(--color-parchment);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
}

.batch-file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.batch-file-label {
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.batch-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(var(--rgb-cinnabar), 0.1);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-cinnabar);
  font-size: var(--text-body);
  transition: all var(--transition-fast);
}

.batch-remove-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.2);
}

.batch-file-select input[type="file"] {
  display: none;
}

.batch-file-select {
  cursor: pointer;
}

.batch-file-placeholder {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border: 2px dashed var(--color-tan-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
  color: var(--color-brown);
  transition: all var(--transition-fast);
}

.batch-file-placeholder:hover {
  border-color: var(--color-brown-muted);
  background: var(--color-parchment);
}

.batch-file-icon {
  font-size: 20px;
  color: var(--color-cloud-blue);
}

.batch-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 120px;
  border: 2px dashed var(--color-tan-border);
  border-radius: var(--radius-md);
  background: var(--color-parchment);
  cursor: pointer;
  color: var(--color-brown-muted);
  font-size: var(--text-body-sm);
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.batch-add-btn:hover {
  border-color: var(--color-brown-muted);
  background: var(--color-cream-dark);
  color: var(--color-brown);
}

.batch-add-icon {
  font-size: 28px;
}

.batch-action-area {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: 0 4px;
}

.batch-compare-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 14px 32px;
  background: var(--color-cinnabar);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-heading);
  font-weight: 600;
  font-family: var(--font-ui);
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-cinnabar);
}

.batch-compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-compare-btn:hover:not(:disabled) {
  background: var(--color-cinnabar-dark);
  transform: translateY(-1px);
}

.batch-compare-icon {
  font-size: 18px;
}

.progress-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--color-cream-darker);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-jade-light);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.progress-text {
  font-size: var(--text-caption);
  color: var(--color-brown);
  white-space: nowrap;
}

.error-message {
  padding: var(--spacing-3) var(--spacing-4);
  background: rgba(var(--rgb-cinnabar), 0.08);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.2);
  border-radius: var(--radius-md);
  color: var(--color-cinnabar);
  font-size: var(--text-body-sm);
}

.batch-results-section {
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  overflow: hidden;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--color-parchment);
  border-bottom: 1px solid var(--color-tan-border);
}

.results-header h2 {
  margin: 0;
  font-size: var(--text-heading);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.results-summary {
  display: flex;
  gap: var(--spacing-4);
  font-size: var(--text-body-sm);
  color: var(--color-brown);
}

.results-table {
  display: flex;
  flex-direction: column;
}

.results-table-header {
  display: flex;
  padding: 10px 20px;
  background: var(--color-cream-darker);
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--color-brown);
  font-family: var(--font-ui);
  border-bottom: 1px solid var(--color-tan-light);
}

.results-table-row {
  display: flex;
  padding: 12px 20px;
  font-size: var(--text-body-sm);
  color: var(--color-brown-dark);
  border-bottom: 1px solid var(--color-tan-light);
}

.results-table-row:last-child {
  border-bottom: none;
}

.rt-col.idx { width: 40px; flex-shrink: 0; }
.rt-col.left { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt-col.right { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt-col.sim { width: 80px; text-align: center; flex-shrink: 0; }
.rt-col.seg { width: 80px; text-align: center; flex-shrink: 0; }

.sim-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--text-body-sm);
  font-family: var(--font-ui);
}

.sim-badge.high {
  background: rgba(var(--rgb-cinnabar), 0.12);
  color: var(--color-cinnabar);
}

.sim-badge.mid {
  background: rgba(var(--rgb-gold-dark), 0.15);
  color: var(--color-gold-dark);
}

.sim-badge.low {
  background: rgba(var(--rgb-cloud-blue), 0.1);
  color: var(--color-cloud-blue);
}

@media (max-width: 768px) {
  .batch-compare-container {
    gap: var(--spacing-3);
  }

  .page-header {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .page-title {
    font-size: var(--text-heading);
  }

  .batch-upload-area {
    padding: var(--spacing-3);
    gap: var(--spacing-2);
  }

  .batch-file-card {
    min-height: 44px;
  }

  .batch-file-placeholder {
    min-height: 44px;
  }

  .batch-action-area {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-compare-btn {
    justify-content: center;
    min-height: 44px;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
  }

  .results-summary {
    width: 100%;
    justify-content: space-between;
  }

  .results-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .results-table-header,
  .results-table-row {
    min-width: 500px;
  }
}

@media (max-width: 480px) {
  .batch-upload-area {
    grid-template-columns: 1fr 1fr;
  }

  .batch-file-card {
    padding: var(--spacing-2);
  }

  .batch-add-btn {
    min-height: 80px;
  }

  .results-table-header,
  .results-table-row {
    min-width: 440px;
    padding: 8px 12px;
    font-size: var(--text-caption);
  }

  .rt-col.sim,
  .rt-col.seg {
    width: 60px;
  }
}
</style>
