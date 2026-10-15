<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiFileTextLine,
  RiAddLine,
  RiCloseLine,
  RiRestartLine,
  RiPercentLine,
} from '@remixicon/vue'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useComparison } from '../composables/useComparison'
import { useToast } from '../composables/useToast'
import type { ComparisonSettings } from '../utils/textAlgorithms'
import { removeWatermarks } from '../utils/watermark'
import { UiSwitch } from '../components/ui'

const router = useRouter()
const { settings, saveSettings } = useSettings()
const { parseFile } = useFileParser()
const { show: showToast } = useToast()
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

const maxFiles = computed(() => Math.max(3, settings.maxMultiFileCount))

const files = ref<BatchFile[]>([
  { file: null, name: '', size: '', content: '' },
  { file: null, name: '', size: '', content: '' },
  { file: null, name: '', size: '', content: '' },
])

const addFile = () => {
  if (files.value.length >= maxFiles.value) return
  files.value.push({ file: null, name: '', size: '', content: '' })
}

const removeFile = (idx: number) => {
  if (files.value.length <= 2) return
  files.value.splice(idx, 1)
}

const handleFileSelect = (idx: number, event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const f = input.files[0]
  if (f.size > 100 * 1024 * 1024) {
    showToast(`文件 ${f.name} 超过 100MB 大小限制`, 'error')
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

const validFiles = computed(() => files.value.filter(f => f.file))
const canCompare = computed(() => validFiles.value.length >= 2)

const handleBatchCompare = async () => {
  if (!canCompare.value) {
    showToast('请至少上传2个文件', 'warning')
    return
  }

  isProcessing.value = true
  batchResults.value = []
  showResults.value = false

  try {
    for (let i = 0; i < validFiles.value.length; i++) {
      progressMessage.value = `正在解析文件 ${i + 1}/${validFiles.value.length}: ${validFiles.value[i].name}`
      progress.value = (i / validFiles.value.length) * 0.3
      const result = await parseFile(validFiles.value[i].file!, getAbortSignal())
      if (result.error) throw new Error(`${validFiles.value[i].name}: ${result.error}`)
      let content = result.content
      if (settings.removeWatermark) {
        content = removeWatermarks(content)
      }
      validFiles.value[i].content = content
    }

    const pairs: { i: number; j: number }[] = []
    for (let i = 0; i < validFiles.value.length; i++) {
      for (let j = i + 1; j < validFiles.value.length; j++) {
        pairs.push({ i, j })
      }
    }

    const comparisonSettings: ComparisonSettings = {
      minDuplicateWords: settings.minDupChars,
      textSimilarityThreshold: settings.textSimilarityThreshold,
      imageSimilarityThreshold: settings.imageSimilarityThreshold,
      ignoreCase: settings.ignoreCase,
      ignorePunctuation: settings.ignorePunctuation,
      ignoreWhitespace: settings.ignoreWhitespace,
      ignoreInvisibleChars: settings.ignoreInvisibleChars,
      ngramSize: settings.ngramSize,
      paragraphCount: settings.paragraphCount,
      maxResults: settings.maxResults,
      clauseRemovalEnabled: settings.clauseRemovalEnabled,
      clauseRemovalGranularity: settings.clauseRemovalGranularity,
    }

    const results: BatchResult[] = []

    for (let p = 0; p < pairs.length; p++) {
      const { i, j } = pairs[p]
      progressMessage.value = `正在对比 ${validFiles.value[i].name} vs ${validFiles.value[j].name} (${p + 1}/${pairs.length})`
      progress.value = 0.3 + ((p + 1) / pairs.length) * 0.6

      const compResult = await runComparison(
        validFiles.value[i].content,
        validFiles.value[j].content,
        comparisonSettings
      )

      results.push({
        leftName: validFiles.value[i].name,
        rightName: validFiles.value[j].name,
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
    showToast(`批量对比完成，共 ${results.length} 组对比`, 'success')
  } catch (err) {
    showToast((err as Error).message || '对比失败', 'error')
  } finally {
    isProcessing.value = false
  }
}

const handleCancel = () => {
  cancelComparison()
}

const clearAll = () => {
  files.value = [
    { file: null, name: '', size: '', content: '' },
    { file: null, name: '', size: '', content: '' },
    { file: null, name: '', size: '', content: '' },
  ]
  batchResults.value = []
  showResults.value = false
  showToast('已清除所有文件', 'success')
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="batch-compare-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span class="current">批量对比</span>
          </div>
          <div class="header-title">
            <h1>批量文件对比</h1>
            <p>同时对比多个文档，快速找出重复内容</p>
          </div>
        </div>
        <button class="reset-button" @click="clearAll">
          <RiRestartLine class="icon" />清除全部
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title-row">
        <div class="card-title">文件上传</div>
        <div class="file-count">
          <span class="count-label">已选择</span>
          <span class="count-value">{{ validFiles.length }}</span>
          <span class="count-label">/ {{ maxFiles }} 个文件</span>
        </div>
      </div>

      <div class="batch-upload-grid">
        <div
          v-for="(f, idx) in files"
          :key="idx"
          class="batch-file-card"
        >
          <div class="batch-file-header">
            <span class="batch-file-label">文件 {{ idx + 1 }}</span>
            <button
              v-if="files.length > 2"
              class="batch-remove-btn"
              @click="removeFile(idx)"
            >
              <RiCloseLine />
            </button>
          </div>
          <label class="batch-file-select">
            <input type="file" accept=".txt,.docx,.doc,.pdf,.xlsx,.xls,.pptx,.ppt" @change="handleFileSelect(idx, $event)" />
            <div class="batch-file-placeholder" :class="{ 'has-file': f.file }">
              <RiFileTextLine class="batch-file-icon" />
              <span class="file-name">{{ f.file ? f.name : '点击选择文件' }}</span>
              <span v-if="f.file" class="file-size">{{ f.size }}</span>
            </div>
          </label>
        </div>

        <button
          v-if="files.length < maxFiles"
          class="batch-add-btn"
          @click="addFile"
        >
          <RiAddLine class="batch-add-icon" />
          <span>添加文件</span>
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title">对比选项</div>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">水印文字剔除</div>
          <div class="setting-desc">解析时自动过滤常见水印文字</div>
        </div>
        <UiSwitch v-model="settings.removeWatermark" @update:model-value="saveSettings()" />
      </div>
    </div>

    <div class="action-area">
      <button
        class="batch-compare-btn"
        :disabled="isProcessing || !canCompare"
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

      <button v-if="isProcessing" class="cancel-btn" @click="handleCancel">
        取消
      </button>
    </div>

    <div v-if="showResults && batchResults.length" class="section-card">
      <div class="card-title-row">
        <div class="card-title">对比结果</div>
        <div class="results-summary">
          <span>对比组数：<strong>{{ batchResults.length }}</strong></span>
          <span>平均相似度：<strong class="similarity-value">{{ totalSimilarity }}%</strong></span>
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
.batch-compare-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 页面头部 */
.page-header-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px;
  padding: 20px 24px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}
.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.sep { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 {
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text-primary, #1F1D1A);
  margin: 12px 0 0 0;
  letter-spacing: -0.5px;
  font-family: "SourceHanSans-Bold", var(--font-family-cn);
  line-height: 1.2;
}
.header-title p {
  font-size: 15px;
  color: var(--color-text-secondary, #6E6A60);
  margin: 8px 0 0 0;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 48px;
  border: 0.7px solid var(--color-border, #E5DFD3);
  background-color: var(--color-bg-white, #FFFFFF);
  border-radius: 12px;
  font-size: 15px;
  color: var(--color-text-body, #3A3A3A);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.reset-button:hover { background-color: var(--color-bg-secondary, #F7F3EA); }
.reset-button .icon { font-family: "remixicon", sans-serif; font-style: normal; font-size: 18px; }

/* 区块卡片 */
.section-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px;
  padding: 24px;
}
.card-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 文件计数 */
.file-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 14px;
}
.count-label { color: var(--color-text-muted, #8A8578); }
.count-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary, #C0392B);
  font-family: "SourceHanSans-Bold", var(--font-family-cn);
}

/* 批量上传网格 */
.batch-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.batch-file-card {
  background: var(--color-bg-card, #FCFBF8);
  border: 1px solid var(--color-border-soft, #EDE9E0);
  border-radius: 12px;
  padding: 16px;
}

.batch-file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-file-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}

.batch-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(192, 57, 43, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: var(--color-primary, #C0392B);
  font-size: 14px;
  transition: all 0.2s;
}
.batch-remove-btn:hover { background: rgba(192, 57, 43, 0.2); }

.batch-file-select input[type="file"] { display: none; }
.batch-file-select { cursor: pointer; }

.batch-file-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border: 2px dashed var(--color-border, #E5DFD3);
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-text-muted, #8A8578);
  transition: all 0.2s;
}
.batch-file-placeholder:hover {
  border-color: var(--color-primary, #C0392B);
  background: rgba(192, 57, 43, 0.03);
  color: var(--color-primary, #C0392B);
}
.batch-file-placeholder.has-file {
  border-style: solid;
  border-color: var(--color-border-soft, #EDE9E0);
  background: var(--color-bg-white, #FFFFFF);
}
.batch-file-icon {
  font-size: 28px;
  color: #4A90D9;
}
.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
  text-align: center;
  word-break: break-all;
  line-height: 1.4;
}
.file-size {
  font-size: 11px;
  color: var(--color-text-muted, #8A8578);
}

.batch-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  border: 2px dashed var(--color-border, #E5DFD3);
  border-radius: 12px;
  background: var(--color-bg-card, #FCFBF8);
  cursor: pointer;
  color: var(--color-text-muted, #8A8578);
  font-size: 14px;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
  transition: all 0.2s;
}
.batch-add-btn:hover {
  border-color: var(--color-primary, #C0392B);
  background: rgba(192, 57, 43, 0.03);
  color: var(--color-primary, #C0392B);
}
.batch-add-icon { font-size: 32px; }

/* 操作区域 */
.action-area {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 4px;
}

.batch-compare-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: var(--color-primary, #C0392B);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
}
.batch-compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.batch-compare-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(192, 57, 43, 0.4);
}
.batch-compare-icon { font-size: 20px; }

.progress-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: var(--color-bg-secondary, #F7F3EA);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-primary, #C0392B);
  border-radius: 4px;
  transition: width 0.3s;
}
.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary, #6E6A60);
  text-align: center;
}

.cancel-btn {
  padding: 12px 24px;
  background: var(--color-bg-card, #FCFBF8);
  color: var(--color-text-body, #3A3A3A);
  border: 1px solid var(--color-border-soft, #EDE9E0);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
  transition: all 0.2s;
}
.cancel-btn:hover {
  background: var(--color-bg-secondary, #F7F3EA);
  color: var(--color-text-primary, #1F1D1A);
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.setting-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
}
.setting-desc {
  font-size: 13px;
  color: var(--color-text-muted, #8A8578);
}

/* 结果表格 */
.results-summary {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: var(--color-text-secondary, #6E6A60);
}
.results-summary strong {
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
}
.similarity-value {
  color: var(--color-primary, #C0392B);
  font-size: 16px;
}

.results-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-soft, #EDE9E0);
  border-radius: 12px;
  overflow: hidden;
}

.results-table-header {
  display: flex;
  padding: 12px 20px;
  background: var(--color-bg-card, #FCFBF8);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #6E6A60);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
  border-bottom: 1px solid var(--color-border-soft, #EDE9E0);
}

.results-table-row {
  display: flex;
  padding: 14px 20px;
  font-size: 14px;
  color: var(--color-text-body, #3A3A3A);
  border-bottom: 1px solid var(--color-border-soft, #EDE9E0);
  transition: background 0.15s;
}
.results-table-row:last-child { border-bottom: none; }
.results-table-row:hover { background: var(--color-bg-card, #FCFBF8); }

.rt-col.idx { width: 40px; flex-shrink: 0; }
.rt-col.left { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt-col.right { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt-col.sim { width: 80px; text-align: center; flex-shrink: 0; }
.rt-col.seg { width: 80px; text-align: center; flex-shrink: 0; }

.sim-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.sim-badge.high {
  background: rgba(192, 57, 43, 0.1);
  color: var(--color-primary, #C0392B);
}
.sim-badge.mid {
  background: rgba(218, 165, 32, 0.15);
  color: #D97706;
}
.sim-badge.low {
  background: rgba(74, 144, 217, 0.1);
  color: #4A90D9;
}

@media (max-width: 768px) {
  .batch-compare-view { gap: 16px; }
  .page-header-card { padding: 16px 20px; }
  .header-title h1 { font-size: 22px; }
  .section-card { padding: 16px; }
  .batch-upload-grid { grid-template-columns: 1fr 1fr; }
  .action-area { flex-direction: column; align-items: stretch; }
  .batch-compare-btn { justify-content: center; }
  .results-table { overflow-x: auto; }
  .results-table-header, .results-table-row { min-width: 480px; }
}
@media (max-width: 480px) {
  .batch-upload-grid { grid-template-columns: 1fr; }
  .batch-add-btn { min-height: 80px; }
  .results-table-header, .results-table-row { min-width: 400px; padding: 10px 12px; font-size: 13px; }
  .rt-col.sim, .rt-col.seg { width: 60px; }
}
</style>
