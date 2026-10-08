<template>
  <div class="image-compare-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">图片对比</h1>
          <p class="page-subtitle">上传图片进行雷同检测和OCR文字识别</p>
        </div>
      </div>
    </div>

    <!-- 图片上传区域 -->
    <div class="upload-section">
      <!-- 左侧图片上传 -->
      <div class="image-upload-card">
        <div class="upload-title">
          <span class="title-decoration" style="background-color: var(--color-cinnabar)"></span>
          <span class="title-text">左侧图片</span>
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
              <span class="image-format-badge">JPEG</span>
              <span class="image-format-badge">GIF</span>
              <span class="image-format-badge">WEBP</span>
              <span class="image-format-badge">BMP</span>
            </div>
          </div>
          <!-- 已上传预览 -->
          <div v-else class="image-preview-grid">
            <div v-for="(img, idx) in leftImages" :key="idx" class="image-preview-item">
              <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
              <button class="image-preview-remove" @click.stop="removeLeftImage(idx)">×</button>
              <div class="image-preview-name">{{ img.name }}</div>
            </div>
            <div class="image-add-more" @click.stop="triggerLeftInput">
              <RiAddLine class="image-add-icon" />
              <span>继续添加</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片对比按钮 -->
      <div class="compare-circle-wrapper">
        <BorderBeam size="md" color-variant="colorful" theme="dark" :duration="2.4">
          <button class="compare-circle-btn" @click="runImageComparison" :disabled="isProcessing || leftImages.length === 0 || rightImages.length === 0">
            <RiExchangeLine class="compare-circle-icon" :class="{ 'rotating': isProcessing }" />
            <span class="compare-circle-text">{{ isProcessing ? '对比中...' : '图片对比' }}</span>
          </button>
        </BorderBeam>
      </div>

      <!-- 右侧图片上传 -->
      <div class="image-upload-card">
        <div class="upload-title">
          <span class="title-decoration" style="background-color: var(--color-cloud-blue)"></span>
          <span class="title-text">右侧图片</span>
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
              <span class="image-format-badge">JPEG</span>
              <span class="image-format-badge">GIF</span>
              <span class="image-format-badge">WEBP</span>
              <span class="image-format-badge">BMP</span>
            </div>
          </div>
          <!-- 已上传预览 -->
          <div v-else class="image-preview-grid">
            <div v-for="(img, idx) in rightImages" :key="idx" class="image-preview-item">
              <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
              <button class="image-preview-remove" @click.stop="removeRightImage(idx)">×</button>
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

    <!-- OCR 图片文字识别区域 -->
    <div class="ocr-section" v-if="ocrAvailable && settings.enableOCRCompare && leftImages.length > 0 && rightImages.length > 0">
      <div class="ocr-section-header">
        <RiImageLine class="ocr-section-icon" />
        <span>图片文字识别</span>
        <span class="ocr-section-hint">识别图片中的文字并对比</span>
      </div>
      <div class="ocr-actions">
        <BorderBeam size="sm" color-variant="ocean" theme="dark" :duration="2.5">
          <button 
            class="ocr-compare-btn" 
            @click="runOCRComparison" 
            :disabled="isOCRProcessing"
          >
            <RiExchangeLine class="ocr-btn-icon" />
            <span>{{ isOCRProcessing ? '识别中...' : '图片文字识别对比' }}</span>
          </button>
        </BorderBeam>
      </div>
      <div v-if="isOCRProcessing" class="ocr-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${Math.round(ocrProgress * 100)}%` }"></div>
        </div>
        <span class="progress-text">{{ ocrProgressMessage }} {{ Math.round(ocrProgress * 100) }}%</span>
      </div>
    </div>

    <!-- 图片对比结果 -->
    <div class="image-result-section" v-if="imageDuplicates.length > 0">
      <div class="result-header">
        <h3>图片对比结果</h3>
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

    <!-- OCR 结果弹窗 -->
    <div v-if="showOCRResult" class="help-modal-overlay" @click="showOCRResult = false">
      <div class="ocr-result-modal" @click.stop>
        <div class="help-modal-header">
          <h3>图片文字识别结果</h3>
          <button class="help-close-btn" @click="showOCRResult = false">×</button>
        </div>
        <div class="ocr-result-body">
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

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { RiImageLine, RiExchangeLine, RiAddLine } from '@remixicon/vue'
import { useSettings } from '../composables/useSettings'
import { computeImageHash, hammingDistance, calculateImageSimilarity, loadImageAsDataUrl } from '../utils/imageCompare'
import { recognizeImages, isOCRAvailable } from '../utils/ocr'
import type { OCRResult } from '../utils/ocr'
import { BorderBeam } from 'vue3-border-beam'

const { settings } = useSettings()

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
  if (leftImages.value.length === 0 || rightImages.value.length === 0) return

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
  } catch (error) {
    // 图片对比失败
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
  if (leftImages.value.length === 0 || rightImages.value.length === 0) return

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
  } catch (error) {
    // OCR 对比失败
  } finally {
    isOCRProcessing.value = false
    ocrProgress.value = 0
    ocrProgressMessage.value = ''
  }
}
</script>

<style scoped>
.image-compare-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-parchment);
  gap: var(--spacing-3);
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
  font-family: var(--font-ui);
}

.upload-section {
  display: flex;
  gap: var(--spacing-5);
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-6);
  position: relative;
}

.image-upload-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 547px;
  flex: 1;
}

.image-upload-card .upload-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.image-upload-card .title-decoration {
  width: 5px;
  height: 24px;
  border-radius: var(--radius-xs);
}

.image-upload-card .title-text {
  font-size: var(--text-heading-lg);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.image-upload-card .upload-area {
  flex: 1;
  border: 0.7px solid var(--color-tan-dark);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  min-height: 300px;
}

.image-upload-card .upload-area:hover {
  border-color: var(--color-cinnabar);
  box-shadow: var(--shadow-cinnabar-hover);
}

.image-upload-card .file-input {
  display: none;
}

.image-upload-card .upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  padding: var(--spacing-6);
  gap: 8px;
}

.image-upload-card .upload-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--color-cream-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-6);
  transition: all var(--transition-normal);
}

.image-upload-card .upload-area:hover .upload-icon-wrapper {
  background: var(--color-cream-dark);
  transform: scale(1.05);
}

.image-upload-card .upload-icon {
  font-size: 40px;
  color: var(--color-brown-muted);
}

.image-upload-card .upload-main-text {
  font-size: var(--text-heading);
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin-bottom: var(--spacing-4);
}

.image-format-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.image-format-badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-cream-dark);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-brown);
  transition: all var(--transition-fast);
}

.image-format-badge:hover {
  background: var(--color-cream-darker);
  transform: translateY(-1px);
}

/* 图片预览网格 */
.image-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: var(--spacing-4);
  min-height: 300px;
  align-content: flex-start;
  box-sizing: border-box;
}

.image-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-tan-border);
  flex-shrink: 0;
}

.image-preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 10px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.image-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(var(--rgb-cinnabar), 0.85);
  color: white;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: 2;
}

.image-preview-item:hover .image-preview-remove {
  opacity: 1;
}

.image-add-more {
  width: 100px;
  height: 100px;
  border: 2px dashed var(--color-tan-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: var(--color-brown-muted);
  font-size: 11px;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.image-add-more:hover {
  border-color: var(--color-brown-muted);
  color: var(--color-brown);
  background: var(--color-parchment);
}

.image-add-icon {
  font-size: 24px;
}

.compare-circle-wrapper {
  flex-shrink: 0;
}

.compare-circle-btn {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-cinnabar);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: var(--shadow-cinnabar);
  transition: all var(--transition-normal);
}

.compare-circle-btn:hover:not(:disabled) {
  transform: scale(1.05);
  background: var(--color-cinnabar-dark);
}

.compare-circle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-brown-muted);
  box-shadow: var(--shadow-sm);
}

.compare-circle-icon {
  font-size: 28px;
  transition: transform var(--transition-normal);
}

.compare-circle-icon.rotating {
  animation: rotate 1s linear infinite;
}

.compare-circle-text {
  font-size: var(--text-caption);
  font-weight: 600;
  font-family: var(--font-ui);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-display {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: var(--color-cream-darker);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-jade-light);
  transition: width var(--transition-normal);
  border-radius: var(--radius-xs);
}

.progress-text {
  font-size: var(--text-caption);
  color: var(--color-brown);
  text-align: center;
}

.ocr-section {
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.ocr-section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-brown-dark);
}

.ocr-section-icon {
  font-size: 18px;
  color: var(--color-cloud-blue);
}

.ocr-section-hint {
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-brown);
}

.ocr-actions {
  display: flex;
  gap: var(--spacing-3);
}

.ocr-compare-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 10px 20px;
  background: var(--color-cloud-blue);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-body);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.ocr-compare-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.ocr-compare-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ocr-btn-icon {
  font-size: 16px;
}

.ocr-progress {
  margin-top: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-result-section {
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.result-header h3 {
  margin: 0;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-brown-dark);
}

.result-count {
  font-size: var(--text-caption);
  color: var(--color-cinnabar);
  font-weight: 500;
}

.image-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.image-result-card {
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  border: 1px solid var(--color-tan-border);
}

.image-result-pair {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.image-result-side {
  flex: 1;
  text-align: center;
}

.result-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  border-radius: var(--radius-xs);
  background: var(--color-white);
  border: 1px solid var(--color-tan-light);
}

.image-label {
  display: block;
  font-size: 11px;
  color: var(--color-brown);
  margin-top: 4px;
}

.similarity-badge {
  padding: 6px 12px;
  background: rgba(var(--rgb-brown), 0.1);
  border-radius: var(--radius-full);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-brown);
  flex-shrink: 0;
}

.similarity-badge.high {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.ocr-result-modal {
  background: var(--color-cream);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.ocr-result-body {
  padding: var(--spacing-4) var(--spacing-6);
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.ocr-compare-summary {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-5);
}

.ocr-similarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-4) 32px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-tan-border);
}

.ocr-similarity-label {
  font-size: var(--text-body-sm);
  color: var(--color-brown);
  margin-bottom: 4px;
}

.ocr-similarity-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-brown-dark);
}

.ocr-similarity-value.high {
  color: var(--color-cinnabar);
}

.ocr-text-compare {
  display: flex;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
}

.ocr-text-column {
  flex: 1;
  min-width: 0;
}

.ocr-column-header {
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: var(--spacing-2);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-tan-border);
}

.ocr-text-content {
  padding: var(--spacing-3);
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-light);
  font-size: var(--text-body-sm);
  line-height: 1.6;
  color: rgba(var(--rgb-brown-dark), 0.9);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.ocr-detail-section {
  border-top: 1px solid var(--color-tan-border);
  padding-top: var(--spacing-4);
}

.ocr-detail-header {
  font-size: var(--text-body-sm);
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: var(--spacing-3);
}

.ocr-detail-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.ocr-detail-item {
  padding: 10px 12px;
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
}

.ocr-detail-name {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: 4px;
}

.ocr-detail-confidence {
  font-size: 11px;
  color: var(--color-brown);
  margin-bottom: 4px;
}

.ocr-detail-confidence .high {
  color: var(--color-jade);
}

.ocr-detail-text {
  font-size: var(--text-caption);
  color: rgba(var(--rgb-brown-dark), 0.8);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.help-modal-overlay {
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

.help-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4) var(--spacing-6);
  border-bottom: 1px solid var(--color-tan-border);
}

.help-modal-header h3 {
  margin: 0;
  font-size: var(--text-heading);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.help-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-parchment);
  color: var(--color-brown);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.help-close-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

@media (max-width: 768px) {
  .image-compare-container {
    gap: 10px;
    overflow-y: auto;
  }

  .page-header {
    padding: 12px 14px;
  }

  .page-title {
    font-size: 17px;
  }

  .page-subtitle {
    font-size: 11px;
  }

  .upload-section {
    flex-direction: column;
    gap: 14px;
    padding: 0 12px;
  }

  .image-upload-card {
    max-width: 100%;
    width: 100%;
  }

  .image-upload-card .upload-area {
    min-height: 220px;
  }

  .image-upload-card .upload-placeholder {
    min-height: 220px;
  }

  .compare-circle-wrapper {
    order: 99;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .compare-circle-btn {
    width: 80px;
    height: 80px;
  }

  .compare-circle-icon {
    font-size: 24px;
  }

  .compare-circle-text {
    font-size: 11px;
  }

  .image-upload-card .title-text {
    font-size: 16px;
  }

  .ocr-section {
    margin: 0 12px;
    padding: 12px 14px;
  }

  .ocr-compare-btn {
    width: 100%;
    justify-content: center;
  }

  .image-result-section {
    margin: 0 12px 12px;
    padding: 12px 14px;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .image-result-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .image-result-pair {
    flex-direction: column;
    gap: 8px;
  }

  .result-image {
    height: 100px;
  }

  .ocr-result-modal {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .ocr-result-body {
    padding: 12px 14px;
  }

  .ocr-text-compare {
    flex-direction: column;
    gap: 12px;
  }

  .help-modal-overlay {
    padding: 0;
  }

  .ocr-similarity-badge {
    padding: 12px 20px;
  }

  .ocr-similarity-value {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .image-preview-item,
  .image-add-more {
    width: 80px;
    height: 80px;
  }

  .image-preview-name {
    font-size: 9px;
  }
}
</style>
