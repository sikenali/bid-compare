<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import {
  RiSettings3Line,
  RiText,
  RiFileDownloadLine,
  RiRobot2Line,
  RiFileWordLine,
  RiMarkdownLine
} from '@remixicon/vue'

const {
  settings,
  saveSettings: handleSaveSettings,
  cancelSettings: handleCancelSettings,
  resetToDefault: handleResetToDefault
} = useSettings()

const handleReset = () => {
  handleResetToDefault()
}

// 数字范围限制工具函数
const clampNumber = (value: string | number, min: number, max: number): number => {
  const num = parseInt(String(value).replace(/\D/g, ''), 10)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

// 导出格式选项
const exportFormats = [
  { value: 'word', label: 'Word', icon: RiFileWordLine },
  { value: 'markdown', label: 'Markdown', icon: RiMarkdownLine }
]

// AI 模型选项 - 使用自定义 SVG 图标
const aiModels = [
  {
    value: 'deepseek',
    label: 'DeepSeek',
    iconColor: '#4D6BFE',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`
  },
  {
    value: 'kimi',
    label: 'Kimi',
    iconColor: '#10B981',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>`
  },
  {
    value: 'doubao',
    label: '豆包',
    iconColor: '#059669',
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>`
  }
]
</script>

<template>
  <div class="system-settings-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">系统设置</h1>
          <p class="page-subtitle">配置对比算法参数和系统功能选项</p>
        </div>
      </div>
    </div>

    <!-- 设置表单区 -->
    <div class="settings-form">
      <!-- 对比算法设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon algorithm">
            <RiSettings3Line class="icon" />
          </div>
          <h2 class="card-title">对比算法设置</h2>
        </div>
        <div class="card-content">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">N-gram 大小</label>
              <p class="setting-desc">设置文本分片的字符数量</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.ngramSize = Math.max(1, settings.ngramSize - 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.ngramSize" class="stepper-input" @input="settings.ngramSize = clampNumber($event.target.value, 1, 10)" />
              <button class="stepper-btn" @click="settings.ngramSize = Math.min(10, settings.ngramSize + 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最小匹配长度</label>
              <p class="setting-desc">连续匹配的最小字符数</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.minDuplicateWords = Math.max(1, settings.minDuplicateWords - 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.minDuplicateWords" class="stepper-input" @input="settings.minDuplicateWords = clampNumber($event.target.value, 1, 100)" />
              <button class="stepper-btn" @click="settings.minDuplicateWords = Math.min(100, settings.minDuplicateWords + 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">相似度阈值</label>
              <p class="setting-desc">文本片段相似度达到此百分比即标记为重复</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.max(1, settings.textSimilarityThreshold - 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.textSimilarityThreshold" class="stepper-input" @input="settings.textSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
              <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.min(100, settings.textSimilarityThreshold + 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">图像相似度阈值</label>
              <p class="setting-desc">图像相似度达到此百分比即标记为重复</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.max(1, settings.imageSimilarityThreshold - 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.imageSimilarityThreshold" class="stepper-input" @input="settings.imageSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
              <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.min(100, settings.imageSimilarityThreshold + 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最大结果数</label>
              <p class="setting-desc">最多显示的相似片段数量</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.maxResults = Math.max(10, settings.maxResults - 10)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.maxResults" class="stepper-input" @input="settings.maxResults = clampNumber($event.target.value, 10, 500)" />
              <button class="stepper-btn" @click="settings.maxResults = Math.min(500, settings.maxResults + 10)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文本预处理设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon preprocess">
            <RiText class="icon" />
          </div>
          <h2 class="card-title">文本预处理设置</h2>
        </div>
        <div class="card-content">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略大小写</label>
              <p class="setting-desc">对比时是否忽略英文字母大小写差异</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.ignoreCase" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略标点符号</label>
              <p class="setting-desc">对比时是否忽略标点符号差异</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.ignorePunctuation" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略空白字符</label>
              <p class="setting-desc">对比时是否忽略空格、制表符等空白字符</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.ignoreWhitespace" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略不可见字符</label>
              <p class="setting-desc">对比时是否忽略零宽字符等不可见字符</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.ignoreInvisibleChars" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 导出设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon export">
            <RiFileDownloadLine class="icon" />
          </div>
          <h2 class="card-title">导出设置</h2>
        </div>
        <div class="card-content">
          <!-- 默认导出格式 -->
          <div class="setting-row radio-row">
            <div class="setting-label-group">
              <label class="setting-label">默认导出格式</label>
              <p class="setting-desc">导出报告时默认使用的文件格式</p>
            </div>
            <div class="radio-group">
              <label
                v-for="format in exportFormats"
                :key="format.value"
                class="radio-box-item"
                :class="{ 'active': settings.exportFormat === format.value }"
              >
                <input type="radio" v-model="settings.exportFormat" :value="format.value" />
                <span class="radio-box">
                  <span class="radio-box-inner"></span>
                </span>
                <component :is="format.icon" class="radio-box-icon" />
                <span class="radio-box-label">{{ format.label }}</span>
              </label>
            </div>
          </div>
          <!-- 包含高亮样式 -->
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">包含高亮样式</label>
              <p class="setting-desc">导出的报告中包含内容高亮样式</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.includeHighlight" />
              <span class="slider"></span>
            </label>
          </div>
          <!-- 包含统计图表 -->
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">包含统计图表</label>
              <p class="setting-desc">导出的报告中包含统计图表</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.includeCharts" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- AI模型设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon ai-model">
            <RiRobot2Line class="icon" />
          </div>
          <h2 class="card-title">AI 模型设置</h2>
        </div>
        <div class="card-content">
          <!-- AI 模型选择 -->
          <div class="setting-row radio-row">
            <div class="setting-label-group">
              <label class="setting-label">AI 模型</label>
              <p class="setting-desc">选择用于分析的 AI 模型</p>
            </div>
            <div class="radio-group">
              <label
                v-for="model in aiModels"
                :key="model.value"
                class="radio-box-item"
                :class="{ 'active': settings.selectedModel === model.value }"
              >
                <input type="radio" v-model="settings.selectedModel" :value="model.value" />
                <span class="radio-box">
                  <span class="radio-box-inner"></span>
                </span>
                <span class="radio-box-icon-svg" v-html="model.iconSvg" :style="{ color: model.iconColor }"></span>
                <span class="radio-box-label">{{ model.label }}</span>
              </label>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">API 端点</label>
              <p class="setting-desc">API 请求地址，留空使用默认地址</p>
            </div>
            <input type="text" v-model="settings.apiEndpoint" class="setting-input api-input" placeholder="https://api.example.com" />
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">API 密钥</label>
              <p class="setting-desc">输入您的 API Key 以使用 AI 分析</p>
            </div>
            <input type="password" v-model="settings.apiKey" class="setting-input api-input" placeholder="sk-..." />
          </div>
        </div>
      </div>

      <!-- 操作按钮区 -->
      <div class="action-buttons">
        <button class="btn btn-reset" @click="handleReset">重置</button>
        <button class="btn btn-save" @click="handleSaveSettings">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-settings-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: rgba(248, 244, 233, 1);
  gap: 20px;
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
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

/* 设置表单区 */
.settings-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* 设置卡片 */
.settings-card {
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon.algorithm {
  background-color: rgba(219, 234, 254, 1);
}

.card-icon.preprocess {
  background-color: rgba(220, 252, 231, 1);
}

.card-icon.export {
  background-color: rgba(254, 243, 199, 1);
}

.card-icon.ai-model {
  background-color: rgba(233, 213, 255, 1);
}

.card-icon .icon {
  font-size: 18px;
}

.card-icon.algorithm .icon {
  color: rgba(37, 99, 235, 1);
}

.card-icon.preprocess .icon {
  color: rgba(34, 139, 34, 1);
}

.card-icon.export .icon {
  color: rgba(217, 119, 6, 1);
}

.card-icon.ai-model .icon {
  color: rgba(126, 34, 206, 1);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  box-sizing: border-box;
}

.setting-label-group {
  flex: 1;
}

.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  margin: 0 0 2px 0;
}

.setting-desc {
  font-size: 11px;
  color: rgba(101, 70, 40, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
  line-height: 1.3;
}

/* 输入框 - 按照设计图样式 */
.setting-input {
  width: 120px;
  height: 28px;
  padding: 4px 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  background-color: rgba(245, 238, 226, 1);
  font-family: SourceHanSans-Medium;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-sizing: border-box;
}

.setting-input:hover {
  background-color: rgba(235, 228, 216, 1);
  border-color: rgba(139, 0, 0, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.setting-input.api-input {
  width: 280px;
  text-align: left;
}

.setting-input:focus {
  outline: none;
  border-color: rgba(139, 0, 0, 1);
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(139, 0, 0, 0.1);
  transform: translateY(0);
}

/* 数字步进器 */
.number-stepper {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(216, 191, 156, 0.6);
  background-color: rgba(255, 255, 255, 1);
  transition: all 0.3s ease;
}

.number-stepper:hover {
  border-color: rgba(139, 0, 0, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stepper-btn {
  width: 36px;
  height: 36px;
  border: none;
  background-color: rgba(245, 238, 226, 1);
  color: rgba(139, 0, 0, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}

.stepper-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.stepper-btn:active {
  background-color: rgba(139, 0, 0, 0.2);
  transform: scale(0.95);
}

.stepper-input {
  width: 56px;
  height: 36px;
  border: none;
  border-left: 1px solid rgba(216, 191, 156, 0.3);
  border-right: 1px solid rgba(216, 191, 156, 0.3);
  background-color: rgba(255, 255, 255, 1);
  color: rgba(44, 24, 16, 1);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  font-family: SourceHanSans-SemiBold;
  flex-shrink: 0;
  outline: none;
  -moz-appearance: textfield;
}

.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Radio 按钮组 */
.radio-group {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.radio-row {
  align-items: center;
}

.radio-box-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border: 1.5px solid rgba(216, 191, 156, 0.4);
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
}

.radio-box-item input[type="radio"] {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.radio-box-item:hover {
  background-color: rgba(245, 238, 226, 1);
  border-color: rgba(139, 0, 0, 0.3);
}

.radio-box-item.active {
  background-color: rgba(139, 0, 0, 0.08);
  border-color: rgba(139, 0, 0, 1);
}

.radio-box {
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(166, 124, 82, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.radio-box-item.active .radio-box {
  border-color: rgba(139, 0, 0, 1);
  background-color: rgba(139, 0, 0, 1);
}

.radio-box-inner {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: transparent;
  transition: all 0.3s ease;
}

.radio-box-item.active .radio-box-inner {
  background-color: white;
}

.radio-box-icon-svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.radio-box-icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.radio-box-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Medium;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.radio-box-item.active .radio-box-label {
  color: rgba(139, 0, 0, 1);
  font-weight: 600;
}

/* 开关按钮 */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(216, 191, 156, 0.4);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: rgba(139, 0, 0, 1);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* 操作按钮区 */
.action-buttons {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  padding-bottom: 20px;
}

.btn {
  width: 160px;
  height: 40px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-reset {
  background-color: rgba(255, 255, 255, 1);
  color: rgba(139, 0, 0, 1);
  border: 1px solid rgba(139, 0, 0, 0.3);
}

.btn-reset:hover {
  background-color: rgba(139, 0, 0, 0.05);
  border-color: rgba(139, 0, 0, 1);
}

.btn-save {
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.btn-save:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .system-settings-container {
    padding-bottom: 120px;
  }

  .settings-form {
    grid-template-columns: 1fr;
    gap: 12px;
    padding-bottom: 0;
  }

  .settings-card {
    padding: 12px;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 10px;
  }

  .setting-input {
    width: 100%;
  }

  .setting-input.api-input {
    width: 100%;
  }

  .radio-group {
    width: 100%;
    justify-content: flex-start;
  }

  .page-title {
    font-size: 18px;
  }

  .card-title {
    font-size: 15px;
  }

  .setting-label {
    font-size: 14px;
  }

  .setting-desc {
    font-size: 12px;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(248, 244, 233, 1);
    padding: 12px 16px;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  }

  .btn {
    width: 100%;
    height: 48px;
  }
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .settings-form {
    gap: 16px;
  }
}

/* 移动端隐藏 page-header */
@media (max-width: 768px) {
  .page-header {
    display: none;
  }
}
</style>
