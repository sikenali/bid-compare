<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiImageLine, RiExchangeLine, RiAddLine,
  RiRestartLine, RiDeleteBinLine,
} from '@remixicon/vue'
import { useSettings } from '../composables/useSettings'
import { useToast } from '../composables/useToast'
import { computeImageHash, calculateImageSimilarity, loadImageAsDataUrl } from '../utils/imageCompare'
import { recognizeImages, isOCRAvailable } from '../utils/ocr'
import type { OCRResult } from '../utils/ocr'
import { UiSwitch } from '../components/ui'

const router = useRouter()
const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

// 图片数据
const leftImages = ref<Array<{ url: string; name: string }>>([])
const rightImages = ref<Array<{ url: string; name: string }>>([])

onUnmounted(() => {
  leftImages.value.forEach(img => URL.revokeObjectURL(img.url))
  rightImages.value.forEach(img => URL.revokeObjectURL(img.url))
})

// 文件输入引用
const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)

const triggerLeftInput = () => leftInputRef.value?.click()
const triggerRightInput = () => rightInputRef.value?.click()

// 对比状态
const isProcessing = ref(false)
const progress = ref(0)
const progressMessage = ref('')
const imageDuplicates = ref<Array<{
  id: number
  leftImage: string
  rightImage: string
  similarity: number
  leftPage: string
  rightPage: string
}>>([])

// OCR 相关
const ocrAvailable = isOCRAvailable()
const ocrConfig = computed(() => ({ language: settings.ocrLanguage }))
const ocrProgress = ref(0)
const ocrProgressMessage = ref('')
const isOCRProcessing = ref(false)
const ocrResults = ref<Array<{ name: string; result: OCRResult }>>([])
const showOCRResult = ref(false)
const ocrCompareResult = ref<{
  leftText: string
  rightText: string
  similarity: number
} | null>(null)

// 文件上传处理
const handleLeftImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    for (const f of Array.from(input.files)) {
      const url = URL.createObjectURL(f)
      leftImages.value.push({ url, name: f.name })
    }
  }
  input.value = ''
}

const handleRightImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    for (const f of Array.from(input.files)) {
      const url = URL.createObjectURL(f)
      rightImages.value.push({ url, name: f.name })
    }
  }
  input.value = ''
}

const removeLeftImage = (idx: number) => {
  URL.revokeObjectURL(leftImages.value[idx].url)
  leftImages.value.splice(idx, 1)
}

const removeRightImage = (idx: number) => {
  URL.revokeObjectURL(rightImages.value[idx].url)
  rightImages.value.splice(idx, 1)
}

// 图片对比
const runImageComparison = async () => {
  if (leftImages.value.length === 0 || rightImages.value.length === 0) {
    showToast('请上传至少左右各一张图片', 'warning')
    return
  }

  isProcessing.value = true
  progress.value = 0
  progressMessage.value = '正在分析图片...'
  imageDuplicates.value = []

  try {
    const computeAll = async (images: Array<{ url: string; name: string }>) => {
      const results: Array<{ url: string; hash: string; name: string; index: number }> = []
      for (let i = 0; i < images.length; i++) {
        const data = await loadImageAsDataUrl(images[i].url)
        if (data) {
          const hash = computeImageHash(data)
          results.push({ url: images[i].url, hash, name: images[i].name, index: i })
        }
        progress.value = (i + 1) / images.length * 0.4
      }
      return results
    }

    const leftHashes = await computeAll(leftImages.value)
    const rightHashes = await computeAll(rightImages.value)

    progress.value = 0.5
    progressMessage.value = '正在对比...'

    const threshold = settings.imageSimilarityThreshold
    let idCounter = 0

    for (const lh of leftHashes) {
      for (const rh of rightHashes) {
        const sim = calculateImageSimilarity(lh.hash, rh.hash)
        if (sim >= threshold) {
          imageDuplicates.value.push({
            id: ++idCounter,
            leftImage: lh.url,
            rightImage: rh.url,
            similarity: sim,
            leftPage: lh.name,
            rightPage: rh.name
          })
        }
      }
    }

    imageDuplicates.value.sort((a, b) => b.similarity - a.similarity)
    progress.value = 1
    if (imageDuplicates.value.length > 0) {
      showToast(`发现 ${imageDuplicates.value.length} 组雷同图片`, 'success')
    } else {
      showToast('未发现雷同图片', 'success')
    }
  } catch (error) {
    showToast('图片对比失败', 'error')
  } finally {
    isProcessing.value = false
  }
}

// OCR 识别
const runOCR = async (images: Array<{ url: string; name: string }>, side: 'left' | 'right') => {
  if (!ocrAvailable || images.length === 0) return []

  isOCRProcessing.value = true
  ocrProgress.value = 0
  ocrProgressMessage.value = `正在识别${side === 'left' ? '左侧' : '右侧'}图片文字...`

  try {
    const results = await recognizeImages(
      images,
      ocrConfig.value,
      (current, total, currentImage) => {
        ocrProgress.value = current / total
        ocrProgressMessage.value = `正在识别: ${currentImage} (${current}/${total})`
      }
    )
    return results
  } catch (error) {
    return []
  } finally {
    isOCRProcessing.value = false
    ocrProgress.value = 0
    ocrProgressMessage.value = ''
  }
}

// OCR 文字对比
const runOCRComparison = async () => {
  if (leftImages.value.length === 0 || rightImages.value.length === 0) {
    showToast('请上传至少左右各一张图片', 'warning')
    return
  }

  isOCRProcessing.value = true
  ocrProgressMessage.value = '正在进行图片文字识别...'

  try {
    ocrProgressMessage.value = '正在识别左侧图片文字...'
    const leftResults = await runOCR(leftImages.value, 'left')
    
    ocrProgressMessage.value = '正在识别右侧图片文字...'
    const rightResults = await runOCR(rightImages.value, 'right')

    const leftText = leftResults.map(r => r.result.text).join('\n')
    const rightText = rightResults.map(r => r.result.text).join('\n')

    // 计算相似度
    let similarity = 0
    if (leftText && rightText) {
      const set1 = new Set(leftText)
      const set2 = new Set(rightText)
      const intersection = new Set([...set1].filter(x => set2.has(x)))
      const union = new Set([...set1, ...set2])
      similarity = Math.round((intersection.size / union.size) * 100)
    }

    ocrCompareResult.value = { leftText, rightText, similarity }
    ocrResults.value = [...leftResults, ...rightResults]
    showOCRResult.value = true
    showToast('OCR 文字识别对比完成', 'success')
  } catch (error) {
    showToast('OCR 对比失败', 'error')
  } finally {
    isOCRProcessing.value = false
    ocrProgress.value = 0
    ocrProgressMessage.value = ''
  }
}

// 清除所有图片
const clearAllImages = () => {
  leftImages.value.forEach(img => URL.revokeObjectURL(img.url))
  rightImages.value.forEach(img => URL.revokeObjectURL(img.url))
  leftImages.value = []
  rightImages.value = []
  imageDuplicates.value = []
  ocrCompareResult.value = null
  ocrResults.value = []
  showOCRResult.value = false
  showToast('已清除所有图片', 'success')
}

// 返回上传页面
const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="image-compare-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span class="current">图片对比</span>
          </div>
          <div class="header-title">
            <h1>图片对比</h1>
            <p>上传图片进行雷同检测和 OCR 文字识别对比</p>
          </div>
        </div>
        <button class="reset-button" @click="clearAllImages">
          <RiRestartLine class="icon" />清除全部
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title">图片上传</div>
      <div class="upload-grid">
        <!-- 左侧图片上传 -->
        <div class="upload-column">
          <div class="column-header">
            <div class="column-indicator left"></div>
            <span class="column-title">左侧图片</span>
            <span class="column-count">{{ leftImages.length }} 张</span>
          </div>
          <div class="upload-area" @click="triggerLeftInput">
            <input type="file" ref="leftInputRef" accept="image/*" multiple @change="handleLeftImageUpload" class="file-input" />
            <!-- 未上传占位 -->
            <div v-if="leftImages.length === 0" class="upload-placeholder">
              <div class="upload-icon-wrapper">
                <RiImageLine class="upload-icon" />
              </div>
              <div class="upload-main-text">拖拽图片到此处或点击上传</div>
              <div class="image-format-icons">
                <span class="image-format-badge">JPG</span>
                <span class="image-format-badge">PNG</span>
                <span class="image-format-badge">GIF</span>
              </div>
            </div>
            <!-- 已上传预览 -->
            <div v-else class="image-preview-grid">
              <div v-for="(img, idx) in leftImages" :key="idx" class="image-preview-item">
                <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
                <button class="image-preview-remove" @click.stop="removeLeftImage(idx)">
                  <RiDeleteBinLine />
                </button>
                <div class="image-preview-name">{{ img.name }}</div>
              </div>
              <div class="image-add-more" @click.stop="triggerLeftInput">
                <RiAddLine class="image-add-icon" />
                <span>继续添加</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 对比按钮 -->
        <div class="compare-action">
          <button 
            class="compare-btn"
            @click="runImageComparison" 
            :disabled="isProcessing || leftImages.length === 0 || rightImages.length === 0"
          >
            <RiExchangeLine class="compare-icon" :class="{ 'rotating': isProcessing }" />
            <span>{{ isProcessing ? '对比中...' : '开始对比' }}</span>
          </button>
        </div>

        <!-- 右侧图片上传 -->
        <div class="upload-column">
          <div class="column-header">
            <div class="column-indicator right"></div>
            <span class="column-title">右侧图片</span>
            <span class="column-count">{{ rightImages.length }} 张</span>
          </div>
          <div class="upload-area" @click="triggerRightInput">
            <input type="file" ref="rightInputRef" accept="image/*" multiple @change="handleRightImageUpload" class="file-input" />
            <!-- 未上传占位 -->
            <div v-if="rightImages.length === 0" class="upload-placeholder">
              <div class="upload-icon-wrapper">
                <RiImageLine class="upload-icon" />
              </div>
              <div class="upload-main-text">拖拽图片到此处或点击上传</div>
              <div class="image-format-icons">
                <span class="image-format-badge">JPG</span>
                <span class="image-format-badge">PNG</span>
                <span class="image-format-badge">GIF</span>
              </div>
            </div>
            <!-- 已上传预览 -->
            <div v-else class="image-preview-grid">
              <div v-for="(img, idx) in rightImages" :key="idx" class="image-preview-item">
                <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
                <button class="image-preview-remove" @click.stop="removeRightImage(idx)">
                  <RiDeleteBinLine />
                </button>
                <div class="image-preview-name">{{ img.name }}</div>
              </div>
              <div class="image-add-more" @click.stop="triggerRightInput">
                <RiAddLine class="image-add-icon" />
                <span>继续添加</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 进度显示 -->
      <div v-if="isProcessing" class="progress-display">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
        </div>
        <span class="progress-text">{{ progressMessage }} {{ Math.round(progress * 100) }}%</span>
      </div>
    </div>

    <!-- 图片对比结果 -->
    <div v-if="imageDuplicates.length > 0" class="section-card">
      <div class="card-title-row">
        <div class="card-title">对比结果</div>
        <span class="result-count">发现 {{ imageDuplicates.length }} 组雷同图片</span>
      </div>
      <div class="image-result-grid">
        <div v-for="(dup, idx) in imageDuplicates" :key="idx" class="image-result-card">
          <div class="image-result-pair">
            <div class="image-result-side">
              <img :src="dup.leftImage" class="result-image" :alt="'左侧 ' + dup.leftPage" />
              <span class="image-label">{{ dup.leftPage }}</span>
            </div>
            <div class="similarity-badge" :class="{ 'high': dup.similarity >= 80 }">
              {{ dup.similarity }}%
            </div>
            <div class="image-result-side">
              <img :src="dup.rightImage" class="result-image" :alt="'右侧 ' + dup.rightPage" />
              <span class="image-label">{{ dup.rightPage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR 图片文字识别区域 -->
    <div v-if="ocrAvailable && leftImages.length > 0 && rightImages.length > 0" class="section-card">
      <div class="card-title">图片文字识别</div>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">OCR 文字识别对比</div>
          <div class="setting-desc">识别图片中的文字并进行相似度对比</div>
        </div>
        <UiSwitch v-model="settings.enableOCRCompare" @update:model-value="saveSettings()" />
      </div>
      
      <template v-if="settings.enableOCRCompare">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">识别语言</div>
            <div class="setting-desc">选择图片文字识别的语言</div>
          </div>
          <select v-model="settings.ocrLanguage" class="select-input" @change="saveSettings()">
            <option value="chi_sim+eng">中文简体 + 英文</option>
            <option value="chi_tra+eng">中文繁体 + 英文</option>
            <option value="eng">英文</option>
            <option value="chi_sim">中文简体</option>
          </select>
        </div>

        <div class="ocr-actions">
          <button 
            class="ocr-compare-btn" 
            @click="runOCRComparison" 
            :disabled="isOCRProcessing"
          >
            <RiExchangeLine class="ocr-btn-icon" />
            <span>{{ isOCRProcessing ? '识别中...' : '开始 OCR 对比' }}</span>
          </button>
        </div>

        <div v-if="isOCRProcessing" class="ocr-progress">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: `${Math.round(ocrProgress * 100)}%` }"></div>
          </div>
          <span class="progress-text">{{ ocrProgressMessage }} {{ Math.round(ocrProgress * 100) }}%</span>
        </div>
      </template>
    </div>

    <!-- OCR 结果弹窗 -->
    <div v-if="showOCRResult" class="modal-overlay" @click="showOCRResult = false">
      <div class="ocr-result-modal" @click.stop>
        <div class="modal-header">
          <h3>图片文字识别结果</h3>
          <button class="close-btn" @click="showOCRResult = false">×</button>
        </div>
        <div class="modal-body">
          <div class="ocr-compare-summary" v-if="ocrCompareResult">
            <div class="ocr-similarity-badge">
              <span class="ocr-similarity-label">文字相似度</span>
              <span class="ocr-similarity-value" :class="{ 'high': ocrCompareResult.similarity >= 75 }">
                {{ ocrCompareResult.similarity }}%
              </span>
            </div>
          </div>
          <div class="ocr-text-compare">
            <div class="ocr-text-column">
              <div class="ocr-column-header">左侧识别文字</div>
              <pre class="ocr-text-content">{{ ocrCompareResult?.leftText || '无识别结果' }}</pre>
            </div>
            <div class="ocr-text-column">
              <div class="ocr-column-header">右侧识别文字</div>
              <pre class="ocr-text-content">{{ ocrCompareResult?.rightText || '无识别结果' }}</pre>
            </div>
          </div>
          <div class="ocr-detail-section" v-if="ocrResults.length > 0">
            <div class="ocr-detail-header">识别详情</div>
            <div class="ocr-detail-list">
              <div v-for="(item, idx) in ocrResults" :key="idx" class="ocr-detail-item">
                <div class="ocr-detail-name">{{ item.name }}</div>
                <div class="ocr-detail-confidence">
                  置信度: <span :class="{ 'high': item.result.confidence >= 80 }">{{ item.result.confidence.toFixed(1) }}%</span>
                </div>
                <div class="ocr-detail-text">{{ item.result.text.substring(0, 200) }}{{ item.result.text.length > 200 ? '...' : '' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-compare-view {
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
  margin-bottom: 20px;
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.result-count {
  font-size: 14px;
  color: var(--color-primary, #C0392B);
  font-weight: 500;
}

/* 上传网格 */
.upload-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
}

.upload-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.column-indicator {
  width: 4px;
  height: 20px;
  border-radius: 2px;
}
.column-indicator.left { background: var(--color-primary, #C0392B); }
.column-indicator.right { background: #4A90D9; }
.column-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.column-count {
  font-size: 13px;
  color: var(--color-text-muted, #8A8578);
  margin-left: auto;
}

.upload-area {
  border: 0.7px dashed var(--color-border, #E5DFD3);
  border-radius: 12px;
  background: var(--color-bg-card, #FCFBF8);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  min-height: 280px;
}
.upload-area:hover {
  border-color: var(--color-primary, #C0392B);
  background: #FAF8F5;
}
.file-input { display: none; }

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 280px;
  padding: 24px;
  gap: 12px;
}
.upload-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-secondary, #F7F3EA);
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-icon { font-size: 32px; color: var(--color-text-muted, #8A8578); }
.upload-main-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.image-format-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.image-format-badge {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--color-bg-secondary, #F7F3EA);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #6E6A60);
}

/* 图片预览 */
.image-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  min-height: 280px;
  align-content: flex-start;
  box-sizing: border-box;
}
.image-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border-soft, #EDE9E0);
  flex-shrink: 0;
}
.image-preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(192, 57, 43, 0.9);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}
.image-preview-item:hover .image-preview-remove { opacity: 1; }
.image-preview-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.image-add-more {
  width: 100px;
  height: 100px;
  border: 2px dashed var(--color-border, #E5DFD3);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: var(--color-text-muted, #8A8578);
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
}
.image-add-more:hover {
  border-color: var(--color-primary, #C0392B);
  color: var(--color-primary, #C0392B);
  background: rgba(192, 57, 43, 0.05);
}
.image-add-icon { font-size: 24px; }

/* 对比按钮 */
.compare-action {
  display: flex;
  justify-content: center;
  align-items: center;
}
.compare-btn {
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
.compare-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(192, 57, 43, 0.4);
}
.compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.compare-icon { font-size: 20px; }
.compare-icon.rotating { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 进度显示 */
.progress-display {
  margin-top: 16px;
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
  transition: width 0.3s;
  border-radius: 4px;
}
.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary, #6E6A60);
  text-align: center;
}

/* 对比结果 */
.image-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.image-result-card {
  background: var(--color-bg-card, #FCFBF8);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--color-border-soft, #EDE9E0);
}
.image-result-pair {
  display: flex;
  align-items: center;
  gap: 16px;
}
.image-result-side {
  flex: 1;
  text-align: center;
}
.result-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--color-bg-white, #FFFFFF);
  border: 1px solid var(--color-border-soft, #EDE9E0);
}
.image-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary, #6E6A60);
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.similarity-badge {
  padding: 8px 16px;
  background: rgba(192, 57, 43, 0.1);
  border-radius: 20px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary, #C0392B);
  flex-shrink: 0;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  border-bottom: 1px solid var(--color-border-soft, #EDE9E0);
}
.setting-item:last-child { border-bottom: none; }
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

/* 选择输入 */
.select-input {
  width: 180px;
  height: 36px;
  padding: 0 12px;
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 10px;
  font-size: 13px;
  background: var(--color-bg-white, #FFFFFF);
  color: var(--color-text-body, #3A3A3A);
  cursor: pointer;
  outline: none;
}
.select-input:focus { border-color: var(--color-primary, #C0392B); }

/* OCR 操作 */
.ocr-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
.ocr-compare-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #4A90D9;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.ocr-compare-btn:hover:not(:disabled) {
  background: #3A7BC8;
  transform: translateY(-1px);
}
.ocr-compare-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ocr-btn-icon { font-size: 16px; }

.ocr-progress {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.ocr-result-modal {
  background: var(--color-bg-white, #FFFFFF);
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-soft, #EDE9E0);
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
}
.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-card, #FCFBF8);
  color: var(--color-text-secondary, #6E6A60);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover { background: rgba(192, 57, 43, 0.1); color: var(--color-primary, #C0392B); }

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}
.ocr-compare-summary {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.ocr-similarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 32px;
  background: var(--color-bg-card, #FCFBF8);
  border-radius: 12px;
  border: 1px solid var(--color-border-soft, #EDE9E0);
}
.ocr-similarity-label {
  font-size: 14px;
  color: var(--color-text-secondary, #6E6A60);
  margin-bottom: 4px;
}
.ocr-similarity-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary, #1F1D1A);
}
.ocr-similarity-value.high { color: var(--color-primary, #C0392B); }

.ocr-text-compare {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.ocr-text-column { flex: 1; min-width: 0; }
.ocr-column-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-soft, #EDE9E0);
}
.ocr-text-content {
  padding: 12px;
  background: var(--color-bg-card, #FCFBF8);
  border-radius: 8px;
  border: 1px solid var(--color-border-soft, #EDE9E0);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-body, #3A3A3A);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.ocr-detail-section {
  border-top: 1px solid var(--color-border-soft, #EDE9E0);
  padding-top: 20px;
}
.ocr-detail-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  margin-bottom: 12px;
}
.ocr-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ocr-detail-item {
  padding: 12px;
  background: var(--color-bg-card, #FCFBF8);
  border-radius: 8px;
  border: 1px solid var(--color-border-soft, #EDE9E0);
}
.ocr-detail-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
  margin-bottom: 4px;
}
.ocr-detail-confidence {
  font-size: 12px;
  color: var(--color-text-secondary, #6E6A60);
  margin-bottom: 4px;
}
.ocr-detail-confidence .high { color: var(--color-success, #4E9B7A); }
.ocr-detail-text {
  font-size: 12px;
  color: var(--color-text-body, #3A3A3A);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .upload-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .compare-action { order: 3; }
  .image-preview-item, .image-add-more { width: 80px; height: 80px; }
  .ocr-text-compare { flex-direction: column; }
  .ocr-result-modal { width: 100%; max-width: 100%; height: 100vh; max-height: 100vh; border-radius: 0; }
}
</style>
