<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RiUploadLine, RiFileWordLine, RiFileLine, RiExchangeLine, RiListCheck, RiCheckLine } from '@remixicon/vue'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useComparison } from '../composables/useComparison'
import { useToast } from '../composables/useToast'
import { useRecentRecords } from '../composables/useRecentRecords'
import { removeWatermarks } from '../utils/watermark'
import { storeCompareResult } from '../utils/compareResultStore'
import { storePropertyCheckResult } from '../utils/compareResultStore'
import { calculateTextSimilarity } from '../utils/textAlgorithms'
import { buildPropertyDetails, propsMapSource } from '../utils/propertyFields'
import type { ComparisonSettings } from '../utils/textAlgorithms'

const router = useRouter()
const { parseFile } = useFileParser()
const { settings } = useSettings()
const { error: showError } = useToast()
const { addRecentRecord: addFcRecord } = useRecentRecords('fileCompare')
const { addRecentRecord: addPcRecord } = useRecentRecords('propertyCheck')
const {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  runComparison,
  cancelComparison,
} = useComparison()

// 模式切换
const mode = ref<'fileCompare' | 'propertyCheck'>('fileCompare')

// 文件信息
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
const leftFileProperties = ref<any>({})
const rightFileProperties = ref<any>({})

// 处理状态
const step = ref(0)
const stepDone = ref([false, false, false])
const isParsing = ref(false)
const parseError = ref('')

// 属性检查结果
const matchingProperties = ref(0)
const nonMatchingProperties = ref(0)
const warningProperties = ref(0)
const propertyDetails = ref<any[]>([])

// 文件输入引用
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

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

// 获取文件类型
const getFileType = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    'doc': 'Word文档', 'docx': 'Word文档',
    'pdf': 'PDF文档', 'txt': '文本文件',
    'ppt': 'PPT演示', 'pptx': 'PPT演示',
    'xls': 'Excel表格', 'xlsx': 'Excel表格'
  }
  return typeMap[ext] || '未知类型'
}

function openFilePicker(side: 'left' | 'right') {
  if (side === 'left') leftFileInput.value?.click()
  else rightFileInput.value?.click()
}

function handleFileSelect(side: 'left' | 'right', e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 100 * 1024 * 1024) {
    showError('文件大小不能超过 100MB')
    return
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const sizeStr = formatFileSize(file.size)

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

// 切换模式
function switchMode(newMode: 'fileCompare' | 'propertyCheck') {
  if (mode.value === newMode) return
  mode.value = newMode
  // 清除之前的状态
  isParsing.value = false
  parseError.value = ''
  step.value = 0
  stepDone.value = [false, false, false]
}

// 文件对比
async function handleCompare() {
  if (!bothReady.value || isProcessing.value) return

  try {
    step.value = 0
    stepDone.value = [false, false, false]

    const lResult = await parseFile(leftFileInfo.value.file!)
    const rResult = await parseFile(rightFileInfo.value.file!)

    if (lResult.error) throw new Error(lResult.error)
    if (rResult.error) throw new Error(rResult.error)

    let lText = lResult.content
    let rText = rResult.content
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
      showError('对比被取消')
      return
    }

    if (result.parseError) {
      showError(result.parseError)
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

    addFcRecord({
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarity: textSimilarity,
      similarSegments: result.similarSegments,
    })

    router.push({ path: '/file-compare-result', query: { resultId, t: Date.now() } })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      showError('对比已取消')
    } else {
      showError(`对比失败: ${error.message}`)
    }
  }
}

// 属性检查
async function handleCheck() {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) return

  isParsing.value = true
  parseError.value = ''

  try {
    const leftResult = await parseFile(leftFileInfo.value.file)
    if (leftResult.error) throw new Error(leftResult.error)
    leftFileContent.value = leftResult.content
    leftFileProperties.value = leftResult.properties

    const rightResult = await parseFile(rightFileInfo.value.file)
    if (rightResult.error) throw new Error(rightResult.error)
    rightFileContent.value = rightResult.content
    rightFileProperties.value = rightResult.properties

    const similarity = calculateTextSimilarity(leftFileContent.value, rightFileContent.value, settings)
    const similarityStatus = similarity >= settings.textSimilarityThreshold ? 'match' : similarity >= 50 ? 'warning' : 'mismatch'

    const leftSrc = propsMapSource(leftFileProperties.value, leftFileInfo.value.name, leftFileInfo.value.size, leftFileInfo.value.type)
    const rightSrc = propsMapSource(rightFileProperties.value, rightFileInfo.value.name, rightFileInfo.value.size, rightFileInfo.value.type)
    propertyDetails.value = buildPropertyDetails(leftSrc, rightSrc)

    if (leftFileInfo.value.file && rightFileInfo.value.file) {
      const sizeIdx = propertyDetails.value.findIndex(p => p.name === '文件大小')
      if (sizeIdx >= 0) {
        const sameBytes = leftFileInfo.value.file.size === rightFileInfo.value.file.size
        propertyDetails.value[sizeIdx] = { ...propertyDetails.value[sizeIdx], status: sameBytes ? 'match' : 'mismatch' }
      }
    }

    matchingProperties.value = propertyDetails.value.filter(p => p.status === 'match').length
    nonMatchingProperties.value = propertyDetails.value.filter(p => p.status === 'mismatch').length
    warningProperties.value = propertyDetails.value.filter(p => p.status === 'warning').length

    addPcRecord({
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarity: `${similarity}%`,
      propertyDetails: propertyDetails.value,
    })

    const checkResult = {
      propertyDetails: propertyDetails.value,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      totalProperties: propertyDetails.value.length,
      matchingProperties: matchingProperties.value,
      nonMatchingProperties: nonMatchingProperties.value,
      warningProperties: warningProperties.value,
      similarity: `${similarity}%`,
      leftFileProperties: leftFileProperties.value,
      rightFileProperties: rightFileProperties.value,
      similarityStatus: similarityStatus
    }
    const resultId = storePropertyCheckResult(checkResult)

    router.push({ path: '/property-check-result', query: { resultId, t: Date.now() } })
  } catch (error: any) {
    parseError.value = error.message
  } finally {
    isParsing.value = false
  }
}

function handleCancel() {
  if (canCancel.value) cancelComparison()
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
              accept=".doc,.docx,.xls,.xlsx,.pdf,.md,.txt,.ppt,.pptx"
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
              accept=".doc,.docx,.xls,.xlsx,.pdf,.md,.txt,.ppt,.pptx"
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
          <div class="step-item" :class="{ done: stepDone[0], current: step === 0 && (isProcessing || isParsing) }">
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
            <span class="step-text">
              {{ mode === 'fileCompare' ? '比对识别' : '属性提取' }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-area">
          <button
            v-if="mode === 'fileCompare'"
            class="compare-btn"
            :disabled="!bothReady || isProcessing"
            @click="handleCompare"
          >
            <RiExchangeLine v-if="!isProcessing" :size="20" />
            <span>{{ isProcessing ? progressText : '一键对比' }}</span>
          </button>
          <button
            v-else
            class="compare-btn"
            :disabled="!bothReady || isParsing"
            @click="handleCheck"
          >
            <RiListCheck v-if="!isParsing" :size="20" />
            <span>{{ isParsing ? '检查中…' : '属性检查' }}</span>
          </button>
          <button
            v-if="isProcessing && canCancel"
            class="cancel-btn"
            @click="handleCancel"
          >
            取消
          </button>
        </div>

        <!-- 解析错误显示 -->
        <div v-if="parseError" class="error-message">
          {{ parseError }}
        </div>
      </div>

      <!-- 悬浮工具栏 -->
      <div class="floating-toolbar">
        <button
          class="toolbar-nav-btn"
          :class="{ active: mode === 'fileCompare' }"
          @click="switchMode('fileCompare')"
          title="文件对比"
        >
          <RiExchangeLine :size="22" />
        </button>
        <button
          class="toolbar-nav-btn"
          :class="{ active: mode === 'propertyCheck' }"
          @click="switchMode('propertyCheck')"
          title="属性检查"
        >
          <RiListCheck :size="22" />
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

/* Error Message */
.error-message {
  padding: 12px 20px;
  background: #FFF0ED;
  border: 0.7px solid #FFD4CE;
  border-radius: 8px;
  color: #C0392B;
  font-size: 14px;
  font-family: var(--font-ui);
  text-align: center;
}

/* Floating Toolbar */
.floating-toolbar {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  background: #FFFFFF;
  border: 0.7px solid #EFEFE5;
  border-radius: 16px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.toolbar-nav-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  color: var(--color-text-secondary, #6E6A60);
  position: relative;
}

.toolbar-nav-btn:hover {
  background: var(--color-primary-soft, #FBE9E7);
  color: var(--color-primary, #C0392B);
  transform: scale(1.05);
}

.toolbar-nav-btn.active {
  background: var(--color-primary, #C0392B);
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(192, 57, 43, 0.3);
}

.toolbar-nav-btn::after {
  content: attr(title);
  position: absolute;
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  font-size: 12px;
  font-family: var(--font-ui);
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.toolbar-nav-btn:hover::after {
  opacity: 1;
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
  .floating-toolbar {
    right: 12px;
  }
}
</style>
