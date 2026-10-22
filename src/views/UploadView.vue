<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import UploadCard from '../components/UploadCard.vue'
import StepStrip from '../components/StepStrip.vue'
import { RiArrowLeftRightLine, RiListSettingsLine } from '@remixicon/vue'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useComparison } from '../composables/useComparison'
import { ElMessage } from '../utils/toast'
import { useRecentRecords } from '../composables/useRecentRecords'
import { removeWatermarks } from '../utils/watermark'
import { storeCompareResult, storePropertyCheckResult } from '../utils/compareResultStore'
import { calculateTextSimilarity } from '../utils/textAlgorithms'
import { buildPropertyDetails, propsMapSource } from '../utils/propertyFields'
import type { ComparisonSettings } from '../utils/textAlgorithms'
import type { FileInfo } from '../utils/helpers'

const router = useRouter()
const { parseFile } = useFileParser()
const { settings } = useSettings()

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

// StepStrip 动画完成回调
let stepStripResolve: (() => void) | null = null
function onStepStripFinished() {
  if (stepStripResolve) {
    stepStripResolve()
    stepStripResolve = null
  }
}
function waitStepStrip(): Promise<void> {
  return new Promise<void>(resolve => {
    stepStripResolve = resolve
  })
}

// 模式切换
type CompareMode = 'fileCompare' | 'propertyCheck' | 'imageCompare' | 'batchCompare'
const mode = ref<CompareMode>('fileCompare')

// 文件信息
const leftFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' })
const rightFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' })

const leftFileContent = ref('')
const rightFileContent = ref('')
const leftFileProperties = ref<any>({})
const rightFileProperties = ref<any>({})

// 属性检查结果
const matchingProperties = ref(0)
const nonMatchingProperties = ref(0)
const warningProperties = ref(0)
const propertyDetails = ref<any[]>([])

// 步骤配置
const steps = computed(() => {
  if (mode.value === 'fileCompare') {
    return [
      { key: 0, label: '解析文件' },
      { key: 1, label: '提取文字' },
      { key: 2, label: '比对识别' },
    ]
  } else {
    return [
      { key: 0, label: '解析文件' },
      { key: 1, label: '提取文字' },
      { key: 2, label: '属性提取' },
    ]
  }
})

const bothReady = computed(() => !!leftFileInfo.value.file && !!rightFileInfo.value.file)

const btnLabel = computed(() => {
  if (mode.value === 'fileCompare') {
    return '一键对比'
  } else {
    return '属性检查'
  }
})

const isParsing = ref(false)
const parseError = ref('')

// 处理状态
const step = ref(0)
const stepDone = ref([false, false, false])

// 切换模式
function switchMode(newMode: CompareMode) {
  if (mode.value === newMode) return
  mode.value = newMode
  isParsing.value = false
  parseError.value = ''
  step.value = 0
  stepDone.value = [false, false, false]
}

// 处理图片对比模式切换
function handleImageCompareMode() {
  router.push('/image-compare')
}

// 处理批量对比模式切换
function handleBatchCompareMode() {
  router.push('/batch-compare')
}

// 文件对比
async function handleCompare() {
  if (!bothReady.value) {
    ElMessage.warning('请先上传文件')
    return
  }
  if (isProcessing.value) return

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

    const result = await runComparison(lText, rText, compareSettings)
    stepDone.value[2] = true

    if (!result) {
      ElMessage.error('对比被取消')
      return
    }

    if (result.parseError) {
      ElMessage.error(result.parseError)
      return
    }

    if (!result.segments || !Array.isArray(result.segments)) {
      ElMessage.error('对比结果异常，请重试')
      return
    }

    const textSimilarity = Math.round(result.similarity * 100) + '%'

    const comparisonResult = {
      segments: result.segments,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      textSimilarity: textSimilarity,
      similarSegmentsCount: result.segments.length,
      leftTotalPages: 1,
      rightTotalPages: 1,
      leftFileContent: lText,
      rightFileContent: rText,
      leftFileBlob: leftFileInfo.value.file,
      rightFileBlob: rightFileInfo.value.file,
    }

    const resultId = storeCompareResult(comparisonResult)

    addFcRecord({
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarity: textSimilarity,
      similarSegments: result.segments,
    })

    await waitStepStrip()
    router.push({ path: `/file-compare-result/${resultId}` })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      ElMessage.error('对比已取消')
    } else {
      ElMessage.error(`对比失败: ${error.message}`)
    }
  }
}

// 属性检查
async function handleCheck() {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) {
    ElMessage.warning('请先上传文件')
    return
  }

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

    if (!propertyDetails.value || !Array.isArray(propertyDetails.value)) {
      ElMessage.error('属性检查结果异常，请重试')
      return
    }

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
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
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

    await waitStepStrip()
    router.push({ path: `/property-check-result/${resultId}` })
  } catch (error: any) {
    parseError.value = error.message
  } finally {
    isParsing.value = false
  }
}

// 统一处理按钮点击
async function handleExtract() {
  if (mode.value === 'fileCompare') {
    await handleCompare()
  } else {
    await handleCheck()
  }
}

function handleCancel() {
  if (canCancel.value) cancelComparison()
}

function handleReplace() {}
</script>

<template>
  <div class="upload-view">
    <div class="upload-body">
      <div class="upload-area">
        <UploadCard
          v-model:leftFileInfo="leftFileInfo"
          v-model:rightFileInfo="rightFileInfo"
          :disabled="isProcessing || isParsing"
          @replace="handleReplace"
        />

        <StepStrip
          :steps="steps"
          :loading="isProcessing || isParsing"
          :button-label="btnLabel"
          @extract="handleExtract"
          @finished="onStepStripFinished"
        />

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
        >
          <RiArrowLeftRightLine class="toolbar-icon" />
          <div class="toolbar-tip">
            文件对比
          </div>
        </button>
        <button
          class="toolbar-nav-btn"
          :class="{ active: mode === 'propertyCheck' }"
          @click="switchMode('propertyCheck')"
        >
          <RiListSettingsLine class="toolbar-icon" />
          <div class="toolbar-tip">
            属性检查
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-bg-main, var(--color-cream, #FAF7F2));
}

.upload-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  gap: 32px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
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
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EFEFE5);
  border-radius: 16px;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.toolbar-nav-btn {
  width: 40px;
  height: 40px;
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

.toolbar-icon {
  font-size: 22px;
  transition: all 0.25s ease;
}

.toolbar-nav-btn:hover {
  background-color: var(--color-primary, #C0392B);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
}

.toolbar-nav-btn:hover .toolbar-icon {
  color: #fff;
}

.toolbar-nav-btn.active {
  background: var(--color-primary-soft, #FBE9E7);
  color: var(--color-primary, #C0392B);
}

.toolbar-nav-btn.active .toolbar-icon {
  color: var(--color-primary, #C0392B);
}

.toolbar-tip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) scale(0.96);
  padding: 7px 12px;
  border-radius: 9px;
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, #E5DFD3);
  color: var(--color-text-body, #3A3A3A);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  font-family: var(--font-ui);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease, transform 0.16s ease;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 100;
}

.toolbar-nav-btn:hover .toolbar-tip {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

@media (max-width: 1024px) {
  .floating-toolbar {
    right: 12px;
  }
}

@media (max-width: 640px) {
  .upload-body {
    padding: 24px 16px;
  }
}
</style>
