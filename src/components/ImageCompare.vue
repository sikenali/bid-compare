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
          <span class="title-decoration" style="background-color: rgba(139,0,0,1)"></span>
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
          <span class="title-decoration" style="background-color: rgba(46,89,132,1)"></span>
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
              <img :src="dup.leftImage" class="result-image" />
              <span class="image-label">{{ dup.leftPage }}</span>
            </div>
            <div class="similarity-badge" :class="{ 'high': dup.similarity >= 80 }">
              {{ dup.similarity }}%
            </div>
            <div class="image-result-side">
              <img :src="dup.rightImage" class="result-image" />
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
import { ref, computed } from 'vue'
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
  background-color: rgba(248, 244, 233, 1);
  gap: 12px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面标题区 */
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
  font-family: SourceHanSans-Regular;
}

/* 图片上传区域 - upload-section 布局 */
.upload-section {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  position: relative;
}

/* 图片上传卡片 */
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
  gap: 12px;
  margin-bottom: 16px;
}

.image-upload-card .title-decoration {
  width: 5px;
  height: 24px;
  border-radius: 2px;
}

.image-upload-card .title-text {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.image-upload-card .upload-area {
  flex: 1;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 300px;
}

.image-upload-card .upload-area:hover {
  border-color: rgba(139, 0, 0, 1);
  box-shadow: 0 6px 24px rgba(139, 0, 0, 0.12);
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
  padding: 24px;
  gap: 8px;
}

.image-upload-card .upload-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 9999px;
  background-color: rgba(245, 238, 226, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.image-upload-card .upload-area:hover .upload-icon-wrapper {
  background-color: rgba(245, 238, 226, 0.8);
  transform: scale(1.05);
}

.image-upload-card .upload-icon {
  font-size: 40px;
  color: rgba(166, 124, 82, 1);
}

.image-upload-card .upload-main-text {
  font-size: 18px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  margin-bottom: 16px;
}

/* 图片格式图标 */
.image-format-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.image-format-badge {
  padding: 4px 10px;
  border-radius: 6px;
  background-color: rgba(245, 238, 226, 0.8);
  font-size: 11px;
  font-weight: 500;
  color: rgba(101, 70, 40, 0.8);
  transition: all 0.2s;
}

.image-format-badge:hover {
  background-color: rgba(245, 238, 226, 1);
  transform: translateY(-1px);
}

/* 图片格式图标 */
.image-format-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.image-format-badge {
  padding: 4px 10px;
  border-radius: 6px;
  background-color: rgba(245, 238, 226, 0.8);
  font-size: 11px;
  font-weight: 500;
  color: rgba(101, 70, 40, 0.8);
  transition: all 0.2s;
}

.image-format-badge:hover {
  background-color: rgba(245, 238, 226, 1);
  transform: translateY(-1px);
}

/* 图片预览网格 */
.image-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  min-height: 300px;
  align-content: flex-start;
  box-sizing: border-box;
}

.image-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(166, 124, 82, 0.2);
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
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.85);
  color: white;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}

.image-preview-item:hover .image-preview-remove {
  opacity: 1;
}

/* 继续添加按钮 */
.image-add-more {
  width: 100px;
  height: 100px;
  border: 2px dashed rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: rgba(101, 70, 40, 0.6);
  font-size: 11px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.image-add-more:hover {
  border-color: rgba(166, 124, 82, 0.6);
  color: rgba(101, 70, 40, 0.9);
  background: rgba(248, 244, 233, 0.5);
}

.image-add-icon {
  font-size: 24px;
}

/* 对比圆形按钮 */
.compare-circle-wrapper {
  flex-shrink: 0;
}

.compare-circle-btn {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.35);
  transition: all 0.3s ease;
}

.compare-circle-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(139, 0, 0, 0.45);
}

.compare-circle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, rgba(150, 150, 150, 1) 0%, rgba(180, 180, 180, 1) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.compare-circle-icon {
  font-size: 28px;
  transition: transform 0.3s ease;
}

.compare-circle-icon.rotating {
  animation: rotate 1s linear infinite;
}

.compare-circle-text {
  font-size: 12px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 进度显示 */
.progress-display {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(166, 124, 82, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139, 0, 0, 1), rgba(196, 30, 58, 1));
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.8);
  text-align: center;
}

/* OCR 区域 */
.ocr-section {
  padding: 16px 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.ocr-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.ocr-section-icon {
  font-size: 18px;
  color: rgba(46, 89, 132, 1);
}

.ocr-section-hint {
  font-size: 12px;
  font-weight: 400;
  color: rgba(101, 70, 40, 0.6);
}

.ocr-actions {
  display: flex;
  gap: 12px;
}

.ocr-compare-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(46, 89, 132, 1), rgba(60, 110, 160, 1));
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.ocr-compare-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(46, 89, 132, 0.4);
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
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 图片对比结果 */
.image-result-section {
  padding: 16px 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.result-count {
  font-size: 12px;
  color: rgba(139, 0, 0, 1);
  font-weight: 500;
}

.image-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.image-result-card {
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.image-result-pair {
  display: flex;
  align-items: center;
  gap: 12px;
}

.image-result-side {
  flex: 1;
  text-align: center;
}

.result-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  border-radius: 4px;
  background: white;
  border: 1px solid rgba(166, 124, 82, 0.1);
}

.image-label {
  display: block;
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
  margin-top: 4px;
}

.similarity-badge {
  padding: 6px 12px;
  background: rgba(101, 70, 40, 0.1);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(101, 70, 40, 0.8);
  flex-shrink: 0;
}

.similarity-badge.high {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

/* OCR 结果弹窗 */
.ocr-result-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(44, 24, 16, 0.3);
}

.ocr-result-body {
  padding: 16px 24px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.ocr-compare-summary {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.ocr-similarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 32px;
  background: rgba(248, 244, 233, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.ocr-similarity-label {
  font-size: 13px;
  color: rgba(101, 70, 40, 0.8);
  margin-bottom: 4px;
}

.ocr-similarity-value {
  font-size: 28px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
}

.ocr-similarity-value.high {
  color: rgba(196, 30, 58, 1);
}

.ocr-text-compare {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.ocr-text-column {
  flex: 1;
  min-width: 0;
}

.ocr-column-header {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.ocr-text-content {
  padding: 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.1);
  font-size: 13px;
  line-height: 1.6;
  color: rgba(44, 24, 16, 0.9);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.ocr-detail-section {
  border-top: 1px solid rgba(166, 124, 82, 0.2);
  padding-top: 16px;
}

.ocr-detail-header {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 12px;
}

.ocr-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocr-detail-item {
  padding: 10px 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.ocr-detail-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 4px;
}

.ocr-detail-confidence {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
  margin-bottom: 4px;
}

.ocr-detail-confidence .high {
  color: rgba(76, 175, 80, 1);
}

.ocr-detail-text {
  font-size: 12px;
  color: rgba(44, 24, 16, 0.8);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 弹窗通用样式 */
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
  padding: 16px 24px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.help-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.help-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(248, 244, 233, 0.5);
  color: rgba(101, 70, 40, 0.8);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.help-close-btn:hover {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}
</style>
