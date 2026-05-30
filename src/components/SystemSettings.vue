<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import {
  RiSettings3Line,
  RiText,
  RiFileDownloadLine,
  RiRobot2Line,
  RiFileWordLine,
  RiMarkdownLine,
  RiImageLine,
  RiFilterLine,
  RiCloseLine
} from '@remixicon/vue'
import { BorderBeam } from 'vue3-border-beam'

const {
  settings,
  saveSettings: handleSaveSettings,
  cancelSettings: handleCancelSettings,
  resetToDefault: handleResetToDefault
} = useSettings()

// 当前激活的标签页
const activeTab = ref('algorithm')

// 导航标签配置
const navTabs = [
  { key: 'algorithm', label: '对比算法', icon: RiSettings3Line },
  { key: 'preprocess', label: '文本设置', icon: RiText },
  { key: 'features', label: '参数设置', icon: RiFilterLine },
  { key: 'export', label: '导出设置', icon: RiFileDownloadLine },
  { key: 'ai', label: '模型设置', icon: RiRobot2Line }
]

const handleReset = () => {
  if (window.confirm('确定要恢复默认设置吗？所有修改将丢失。')) {
    handleResetToDefault()
  }
}

const handleSaveWithConfirm = () => {
  if (window.confirm('确定要保存当前设置吗？')) {
    handleSaveSettings()
  }
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

// AI 模型选项
const aiModels = [
  {
    value: 'deepseek',
    label: 'DeepSeek'
  },
  {
    value: 'qwen',
    label: 'Qwen'
  },
  {
    value: 'openai',
    label: 'OpenAI'
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

    <!-- 设置内容区 - 左侧导航 + 右侧内容 -->
    <div class="settings-layout">
      <!-- 左侧导航 -->
      <nav class="settings-nav">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="nav-tab-icon" />
          <span class="nav-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- 右侧设置内容 -->
      <div class="settings-content">
        <!-- 对比算法 -->
        <div v-if="activeTab === 'algorithm'" class="settings-section">
          <h2 class="section-title">对比算法</h2>
          
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
              <label class="setting-label">最小查重字数</label>
              <p class="setting-desc">标记为重复的最少连续字符数</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.minDupChars = Math.max(5, settings.minDupChars - 5)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.minDupChars" class="stepper-input" @input="settings.minDupChars = clampNumber($event.target.value, 5, 200)" />
              <button class="stepper-btn" @click="settings.minDupChars = Math.min(200, settings.minDupChars + 5)">
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

        <!-- 文本设置 -->

        <!-- 文本设置 -->
        <div v-if="activeTab === 'preprocess'" class="settings-section">
          <h2 class="section-title">文本设置</h2>
          
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

        <!-- 查重参数设置 -->
        <div v-if="activeTab === 'features'" class="settings-section">
          <h2 class="section-title">参数设置</h2>
          
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">水印文字剔除</label>
              <p class="setting-desc">解析时自动过滤常见水印文字</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.removeWatermark" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">相同条款剔除</label>
              <p class="setting-desc">启用后自动剔除招标文件中完全相同的条款</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.clauseRemovalEnabled" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row" v-if="settings.clauseRemovalEnabled">
            <div class="setting-label-group">
              <label class="setting-label">剔除颗粒度</label>
              <p class="setting-desc">条款剔除的最小连续相同字符数</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.max(2, settings.clauseRemovalGranularity - 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <input type="text" :value="settings.clauseRemovalGranularity" class="stepper-input" @input="settings.clauseRemovalGranularity = clampNumber($event.target.value, 2, 50)" />
              <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.min(50, settings.clauseRemovalGranularity + 1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">图片查重</label>
              <p class="setting-desc">开启后只对比上传图片中的雷同文字</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.enableImageCompare" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">OCR 文字识别</label>
              <p class="setting-desc">开启后对 Word/PDF 中的图片进行文字识别对比</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.enableOCRCompare" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row" v-if="settings.enableOCRCompare">
            <div class="setting-label-group">
              <label class="setting-label">OCR 识别语言</label>
              <p class="setting-desc">选择图片文字识别的语言</p>
            </div>
            <select v-model="settings.ocrLanguage" class="select-input">
              <option value="chi_sim+eng">中文简体 + 英文</option>
              <option value="chi_tra+eng">中文繁体 + 英文</option>
              <option value="eng">英文</option>
              <option value="chi_sim">中文简体</option>
            </select>
          </div>

          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">多文件对比</label>
              <p class="setting-desc">开启后可同时对比多个文件（3个以上）</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.enableMultiFileCompare" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row" v-if="settings.enableMultiFileCompare">
            <div class="setting-label-group">
              <label class="setting-label">最大文件数量</label>
              <p class="setting-desc">单次对比最多支持的文件数</p>
            </div>
            <input type="number" 
                   v-model.number="settings.maxMultiFileCount" 
                   min="3" 
                   max="20"
                   class="number-input" />
          </div>
        </div>

        <!-- 导出设置 -->
        <div v-if="activeTab === 'export'" class="settings-section">
          <h2 class="section-title">导出设置</h2>
          
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

        <!-- 模型设置 -->
        <div v-if="activeTab === 'ai'" class="settings-section">
          <h2 class="section-title">模型设置</h2>
          
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
              <label class="setting-label">API Key</label>
              <p class="setting-desc">用于身份验证的 API 密钥</p>
            </div>
            <input type="password" v-model="settings.apiKey" class="setting-input api-input" placeholder="sk-..." />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons-card">
          <div class="action-buttons">
            <BorderBeam size="sm" color-variant="mono" theme="light" :duration="2.5">
              <button class="btn btn-reset" @click="handleReset">恢复默认</button>
            </BorderBeam>
            <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
              <button class="btn btn-save" @click="handleSaveWithConfirm">保存设置</button>
            </BorderBeam>
          </div>
        </div>
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

/* 布局 - 左侧导航 + 右侧内容 */
.settings-layout {
  display: flex;
  gap: 24px;
  min-height: calc(100vh - 180px);
  padding: 0 24px 24px 24px;
  overflow-y: auto;
}

/* 左侧导航 */
.settings-nav {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 2px solid rgba(139, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.1);
  align-self: stretch;
}

.settings-nav::after {
  content: '';
  flex: 1;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(101, 70, 40, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.6);
  color: rgba(44, 24, 16, 1);
}

.nav-tab.active {
  background: rgba(139, 0, 0, 0.08);
  color: rgba(139, 0, 0, 1);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.1);
}

.nav-tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-tab.active .nav-tab-icon {
  color: rgba(139, 0, 0, 1);
}

.nav-tab-label {
  flex: 1;
}

/* 右侧内容 */
.settings-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.settings-section {
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.06);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  font-family: SourceHanSans-SemiBold;
}

/* 设置行 */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid rgba(166, 124, 82, 0.08);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row.radio-row {
  align-items: flex-start;
}

.setting-label-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
}

.setting-desc {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.6);
  margin: 0;
}

/* 数字步进器 */
.number-stepper {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(248, 244, 233, 0.5);
  border-radius: 8px;
  padding: 4px;
}

.stepper-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: white;
  color: rgba(101, 70, 40, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.stepper-btn:hover {
  background: rgba(46, 89, 132, 0.1);
  color: rgba(46, 89, 132, 1);
}

.stepper-input {
  width: 48px;
  height: 28px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
}

.stepper-input:focus {
  outline: none;
}

/* 开关 */
.switch {
  position: relative;
  width: 44px;
  height: 24px;
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
  background: rgba(166, 124, 82, 0.3);
  border-radius: 24px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.switch input:checked + .slider {
  background: rgba(139, 0, 0, 0.8);
}

.switch input:checked + .slider:before {
  transform: translateX(20px);
}

/* 数字输入框 */
.number-input {
  width: 80px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  background: white;
  color: rgba(44, 24, 16, 1);
}

.number-input:focus {
  outline: none;
  border-color: rgba(46, 89, 132, 0.5);
}

/* 文本输入框 */
.setting-input {
  width: 240px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: rgba(44, 24, 16, 1);
}

.setting-input:focus {
  outline: none;
  border-color: rgba(46, 89, 132, 0.5);
}

.api-input {
  width: 100%;
  max-width: 400px;
}

.select-input {
  width: 200px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: rgba(44, 24, 16, 1);
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: rgba(46, 89, 132, 0.5);
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.radio-box-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(166, 124, 82, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.radio-box-item:hover {
  border-color: rgba(139, 0, 0, 0.4);
}

.radio-box-item.active {
  border-color: rgba(139, 0, 0, 0.8);
  background: rgba(139, 0, 0, 0.05);
}

.radio-box-item input {
  display: none;
}

.radio-box {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(166, 124, 82, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-box-item.active .radio-box {
  border-color: rgba(139, 0, 0, 1);
}

.radio-box-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s;
}

.radio-box-item.active .radio-box-inner {
  background: rgba(139, 0, 0, 1);
}

.radio-box-icon,
.radio-box-icon-svg {
  width: 18px;
  height: 18px;
  color: rgba(101, 70, 40, 0.7);
}

.radio-box-item.active .radio-box-icon,
.radio-box-item.active .radio-box-icon-svg {
  color: rgba(139, 0, 0, 1);
}

.radio-box-label {
  font-size: 13px;
  color: rgba(44, 24, 16, 0.9);
}

/* 操作按钮卡片区 */
.action-buttons-card {
  margin-top: 24px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.06);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn {
  width: 140px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset {
  background: white;
  color: rgba(101, 70, 40, 0.8);
  border: 1px solid rgba(166, 124, 82, 0.3);
}

.btn-reset:hover {
  background: rgba(248, 244, 233, 0.5);
  border-color: rgba(166, 124, 82, 0.5);
}

.btn-save {
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.btn-save:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-1px);
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .nav-tab {
    white-space: nowrap;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-input,
  .api-input {
    width: 100%;
  }
}
</style>
