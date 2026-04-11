<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import {
  RiSettings3Line,
  RiText,
  RiFileDownloadLine,
  RiRobot2Line,
  RiFileWordLine,
  RiMarkdownLine,
  RiSparklingFill,
  RiChat1Line,
  RiRobotLine
} from '@remixicon/vue'

const {
  settings,
  saveSettings: handleSaveSettings,
  cancelSettings: handleCancelSettings
} = useSettings()

const handleReset = () => {
  settings.minDuplicateWords = 8
  settings.textSimilarityThreshold = 75
  settings.imageSimilarityThreshold = 80
  settings.ngramSize = 3
  settings.maxResults = 100
  settings.ignoreCase = false
  settings.ignorePunctuation = true
  settings.ignoreWhitespace = true
  settings.ignoreInvisibleChars = true
  settings.selectedModel = 'deepseek'
  settings.apiKey = ''
  settings.apiEndpoint = ''
  settings.exportFormat = 'word'
  settings.includeHighlight = true
  settings.includeCharts = true
}

// 导出格式选项
const exportFormats = [
  { value: 'word', label: 'Word (.docx)', icon: RiFileWordLine },
  { value: 'markdown', label: 'Markdown (.md)', icon: RiMarkdownLine }
]

// AI 模型选项
const aiModels = [
  { value: 'deepseek', label: 'DeepSeek', icon: RiSparklingFill },
  { value: 'kimi', label: 'Kimi', icon: RiChat1Line },
  { value: 'doubao', label: '豆包', icon: RiRobotLine }
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
            <input type="number" v-model.number="settings.ngramSize" class="setting-input" min="1" max="10" />
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最小匹配长度</label>
              <p class="setting-desc">连续匹配的最小字符数</p>
            </div>
            <input type="number" v-model.number="settings.minDuplicateWords" class="setting-input" min="1" max="100" />
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">相似度阈值</label>
              <p class="setting-desc">文本片段相似度达到此百分比即标记为重复</p>
            </div>
            <input type="number" v-model.number="settings.textSimilarityThreshold" class="setting-input" min="1" max="100" />
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最大结果数</label>
              <p class="setting-desc">最多显示的相似片段数量</p>
            </div>
            <input type="number" v-model.number="settings.maxResults" class="setting-input" min="10" max="500" />
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
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">默认导出格式</label>
              <p class="setting-desc">导出报告时默认使用的文件格式</p>
            </div>
            <div class="radio-group">
              <label
                v-for="format in exportFormats"
                :key="format.value"
                class="radio-item"
                :class="{ 'active': settings.exportFormat === format.value }"
              >
                <input type="radio" v-model="settings.exportFormat" :value="format.value" />
                <component :is="format.icon" class="radio-icon" />
                <span class="radio-tooltip">{{ format.label }}</span>
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
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">AI 模型</label>
              <p class="setting-desc">选择用于分析的 AI 模型</p>
            </div>
            <div class="radio-group">
              <label
                v-for="model in aiModels"
                :key="model.value"
                class="radio-item"
                :class="{ 'active': settings.selectedModel === model.value }"
              >
                <input type="radio" v-model="settings.selectedModel" :value="model.value" />
                <component :is="model.icon" class="radio-icon" />
                <span class="radio-tooltip">{{ model.label }}</span>
              </label>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">API 端点</label>
              <p class="setting-desc">API 请求地址，留空使用默认地址</p>
            </div>
            <input type="text" v-model="settings.apiEndpoint" class="setting-input api-input" placeholder="留空使用默认端点" />
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
  overflow: auto;
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
  color: rgba(139, 115, 85, 1);
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
  width: 160px;
  text-align: left;
}

.setting-input:focus {
  outline: none;
  border-color: rgba(139, 0, 0, 1);
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(139, 0, 0, 0.1);
  transform: translateY(0);
}

/* Radio 按钮组 */
.radio-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.radio-item {
  position: relative;
  width: 40px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background-color: rgba(245, 238, 226, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.radio-item input[type="radio"] {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.radio-item:hover {
  background-color: rgba(235, 228, 216, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.radio-item.active {
  background-color: rgba(139, 0, 0, 1);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.radio-item.active:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
}

.radio-item.active .radio-icon {
  color: white;
}

.radio-item.active::after {
  content: "✓";
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  background-color: white;
  color: rgba(139, 0, 0, 1);
  font-size: 8px;
  line-height: 12px;
  text-align: center;
  border-radius: 50%;
  font-weight: bold;
}

.radio-item:not(.active) .radio-icon {
  color: rgba(44, 24, 16, 1);
}

.radio-icon {
  font-size: 16px;
  transition: color 0.3s ease;
}

.radio-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(44, 24, 16, 0.9);
  color: white;
  font-size: 11px;
  font-family: SourceHanSans-Regular;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.radio-item:hover .radio-tooltip {
  opacity: 1;
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
  .settings-form {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .settings-card {
    padding: 16px;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
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
    flex-direction: column;
    gap: 12px;
    padding-bottom: 16px;
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
