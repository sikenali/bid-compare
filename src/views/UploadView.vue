<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useComparison } from '../composables/useComparison'
import { useToast } from '../composables/useToast'
import { useRecentRecords } from '../composables/useRecentRecords'
import { useAIModel } from '../composables/useAIModel'
import { removeCommonClauses } from '../utils/textAlgorithms'
import { removeWatermarks } from '../utils/watermark'
import { htmlToMarkdown } from '../utils/sanitize'
import { storeCompareResult, deleteCompareResult } from '../utils/compareResultStore'
import type { ComparisonSettings, SimilarSegment } from '../utils/textAlgorithms'

const router = useRouter()
const route = useRoute()
const { parseFile } = useFileParser()
const { settings } = useSettings()
const { show: showToast } = useToast()
const { addRecentRecord } = useRecentRecords('fileCompare')
const {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  runComparison,
  cancelComparison,
} = useComparison()

interface FileInfo {
  file: File | null
  name: string
  size: string
  type: string
}

const leftFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' })
const rightFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' })

const leftFileContent = ref('')
const rightFileContent = ref('')

const step = ref(0)
const stepDone = ref([false, false, false])
const leftFileInput = ref<HTMLInputElement | null>(null)
const rightFileInput = ref<HTMLInputElement | null>(null)

const formatTags = [
  { label: 'W', color: '#2B579A' },
  { label: 'X', color: '#217346' },
  { label: 'P', color: '#C0392B' },
  { label: 'PD', color: '#B03A2E' },
  { label: 'MD', color: '#4A6FA5' },
  { label: 'TX', color: '#5A5750' },
]

const bothReady = computed(() => !!leftFileInfo.value.file && !!rightFileInfo.value.file)

const progressText = computed(() => {
  if (step.value === 0) return '解析文件中…'
  if (step.value === 1) return '提取文字中…'
  if (step.value === 2) return '比对识别中…'
  return ''
})

function openFilePicker(side: 'left' | 'right') {
  if (side === 'left') leftFileInput.value?.click()
  else rightFileInput.value?.click()
}

function handleFileSelect(side: 'left' | 'right', e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 50 * 1024 * 1024) {
    showToast('文件大小不能超过 50MB', 'warning')
    return
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const sizeStr = file.size > 1024 * 1024
    ? (file.size / 1024 / 1024).toFixed(1) + ' MB'
    : (file.size / 1024).toFixed(1) + ' KB'

  if (side === 'left') {
    leftFileInfo.value = { file, name: file.name, size: sizeStr, type: ext }
  } else {
    rightFileInfo.value = { file, name: file.name, size: sizeStr, type: ext }
  }

  input.value = ''
}

function handleDrop(side: 'left' | 'right', e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  handleFileSelect(side, { target: { files: [file] } } as unknown as Event)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

async function handleCompare() {
  if (!bothReady.value || isProcessing.value) return

  try {
    step.value = 0
    stepDone.value = [false, false, false]

    let lText = await parseFile(leftFileInfo.value.file!)
    let rText = await parseFile(rightFileInfo.value.file!)
    stepDone.value[0] = true

    if (settings.removeWatermark) {
      lText = removeWatermarks(lText)
      rText = removeWatermarks(rText)
    }
    stepDone.value[1] = true

    step.value = 2

    const compareSettings: ComparisonSettings = {
      ngramSize: settings.ngramSize,
      minDuplicateWords: settings.minDuplicateWords,
      textSimilarityThreshold: settings.textSimilarityThreshold,
      imageSimilarityThreshold: settings.imageSimilarityThreshold,
      maxResults: settings.maxResults,
      ignorePunctuation: settings.ignorePunctuation,
      ignoreWhitespace: settings.ignoreWhitespace,
      ignoreCase: settings.ignoreCase,
      ignoreInvisibleChars: settings.ignoreInvisibleChars,
      clauseRemovalEnabled: settings.clauseRemovalEnabled,
      clauseRemovalGranularity: settings.clauseRemovalGranularity,
    }

    const result = await runComparison(lText, rText, compareSettings, cancelComparison)
    stepDone.value[2] = true

    if (!result) {
      showToast('对比被取消', 'info')
      return
    }

    if (result.parseError) {
      showToast(result.parseError, 'error')
      return
    }

    const textSimilarity = Math.round(result.textSimilarity * 100) + '%'

    const comparisonResult = {
      segments: result.similarSegments,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      textSimilarity: textSimilarity,
      similarSegmentsCount: result.similarSegments.length,
      leftTotalPages: 1,
      rightTotalPages: 1,
      leftFileContent: lText,
      rightFileContent: rText,
    }

    const resultId = storeCompareResult(comparisonResult)

    addRecentRecord({
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarity: textSimilarity,
      similarSegments: result.similarSegments,
    })

    showToast('对比完成', 'success')
    router.push({ path: '/file-compare-result', query: { resultId, t: Date.now() } })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      showToast('对比已取消', 'info')
    } else {
      showToast(`对比失败: ${error.message}`, 'error')
    }
  }
}

function handleCancel() {
  if (canCancel.value) {
    cancelComparison()
  }
}
</script>

<template>
  <div class="upload-page">
    <div class="upload-body">
      <div class="upload-area">
        <div class="card-row">
          <!-- 原始版本上传卡片 -->
          <div
            class="upload-card"
            @click="openFilePicker('left')"
            @drop="handleDrop('left', $event)"
            @dragover="handleDragOver"
          >
            <input
              ref="leftFileInput"
              type="file"
              accept=".doc,.docx,.xls,.xlsx,.pdf,.md,.txt"
              style="display:none"
              @change="handleFileSelect('left', $event)"
            />
            <div class="upload-icon-circle">
              <RiUploadLine v-if="!leftFileInfo.file" :size="34" color="#8A8578" />
              <RiFileWordLine v-else-if="leftFileInfo.type === 'doc' || leftFileInfo.type === 'docx'" :size="34" color="#2B579A" />
              <RiFileLine v-else :size="34" color="#4E9B7A" />
            </div>
            <div class="upload-prompt">
              {{ leftFileInfo.file ? leftFileInfo.name : '点击选择或拖拽目标文件' }}
            </div>
            <div class="upload-label" :style="{ color: leftFileInfo.file ? '#4E9B7A' : '#C0392B' }">
              目标文件 · 原始版本{{ leftFileInfo.file ? ' · ' + leftFileInfo.size : '' }}
            </div>
            <div class="format-tags">
              <div v-for="tag in formatTags" :key="tag.label" class="format-tag" :style="{ background: tag.color }">
                {{ tag.label }}
              </div>
            </div>
          </div>

          <!-- VS 标识 -->
          <div class="vs-badge">
            <span>VS</span>
          </div>

          <!-- 修订版本上传卡片 -->
          <div
            class="upload-card"
            @click="openFilePicker('right')"
            @drop="handleDrop('right', $event)"
            @dragover="handleDragOver"
          >
            <input
              ref="rightFileInput"
              type="file"
              accept=".doc,.docx,.xls,.xlsx,.pdf,.md,.txt"
              style="display:none"
              @change="handleFileSelect('right', $event)"
            />
            <div class="upload-icon-circle">
              <RiUploadLine v-if="!rightFileInfo.file" :size="34" color="#8A8578" />
              <RiFileWordLine v-else-if="rightFileInfo.type === 'doc' || rightFileInfo.type === 'docx'" :size="34" color="#2B579A" />
              <RiFileLine v-else :size="34" color="#4E9B7A" />
            </div>
            <div class="upload-prompt">
              {{ rightFileInfo.file ? rightFileInfo.name : '点击选择或拖拽目标文件' }}
            </div>
            <div class="upload-label" :style="{ color: rightFileInfo.file ? '#4E9B7A' : '#6E6A60' }">
              目标文件 · 修订版本{{ rightFileInfo.file ? ' · ' + rightFileInfo.size : '' }}
            </div>
            <div class="format-tags">
              <div v-for="tag in formatTags" :key="tag.label" class="format-tag" :style="{ background: tag.color }">
                {{ tag.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤条 -->
        <div class="step-bar">
          <div class="step-item" :class="{ done: stepDone[0], current: step === 0 && isProcessing }">
            <div class="step-number">1</div>
            <span class="step-text">解析文件</span>
          </div>
          <div class="step-line"></div>
          <div class="step-item" :class="{ done: stepDone[1], current: step === 1 && isProcessing }">
            <div class="step-number">2</div>
            <span class="step-text">提取文字</span>
          </div>
          <div class="step-line"></div>
          <div class="step-item" :class="{ done: stepDone[2], current: step === 2 && isProcessing }">
            <div class="step-number">3</div>
            <span class="step-text">比对识别</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-area">
          <button
            class="compare-btn"
            :disabled="!bothReady || isProcessing"
            @click="handleCompare"
          >
            <span v-if="!isProcessing">一键对比</span>
            <span v-else>{{ progressText }}</span>
          </button>
          <button
            v-if="isProcessing && canCancel"
            class="cancel-btn"
            @click="handleCancel"
          >
            取消
          </button>
        </div>
      </div>

      <!-- 悬浮工具栏 -->
      <div class="floating-toolbar">
        <button class="toolbar-nav-btn" :class="{ active: route.path === '/file-compare' }" @click="router.push('/file-compare')" title="文件对比">
          <RiExchangeLine :size="22" />
          <span class="toolbar-nav-label">文件对比</span>
        </button>
        <button class="toolbar-nav-btn" :class="{ active: route.path === '/property-check' }" @click="router.push('/property-check')" title="属性检查">
          <RiListCheck :size="22" />
          <span class="toolbar-nav-label">属性检查</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.upload-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px 40px;
  gap: 40px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.card-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.upload-card {
  width: 450px;
  height: 370px;
  background: #FFFFFF;
  border: 0.7px solid rgba(229, 223, 211, 1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.upload-card:hover {
  border-color: var(--color-cinnabar, #C0392B);
  box-shadow: 0 4px 20px rgba(192, 57, 43, 0.08);
}

.upload-card:has(input) {
  border-color: transparent;
}

.upload-icon-circle {
  width: 82px;
  height: 82px;
  background: #F7F3EA;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.upload-prompt {
  font-size: 18px;
  font-family: var(--font-ui);
  color: #1F1D1A;
  text-align: center;
  max-width: 198px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.upload-label {
  font-size: 15px;
  font-family: var(--font-ui);
  margin-top: 16px;
  text-align: center;
}

.format-tags {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.format-tag {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 9px;
  font-weight: 700;
  font-family: var(--font-ui);
}

.vs-badge {
  width: 72px;
  height: 72px;
  background: #FFFFFF;
  border: 0.7px solid rgba(229, 223, 211, 1);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vs-badge span {
  font-size: 15px;
  color: #6E6A60;
  font-family: var(--font-ui);
}

/* Step Bar */
.step-bar {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 50px;
  padding: 0 20px;
  border-radius: 9999px;
  border: 0.7px solid #EDE9E0;
  background: #FFFFFF;
}

.step-item.done {
  background: #E4F0E6;
  border-color: transparent;
}

.step-item.current {
  border-color: #C0392B;
}

.step-number {
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background: #EFEFE5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8A8578;
  font-size: 14px;
  font-weight: 500;
}

.step-item.done .step-number {
  background: #4E9B7A;
  color: #FFFFFF;
}

.step-item.current .step-number {
  background: #C0392B;
  color: #FFFFFF;
}

.step-text {
  font-size: 17px;
  color: #8A8578;
  font-family: var(--font-ui);
}

.step-item.done .step-text {
  color: #3E8C6E;
}

.step-item.current .step-text {
  color: #C0392B;
}

.step-line {
  width: 57px;
  height: 1px;
  background: #DDD7C9;
  flex-shrink: 0;
}

/* Action Area */
.action-area {
  display: flex;
  gap: 16px;
  align-items: center;
}

.compare-btn {
  width: 292px;
  height: 60px;
  background: #C0392B;
  border: none;
  border-radius: 10px;
  color: #FFFFFF;
  font-size: 18px;
  font-weight: 500;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.2s;
}

.compare-btn:hover:not(:disabled) {
  background: #A83028;
  box-shadow: 0 4px 16px rgba(192, 57, 43, 0.3);
}

.compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  height: 60px;
  padding: 0 32px;
  background: #FFFFFF;
  border: 0.7px solid #E5DFD3;
  border-radius: 10px;
  color: #6E6A60;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #F7F3EA;
}

/* Floating Toolbar */
.floating-toolbar {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  background: #FFFFFF;
  border: 0.7px solid #EFEFE5;
  border-radius: 16px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.toolbar-nav-btn {
  width: 52px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
  color: #8A8578;
  position: relative;
}

.toolbar-nav-btn:hover {
  background: #F7F3EA;
  color: #3A3A3A;
}

.toolbar-nav-btn.active {
  background: #FBE9E7;
  color: #C0392B;
}

.toolbar-nav-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #C0392B;
  border-radius: 0 2px 2px 0;
}

.toolbar-nav-label {
  font-size: 9px;
  font-weight: 500;
  font-family: var(--font-ui);
  white-space: nowrap;
  line-height: 1;
}

@media (max-width: 1024px) {
  .card-row {
    flex-direction: column;
  }
  .vs-badge {
    transform: rotate(90deg);
  }
  .upload-card {
    width: 100%;
    max-width: 450px;
  }
}

@media (max-width: 640px) {
  .upload-card {
    height: 300px;
  }
  .step-bar {
    flex-wrap: wrap;
    justify-content: center;
  }
  .step-line {
    display: none;
  }
}
</style>
