<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
  RiCloseLine,
  RiPaletteLine,
  RiCheckLine,
  RiEyeOffLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiRobotLine,
  RiOpenaiFill,
  RiFileWord2Line,
  RiKeyLine,
  RiAddLine
} from '@remixicon/vue'
const {
  settings,
  saveSettings: handleSaveSettings,
  cancelSettings: handleCancelSettings,
  resetToDefault: handleResetToDefault
} = useSettings()

const activeTab = ref('theme')

const navColors: Record<string, string> = {
  theme: '#C23B22',
  algorithm: '#C23B22',
  preprocess: '#5B8C5A',
  features: '#C8A45C',
  export: '#2D6A9F',
  ai: '#6366F1'
}

const navTabs = [
  { key: 'theme', label: '主题设置', icon: RiPaletteLine, color: '#C23B22' },
  { key: 'algorithm', label: '对比算法', icon: RiSettings3Line, color: '#C23B22' },
  { key: 'preprocess', label: '文本设置', icon: RiText, color: '#5B8C5A' },
  { key: 'features', label: '参数设置', icon: RiFilterLine, color: '#C8A45C' },
  { key: 'export', label: '导出设置', icon: RiFileDownloadLine, color: '#2D6A9F' },
  { key: 'ai', label: '模型设置', icon: RiRobot2Line, color: '#6366F1' }
]

const indicatorStyle = computed(() => {
  const idx = navTabs.findIndex(t => t.key === activeTab.value)
  const itemHeight = 48
  const gap = 4
  const navTitleOffset = 56
  return {
    top: `${navTitleOffset + idx * (itemHeight + gap)}px`,
    height: `${itemHeight}px`,
    background: navColors[activeTab.value] || '#C23B22'
  }
})

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

const handleCancel = () => {
  handleCancelSettings()
}

const handleThemeChange = (theme: string) => {
  settings.theme = theme
  document.documentElement.dataset.theme = theme === 'light' ? '' : theme
}

const themes = [
  {
    id: 'light', name: '羊皮纸', desc: '温润雅致 · 默认主题',
    previewBg: '#FBF7F0', navBg: '#F5EFE3', logoBg: '#C23B22',
    brandColor: '#3D2B1F', sidebarBg: '#F5EFE3', card1Bg: '#F0E8D8', card2Bg: '#F5EFE3',
    textColor: '#C23B22',
  },
  {
    id: 'dark', name: '深色', desc: '深邃护眼 · 夜间模式',
    previewBg: '#2C2416', navBg: '#3D3224', logoBg: '#C23B22',
    brandColor: '#E8DCC8', sidebarBg: '#3D3224', card1Bg: '#4A3D2C', card2Bg: '#3D3224',
    textColor: '#E8DCC8',
  },
  {
    id: 'paper', name: '白纸', desc: '清爽干净 · 极简模式',
    previewBg: '#FFFFFF', navBg: '#F5F5F5', logoBg: '#C23B22',
    brandColor: '#3D2B1F', sidebarBg: '#F5F5F5', card1Bg: '#F0F0F0', card2Bg: '#F5F5F5',
    textColor: '#3D2B1F',
  },
]

const clampNumber = (value: string | number, min: number, max: number): number => {
  const num = parseInt(String(value).replace(/\D/g, ''), 10)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

const exportFormats = [
  { value: 'word', label: 'Word 格式', ext: '.docx', icon: RiFileWord2Line, iconBg: '#E8F0F8', iconColor: '#2D6A9F' },
  { value: 'markdown', label: 'Markdown 格式', ext: '.md', icon: RiMarkdownLine, iconBg: '#F0E8D8', iconColor: '#8B7355' }
]

const wordFeatures = ['保留完整格式与排版样式', '支持表格、图片、页眉页脚', '兼容 Microsoft Word / WPS', '支持目录自动生成']
const mdFeatures = ['纯文本格式，轻量易读', '适合版本管理与协作', '可快速转换为 HTML/PDF', '兼容各类 Markdown 编辑器']

const aiModels = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'openai', label: 'OpenAI' }
]

interface ModelItem {
  id: string
  name: string
  icon: any
  provider: string
  model: string
}

const domesticModels: ModelItem[] = [
  { id: 'qwen', name: '通义千问', icon: RiRobotLine, provider: '阿里云', model: 'qwen-turbo' },
  { id: 'wenxin', name: '文心一言', icon: RiRobotLine, provider: '百度', model: 'ernie-4.0' },
  { id: 'glm', name: '智谱 GLM', icon: RiRobotLine, provider: '智谱', model: 'glm-4' },
]

const foreignModels: ModelItem[] = [
  { id: 'gpt4o', name: 'GPT-4o', icon: RiOpenaiFill, provider: 'OpenAI', model: 'gpt-4o' },
  { id: 'claude', name: 'Claude 3.5', icon: RiRobotLine, provider: 'Anthropic', model: 'claude-3-5-sonnet' },
]

const configTab = ref<'provider' | 'custom'>('provider')
const customProvider = ref('')
const customModel = ref('')
const apiKeyValue = ref('')
const keyVisible = ref(false)
const savedKeys = ref<Array<{ id: string; provider: string; model: string; key: string }>>([])

// 从已有 settings.apiKey 初始化
onMounted(() => {
  if (settings.apiKey) {
    savedKeys.value.push({
      id: 'default',
      provider: '自定义',
      model: settings.selectedModel || '',
      key: settings.apiKey,
    })
  }
})

const addApiKeyEntry = () => {
  const key = apiKeyValue.value.trim()
  if (!key) {
    window.alert('请输入 API Key')
    return
  }
  if (configTab.value === 'custom') {
    if (!customProvider.value.trim() || !customModel.value.trim()) {
      window.alert('请填写服务商和模型名称')
      return
    }
    savedKeys.value.push({
      id: Date.now().toString(),
      provider: customProvider.value.trim(),
      model: customModel.value.trim(),
      key: key,
    })
  } else {
    const currentModel = domesticModels.find(m => m.id === settings.selectedModel) || foreignModels.find(m => m.id === settings.selectedModel)
    if (currentModel) {
      savedKeys.value.push({
        id: Date.now().toString(),
        provider: currentModel.provider,
        model: currentModel.model,
        key: key,
      })
    }
  }
  settings.apiKey = key
  apiKeyValue.value = ''
  customProvider.value = ''
  customModel.value = ''
}

const removeApiKey = (id: string) => {
  const removed = savedKeys.value.find(k => k.id === id)
  savedKeys.value = savedKeys.value.filter(k => k.id !== id)
  if (removed && removed.key === settings.apiKey) {
    settings.apiKey = savedKeys.value.length > 0 ? savedKeys.value[savedKeys.value.length - 1].key : ''
  }
}

const resetApiForm = () => {
  apiKeyValue.value = ''
  customProvider.value = ''
  customModel.value = ''
  keyVisible.value = false
}
</script>

<template>
  <div class="system-settings-container">
    <div class="settings-layout">
      <nav class="settings-nav">
        <div class="nav-title">系统设置</div>
        <div class="nav-indicator" :style="indicatorStyle" />
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="nav-tab-icon" size="20" />
          <span class="nav-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="settings-content">
        <div class="content-header">
          <div class="content-header-left">
            <div class="content-header-texts">
              <h3 class="content-title">{{ navTabs.find(t => t.key === activeTab)?.label }}</h3>
              <span class="content-subtitle">{{ activeTab === 'theme' ? '选择你喜欢的界面风格' : activeTab === 'algorithm' ? '配置对比算法参数' : activeTab === 'preprocess' ? '配置文本处理选项' : activeTab === 'features' ? '配置查重参数' : activeTab === 'export' ? '配置导出默认格式' : '配置 AI 模型与密钥' }}</span>
            </div>
          </div>
          <div class="content-header-actions">
            <button class="action-btn-cancel" @click="handleCancel">取消</button>
            <button class="action-btn-save" @click="handleSaveWithConfirm">保存</button>
          </div>
        </div>

        <div class="content-scroll">
          <!-- 主题设置 -->
          <div v-if="activeTab === 'theme'" class="panel">
            <div class="theme-cards-row">
              <div
                v-for="t in themes"
                :key="t.id"
                class="theme-card-new"
                :class="{ 'theme-card-selected': settings.theme === t.id }"
                @click="handleThemeChange(t.id)"
              >
                <div class="theme-preview-area" :style="{ background: t.previewBg }">
                  <div class="theme-preview-nav" :style="{ background: t.navBg }">
                    <div class="preview-logo" :style="{ background: t.logoBg }" />
                    <span class="preview-brand" :style="{ color: t.brandColor }">文比猩</span>
                  </div>
                  <div class="theme-preview-body">
                    <div class="preview-sidebar" :style="{ background: t.sidebarBg }" />
                    <div class="preview-content">
                      <div class="preview-card" :style="{ background: t.card1Bg }" />
                      <div class="preview-card-sm" :style="{ background: t.card2Bg }" />
                    </div>
                  </div>
                </div>
                <div class="theme-info-area">
                  <div class="theme-info-texts">
                    <span class="theme-info-name" :style="{ color: t.textColor }">{{ t.name }}</span>
                    <span class="theme-info-desc">{{ t.desc }}</span>
                  </div>
                  <div class="theme-check-circle" :class="{ 'theme-checked-circle': settings.theme === t.id }">
                    <RiCheckLine v-if="settings.theme === t.id" size="14" color="#fff" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 对比算法 -->
          <div v-if="activeTab === 'algorithm'" class="panel">
            <div class="settings-card">
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
          </div>

          <!-- 文本设置 -->
          <div v-if="activeTab === 'preprocess'" class="panel">
            <div class="settings-card">
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

          <!-- 参数设置 -->
          <div v-if="activeTab === 'features'" class="panel">
            <div class="settings-card">
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
          </div>

          <!-- 导出设置 -->
          <div v-if="activeTab === 'export'" class="panel">
            <div class="export-cards-row">
              <div
                v-for="(fmt, idx) in exportFormats"
                :key="fmt.value"
                class="export-card-item"
                :class="{ 'export-card-selected': settings.exportFormat === fmt.value }"
                @click="settings.exportFormat = fmt.value"
              >
                <div class="export-card-header">
                  <div class="export-card-icon" :style="{ background: fmt.iconBg }">
                    <component :is="fmt.icon" size="28" :color="fmt.iconColor" />
                  </div>
                  <div class="export-card-titles">
                    <span class="export-card-name">{{ fmt.label }}</span>
                    <span class="export-card-ext">{{ fmt.ext }}</span>
                  </div>
                  <div class="export-check" :class="{ 'export-checked': settings.exportFormat === fmt.value }">
                    <RiCheckLine v-if="settings.exportFormat === fmt.value" size="18" color="#fff" />
                  </div>
                </div>
                <div class="export-features">
                  <div v-for="f in (idx === 0 ? wordFeatures : mdFeatures)" :key="f" class="export-feature">
                    <RiCheckLine size="16" color="#2D8A4E" />
                    <span>{{ f }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="setting-row" style="margin-top: 24px;">
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
          <div v-if="activeTab === 'ai'" class="panel api-full-panel">
            <div class="model-list">
              <span class="model-section">国内模型</span>
              <div
                v-for="m in domesticModels"
                :key="m.id"
                class="model-item"
                :class="{ 'model-item-active': settings.selectedModel === m.id }"
                @click="settings.selectedModel = m.id"
              >
                <div class="model-icon-wrap" :class="{ 'model-icon-active': settings.selectedModel === m.id }">
                  <component :is="m.icon" :size="'16'" :color="settings.selectedModel === m.id ? '#fff' : '#8B7355'" />
                </div>
                <span class="model-name" :class="{ 'model-name-active': settings.selectedModel === m.id }">{{ m.name }}</span>
              </div>

              <div class="model-divider" />

              <span class="model-section">国外模型</span>
              <div
                v-for="m in foreignModels"
                :key="m.id"
                class="model-item"
                :class="{ 'model-item-active': settings.selectedModel === m.id }"
                @click="settings.selectedModel = m.id"
              >
                <div class="model-icon-wrap" :class="{ 'model-icon-active': settings.selectedModel === m.id }">
                  <component :is="m.icon" :size="'16'" :color="settings.selectedModel === m.id ? '#fff' : '#8B7355'" />
                </div>
                <span class="model-name" :class="{ 'model-name-active': settings.selectedModel === m.id }">{{ m.name }}</span>
              </div>
            </div>

            <div class="config-panel">
              <div class="config-tabs">
                <button class="config-tab" :class="{ 'config-tab-selected': configTab === 'provider' }" @click="configTab = 'provider'">模型制造商</button>
                <button class="config-tab" :class="{ 'config-tab-selected': configTab === 'custom' }" @click="configTab = 'custom'">自定义配置</button>
              </div>

              <div class="config-form">
                <div class="form-field">
                  <label class="form-label">服务商</label>
                  <input v-if="configTab === 'custom'" v-model="customProvider" class="form-input" placeholder="例如: OpenAI" />
                  <div v-else class="form-input">{{ domesticModels.find(m => m.id === settings.selectedModel)?.provider || foreignModels.find(m => m.id === settings.selectedModel)?.provider || '' }}</div>
                </div>
                <div class="form-field">
                  <label class="form-label">模型</label>
                  <input v-if="configTab === 'custom'" v-model="customModel" class="form-input" placeholder="例如: gpt-4" />
                  <div v-else class="form-input">{{ domesticModels.find(m => m.id === settings.selectedModel)?.model || foreignModels.find(m => m.id === settings.selectedModel)?.model || '' }}</div>
                </div>
                <div class="form-field">
                  <label class="form-label">API Key</label>
                  <div class="form-input-row">
                    <input
                      v-model="apiKeyValue"
                      :type="keyVisible ? 'text' : 'password'"
                      class="form-input"
                      placeholder="sk-..."
                    />
                    <button class="form-key-toggle" @click="keyVisible = !keyVisible">
                      <RiEyeOffLine v-if="!keyVisible" size="16" color="#8B7355" />
                      <RiEyeLine v-else size="16" color="#8B7355" />
                    </button>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="form-btn-cancel" @click="resetApiForm">取消</button>
                  <button class="form-btn-add" @click="addApiKeyEntry">添加</button>
                </div>
              </div>

              <div v-if="savedKeys.length > 0" class="saved-keys">
                <span class="saved-keys-title">已保存的密钥</span>
                <div v-for="key in savedKeys" :key="key.id" class="saved-key-item">
                  <div class="saved-key-info">
                    <span class="saved-key-provider">{{ key.provider }}</span>
                    <span class="saved-key-model">{{ key.model }}</span>
                  </div>
                  <button class="saved-key-delete" @click="removeApiKey(key.id)">
                    <RiDeleteBinLine size="14" color="#C43A31" />
                  </button>
                </div>
              </div>
            </div>
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
  background: var(--color-upload-bg);
  font-family: var(--font-ui);
}

.settings-layout {
  display: flex;
  gap: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.settings-nav {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 12px;
  background: var(--color-upload-bg);
  align-self: stretch;
  position: relative;
}

.nav-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brown-dark);
  padding: 0 12px 16px 12px;
}

.nav-indicator {
  position: absolute;
  left: 12px;
  right: 12px;
  z-index: 0;
  border-radius: 12px;
  background: var(--color-accent-red);
  transition: top 0.3s ease-out, height 0.3s ease-out;
  pointer-events: none;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--color-brown-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  position: relative;
  z-index: 1;
  min-height: 48px;
}

.nav-tab:hover {
  background: rgba(196, 61, 61, 0.08);
  color: var(--color-accent-red);
}

.nav-tab.active {
  color: var(--color-white);
  font-weight: 600;
}

.nav-tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-tab.active .nav-tab-icon {
  color: var(--color-white);
}

.nav-tab-label {
  line-height: 1.3;
}

.settings-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--color-nav-bg);
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 0 32px;
}

.content-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-header-texts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.content-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-brown-dark);
  margin: 0;
}

.content-subtitle {
  font-size: 14px;
  color: var(--color-brown-muted);
}

.content-header-actions {
  display: flex;
  gap: 12px;
}

.action-btn-cancel {
  padding: 10px 24px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  background: var(--color-cream-dark);
  color: var(--color-brown-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-cancel:hover {
  background: var(--color-cream-darker);
  border-color: var(--color-tan-dark);
}

.action-btn-save {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-cinnabar);
  color: var(--color-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-save:hover {
  background: var(--color-cinnabar-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-cinnabar);
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 32px 24px 32px;
}

.panel {
  padding: 24px 0;
}

/* Theme Settings */
.theme-cards-row {
  display: flex;
  gap: 24px;
}

.theme-card-new {
  flex: 1;
  background: var(--color-white);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.theme-card-new:hover {
  border-color: var(--color-tan-border);
}

.theme-card-selected {
  border-color: var(--color-cinnabar);
  box-shadow: 0 4px 20px rgba(194, 59, 34, 0.15);
}

.theme-preview-area {
  height: 200px;
  display: flex;
  flex-direction: column;
}

.theme-preview-nav {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  flex-shrink: 0;
}

.preview-logo {
  width: 21px;
  height: 20px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.preview-brand {
  font-size: 10px;
  font-weight: 600;
}

.theme-preview-body {
  flex: 1;
  display: flex;
}

.preview-sidebar {
  width: 51px;
  flex-shrink: 0;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.preview-card {
  height: 60px;
  border-radius: var(--radius-md);
}

.preview-card-sm {
  height: 40px;
  border-radius: var(--radius-md);
}

.theme-info-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--color-white);
}

.theme-info-texts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-info-name {
  font-size: 15px;
  font-weight: 600;
}

.theme-info-desc {
  font-size: 12px;
  color: var(--color-brown-muted);
}

.theme-check-circle {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-tan-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.theme-checked-circle {
  background: var(--color-cinnabar);
}

/* Settings Card */
.settings-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
}

/* Setting Rows */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-tan-light);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-brown-dark);
}

.setting-desc {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
  margin: 0;
}

.number-stepper {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  padding: 4px;
}

.stepper-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-brown);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.stepper-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.stepper-input {
  width: 48px;
  height: 28px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-brown-dark);
}

.stepper-input:focus {
  outline: none;
}

.switch {
  position: relative;
  width: 52px;
  height: 28px;
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
  background: var(--color-tan-dark);
  border-radius: var(--radius-full);
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 24px;
  width: 24px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: var(--radius-full);
  transition: 0.3s;
  box-shadow: var(--shadow-sm);
}

.switch input:checked + .slider {
  background: var(--color-jade-light);
}

.switch input:checked + .slider:before {
  transform: translateX(24px);
}

.number-input {
  width: 80px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-body);
  text-align: center;
  background: var(--color-white);
  color: var(--color-brown-dark);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.number-input:focus {
  outline: none;
  border-color: var(--color-cinnabar);
  box-shadow: 0 0 0 1px rgba(var(--rgb-cinnabar), 0.25);
}

.select-input {
  width: 200px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  background: var(--color-white);
  color: var(--color-brown-dark);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-input:focus {
  outline: none;
  border-color: var(--color-cinnabar);
  box-shadow: 0 0 0 1px rgba(var(--rgb-cinnabar), 0.25);
}

/* Export Cards */
.export-cards-row {
  display: flex;
  gap: 24px;
}

.export-card-item {
  flex: 1;
  background: var(--color-white);
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.export-card-item:hover {
  border-color: var(--color-tan-border);
}

.export-card-selected {
  border-color: var(--color-cinnabar);
  box-shadow: 0 4px 20px rgba(194, 59, 34, 0.1);
}

.export-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.export-card-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.export-card-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.export-card-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-brown-dark);
}

.export-card-ext {
  font-size: 13px;
  color: var(--color-brown-muted);
}

.export-check {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-tan-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.export-checked {
  background: var(--color-cinnabar);
}

.export-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-brown-dark);
}

/* API Key Panel */
.api-full-panel {
  display: flex;
  gap: 24px;
  min-height: 0;
}

.model-list {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-section {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-brown-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0 4px;
}

.model-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.model-item:hover {
  background: rgba(0,0,0,0.03);
}

.model-item-active {
  background: var(--color-cinnabar);
}

.model-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-tan-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.model-icon-active {
  background: rgba(255,255,255,0.2);
}

.model-name {
  font-size: 14px;
  color: var(--color-brown-muted);
  font-weight: 500;
}

.model-name-active {
  color: var(--color-white);
  font-weight: 600;
}

.model-divider {
  height: 1px;
  background: var(--color-tan-border);
  margin: 8px 0;
}

.config-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.config-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-cream-darker);
  border-radius: 12px;
  padding: 4px;
  width: fit-content;
}

.config-tab {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-brown-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.config-tab-selected {
  background: var(--color-cinnabar);
  color: var(--color-white);
  font-weight: 600;
}

.config-form {
  background: var(--color-white);
  border-radius: var(--radius-xl);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.form-label {
  width: 80px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-brown);
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  background: var(--color-parchment);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 13px;
  color: var(--color-brown-dark);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: var(--color-cinnabar);
  box-shadow: 0 0 0 1px rgba(var(--rgb-cinnabar), 0.2);
}

.form-input-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  position: relative;
}

.form-input-row .form-input {
  padding-right: 36px;
}

.form-key-toggle {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 4px;
  transition: background 0.2s;
}

.form-key-toggle:hover {
  background: rgba(var(--rgb-cinnabar), 0.05);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-btn-cancel {
  padding: 10px 24px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  background: var(--color-cream-dark);
  color: var(--color-brown-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.form-btn-cancel:hover {
  background: var(--color-cream-darker);
}

.form-btn-add {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-cinnabar);
  color: var(--color-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.form-btn-add:hover {
  background: var(--color-cinnabar-dark);
}

.saved-keys {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-keys-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brown-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 0 4px;
}

.saved-key-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-parchment);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
}

.saved-key-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.saved-key-provider {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.saved-key-model {
  font-size: 11px;
  color: var(--color-brown-muted);
}

.saved-key-delete {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.2s;
}

.saved-key-delete:hover {
  background: rgba(196, 58, 49, 0.08);
}

/* Transitions on interactive elements */
button, .theme-card-new, .export-card-item, .model-item, .config-tab, .form-input, .select-input, .number-input {
  transition: all 0.2s;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
    padding: 16px;
  }

  .settings-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 12px;
  }

  .nav-title {
    display: none;
  }

  .nav-indicator {
    display: none;
  }

  .nav-tab {
    white-space: nowrap;
    padding: 10px 16px;
    font-size: var(--text-body-sm);
  }

  .nav-tab.active {
    background: var(--color-accent-red);
    color: var(--color-white);
  }

  .content-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .content-header-actions {
    width: 100%;
  }

  .content-scroll {
    padding: 0 16px 16px 16px;
  }

  .theme-cards-row {
    flex-direction: column;
  }

  .export-cards-row {
    flex-direction: column;
  }

  .api-full-panel {
    flex-direction: column;
  }

  .model-list {
    width: 100%;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
  }

  .setting-label {
    font-size: var(--text-body-sm);
  }

  .panel {
    padding: 16px 0;
  }
}
</style>