<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import {
  RiSettings3Line,
  RiText,
  RiFilterLine,
  RiFileDownloadLine
} from '@remixicon/vue'

const {
  settings,
  saveSettings: handleSaveSettings,
  cancelSettings: handleCancelSettings
} = useSettings()

const exportFormat = ref('docx')
const includeHighlight = ref(true)
const includeMetadata = ref(true)

const handleReset = () => {
  settings.minDuplicateWords = 5
  settings.textSimilarityThreshold = 70
  settings.imageSimilarityThreshold = 80
  settings.ignoreCase = false
  settings.ignorePunctuation = false
  settings.ignoreWhitespace = false
  settings.ignoreInvisibleChars = false
  exportFormat.value = 'docx'
  includeHighlight.value = true
  includeMetadata.value = true
}
</script>

<template>
  <div class="system-settings-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <h1 class="main-title">系统设置</h1>
      <p class="sub-title">配置对比算法参数和系统功能选项</p>
      <div class="decorative-line"></div>
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
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">导出格式</label>
              <p class="setting-desc">选择导出报告的文件格式</p>
            </div>
            <select v-model="exportFormat" class="setting-select">
              <option value="docx">Word 文档 (.docx)</option>
              <option value="xlsx">Excel 表格 (.xlsx)</option>
              <option value="pdf">PDF 文档 (.pdf)</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">包含高亮标记</label>
              <p class="setting-desc">导出报告中是否包含相似内容高亮</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="includeHighlight" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">包含元数据</label>
              <p class="setting-desc">导出报告中是否包含文件元数据信息</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="includeMetadata" />
              <span class="slider"></span>
            </label>
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
  padding: 32px;
  gap: 32px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面标题区 */
.page-header {
  width: 100%;
}

.main-title {
  font-size: 36px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
  margin: 0;
}

.sub-title {
  font-size: 16px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 8px 0 0 0;
}

.decorative-line {
  width: 100%;
  height: 3px;
  margin-top: 24px;
  background: linear-gradient(90deg, rgba(216,191,156,1) 0%, rgba(230,215,191,1) 50%, rgba(216,191,156,1) 100%);
  border-radius: 2px;
}

/* 设置表单区 */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 设置卡片 */
.settings-card {
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.card-icon {
  width: 40px;
  height: 40px;
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

.card-icon .icon {
  font-size: 20px;
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

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.setting-label-group {
  flex: 1;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  margin: 0 0 4px 0;
}

.setting-desc {
  font-size: 12px;
  color: rgba(139, 115, 85, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
}

/* 输入框 */
.setting-input {
  width: 120px;
  height: 44px;
  padding: 12px 16px;
  border: 1px solid rgba(216, 191, 156, 0.5);
  border-radius: 8px;
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  background-color: rgba(255, 255, 255, 0.8);
  font-family: SourceHanSans-Regular;
  text-align: center;
  transition: all 0.3s ease;
}

.setting-input:focus {
  outline: none;
  border-color: rgba(139, 0, 0, 1);
  box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
}

/* 下拉选择框 */
.setting-select {
  width: 180px;
  height: 44px;
  padding: 12px 16px;
  border: 1px solid rgba(216, 191, 156, 0.5);
  border-radius: 8px;
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  background-color: rgba(255, 255, 255, 0.8);
  font-family: SourceHanSans-Regular;
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-select:focus {
  outline: none;
  border-color: rgba(139, 0, 0, 1);
  box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
}

/* 开关按钮 */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
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
  background-color: rgba(216, 191, 156, 0.4);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
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
  transform: translateX(24px);
}

/* 操作按钮区 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.btn {
  width: 200px;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
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
</style>
