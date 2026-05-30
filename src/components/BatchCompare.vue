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
          <input type="file" accept=".txt,.docx,.pdf,.xlsx,.pptx" @change="handleFileSelect(idx, $event)" />
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
      <button
        class="batch-compare-btn"
        :disabled="isProcessing || files.filter(f => f.file).length < 2"
        @click="handleBatchCompare"
      >
        <RiPercentLine class="batch-compare-icon" />
        <span>{{ isProcessing ? '正在处理...' : '开始批量对比' }}</span>
      </button>
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
  gap: 16px;
  background-color: rgba(248, 244, 233, 1);
  font-family: SourceHanSans, -apple-system, sans-serif;
}

.page-header {
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 4px 0;
  font-family: SourceHanSans-Bold;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(101, 70, 40, 1);
  margin: 0;
}

.batch-upload-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.batch-file-card {
  background: rgba(248, 244, 233, 0.5);
  border: 1px solid rgba(166, 124, 82, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.batch-file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.batch-file-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.batch-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: rgba(196, 30, 58, 1);
  font-size: 14px;
  transition: all 0.2s;
}

.batch-remove-btn:hover {
  background: rgba(196, 30, 58, 0.2);
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
  gap: 8px;
  padding: 12px;
  border: 2px dashed rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(101, 70, 40, 0.7);
  transition: all 0.2s;
}

.batch-file-placeholder:hover {
  border-color: rgba(166, 124, 82, 0.6);
  background: rgba(248, 244, 233, 0.3);
}

.batch-file-icon {
  font-size: 20px;
  color: rgba(46, 89, 132, 0.6);
}

.batch-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 120px;
  border: 2px dashed rgba(166, 124, 82, 0.3);
  border-radius: 8px;
  background: rgba(248, 244, 233, 0.3);
  cursor: pointer;
  color: rgba(101, 70, 40, 0.6);
  font-size: 13px;
  font-family: SourceHanSans-Medium;
  transition: all 0.2s;
}

.batch-add-btn:hover {
  border-color: rgba(166, 124, 82, 0.6);
  background: rgba(248, 244, 233, 0.5);
  color: rgba(101, 70, 40, 0.9);
}

.batch-add-icon {
  font-size: 28px;
}

.batch-action-area {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 4px;
}

.batch-compare-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.35);
}

.batch-compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-compare-btn:hover:not(:disabled) {
  box-shadow: 0 8px 24px rgba(139, 0, 0, 0.45);
  transform: translateY(-2px);
}

.batch-compare-icon {
  font-size: 18px;
}

.progress-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(166, 124, 82, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139, 0, 0, 1), rgba(196, 30, 58, 1));
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: rgba(101, 70, 40, 1);
  white-space: nowrap;
}

.error-message {
  padding: 12px 16px;
  background: rgba(196, 30, 58, 0.08);
  border: 1px solid rgba(196, 30, 58, 0.2);
  border-radius: 8px;
  color: rgba(196, 30, 58, 1);
  font-size: 13px;
}

.batch-results-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  overflow: hidden;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(248, 244, 233, 0.5);
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.results-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.results-summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: rgba(101, 70, 40, 1);
}

.results-table {
  display: flex;
  flex-direction: column;
}

.results-table-header {
  display: flex;
  padding: 10px 20px;
  background: rgba(245, 238, 226, 0.6);
  font-size: 13px;
  font-weight: 600;
  color: rgba(101, 70, 40, 1);
  font-family: SourceHanSans-SemiBold;
  border-bottom: 1px solid rgba(166, 124, 82, 0.1);
}

.results-table-row {
  display: flex;
  padding: 12px 20px;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  border-bottom: 1px solid rgba(166, 124, 82, 0.06);
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
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
  font-family: SourceHanSans-SemiBold;
}

.sim-badge.high {
  background: rgba(196, 30, 58, 0.12);
  color: rgba(196, 30, 58, 1);
}

.sim-badge.mid {
  background: rgba(212, 160, 60, 0.15);
  color: rgba(180, 130, 40, 1);
}

.sim-badge.low {
  background: rgba(46, 89, 132, 0.1);
  color: rgba(46, 89, 132, 1);
}
</style>
