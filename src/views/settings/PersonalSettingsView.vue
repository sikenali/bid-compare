<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

const subTab = ref<'algorithm' | 'preprocess' | 'features'>('algorithm')

const subTabs = [
  { key: 'algorithm' as const, label: '对比算法', desc: '配置对比算法参数' },
  { key: 'preprocess' as const, label: '文本设置', desc: '配置文本处理选项' },
  { key: 'features' as const, label: '参数设置', desc: '配置查重参数' },
]

const clampNumber = (value: string | number, min: number, max: number): number => {
  const num = parseInt(String(value).replace(/\D/g, ''), 10)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

function save() {
  saveSettings()
  showToast('设置已保存', 'success')
}

function reset() {
  // Reset algorithm
  settings.ngramSize = 3
  settings.minDuplicateWords = 8
  settings.textSimilarityThreshold = 75
  settings.imageSimilarityThreshold = 80
  settings.maxResults = 500
  // Reset preprocess
  settings.ignoreCase = false
  settings.ignorePunctuation = true
  settings.ignoreWhitespace = true
  settings.ignoreInvisibleChars = true
  // Reset features
  settings.removeWatermark = true
  settings.clauseRemovalEnabled = false
  settings.clauseRemovalGranularity = 5
  settings.enableImageCompare = false
  settings.enableOCRCompare = false
  settings.ocrLanguage = 'chi_sim+eng'
  settings.enableMultiFileCompare = false
  settings.maxMultiFileCount = 3
  saveSettings()
  showToast('已恢复默认设置', 'success')
}
</script>

<template>
  <div class="personal-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span>设置中心</span><span class="sep">/</span>
            <span class="current">个性设置</span>
          </div>
          <div class="header-title">
            <h1>个性设置</h1>
            <p>自定义对比算法、文本处理与查重参数</p>
          </div>
        </div>
        <button class="reset-button" @click="reset">
          <RiRestartLine class="icon" />恢复默认
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="sub-tab-bar">
        <button
          v-for="tab in subTabs"
          :key="tab.key"
          class="sub-tab"
          :class="{ active: subTab === tab.key }"
          @click="subTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 对比算法 -->
      <div v-if="subTab === 'algorithm'" class="sub-panel">
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">N-gram 大小</label>
              <p class="setting-desc">设置文本分片的字符数量</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.ngramSize = Math.max(1, settings.ngramSize - 1)">−</button>
              <input type="text" :value="settings.ngramSize" class="stepper-input" @input="settings.ngramSize = clampNumber($event.target.value, 1, 10)" />
              <button class="stepper-btn" @click="settings.ngramSize = Math.min(10, settings.ngramSize + 1)">+</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最小查重字数</label>
              <p class="setting-desc">标记为重复的最少连续字符数</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.minDupChars = Math.max(5, settings.minDupChars - 5)">−</button>
              <input type="text" :value="settings.minDupChars" class="stepper-input" @input="settings.minDupChars = clampNumber($event.target.value, 5, 200)" />
              <button class="stepper-btn" @click="settings.minDupChars = Math.min(200, settings.minDupChars + 5)">+</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">相似度阈值</label>
              <p class="setting-desc">文本片段相似度达到此百分比即标记为重复</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.max(1, settings.textSimilarityThreshold - 1)">−</button>
              <input type="text" :value="settings.textSimilarityThreshold" class="stepper-input" @input="settings.textSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
              <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.min(100, settings.textSimilarityThreshold + 1)">+</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">图像相似度阈值</label>
              <p class="setting-desc">图像相似度达到此百分比即标记为重复</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.max(1, settings.imageSimilarityThreshold - 1)">−</button>
              <input type="text" :value="settings.imageSimilarityThreshold" class="stepper-input" @input="settings.imageSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
              <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.min(100, settings.imageSimilarityThreshold + 1)">+</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最大结果数</label>
              <p class="setting-desc">最多显示的相似片段数量</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.maxResults = Math.max(10, settings.maxResults - 10)">−</button>
              <input type="text" :value="settings.maxResults" class="stepper-input" @input="settings.maxResults = clampNumber($event.target.value, 10, 500)" />
              <button class="stepper-btn" @click="settings.maxResults = Math.min(500, settings.maxResults + 10)">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文本设置 -->
      <div v-if="subTab === 'preprocess'" class="sub-panel">
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略大小写</label>
              <p class="setting-desc">对比时是否忽略英文字母大小写差异</p>
            </div>
            <div class="toggle" :class="{ on: settings.ignoreCase }" @click="settings.ignoreCase = !settings.ignoreCase">
              <div class="toggle-knob" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略标点符号</label>
              <p class="setting-desc">对比时是否忽略标点符号差异</p>
            </div>
            <div class="toggle" :class="{ on: settings.ignorePunctuation }" @click="settings.ignorePunctuation = !settings.ignorePunctuation">
              <div class="toggle-knob" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略空白字符</label>
              <p class="setting-desc">对比时是否忽略空格、制表符等空白字符</p>
            </div>
            <div class="toggle" :class="{ on: settings.ignoreWhitespace }" @click="settings.ignoreWhitespace = !settings.ignoreWhitespace">
              <div class="toggle-knob" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">忽略不可见字符</label>
              <p class="setting-desc">对比时是否忽略零宽字符等不可见字符</p>
            </div>
            <div class="toggle" :class="{ on: settings.ignoreInvisibleChars }" @click="settings.ignoreInvisibleChars = !settings.ignoreInvisibleChars">
              <div class="toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      <!-- 参数设置 -->
      <div v-if="subTab === 'features'" class="sub-panel">
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">水印文字剔除</label>
              <p class="setting-desc">解析时自动过滤常见水印文字</p>
            </div>
            <div class="toggle" :class="{ on: settings.removeWatermark }" @click="settings.removeWatermark = !settings.removeWatermark">
              <div class="toggle-knob" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">相同条款剔除</label>
              <p class="setting-desc">启用后自动剔除招标文件中完全相同的条款</p>
            </div>
            <div class="toggle" :class="{ on: settings.clauseRemovalEnabled }" @click="settings.clauseRemovalEnabled = !settings.clauseRemovalEnabled">
              <div class="toggle-knob" />
            </div>
          </div>
          <div v-if="settings.clauseRemovalEnabled" class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">剔除颗粒度</label>
              <p class="setting-desc">条款剔除的最小连续相同字符数</p>
            </div>
            <div class="number-stepper">
              <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.max(2, settings.clauseRemovalGranularity - 1)">−</button>
              <input type="text" :value="settings.clauseRemovalGranularity" class="stepper-input" @input="settings.clauseRemovalGranularity = clampNumber($event.target.value, 2, 50)" />
              <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.min(50, settings.clauseRemovalGranularity + 1)">+</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">图片查重</label>
              <p class="setting-desc">开启后只对比上传图片中的雷同文字</p>
            </div>
            <div class="toggle" :class="{ on: settings.enableImageCompare }" @click="settings.enableImageCompare = !settings.enableImageCompare">
              <div class="toggle-knob" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">OCR 文字识别</label>
              <p class="setting-desc">开启后对 Word/PDF 中的图片进行文字识别对比</p>
            </div>
            <div class="toggle" :class="{ on: settings.enableOCRCompare }" @click="settings.enableOCRCompare = !settings.enableOCRCompare">
              <div class="toggle-knob" />
            </div>
          </div>
          <div v-if="settings.enableOCRCompare" class="setting-row">
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
            <div class="toggle" :class="{ on: settings.enableMultiFileCompare }" @click="settings.enableMultiFileCompare = !settings.enableMultiFileCompare">
              <div class="toggle-knob" />
            </div>
          </div>
          <div v-if="settings.enableMultiFileCompare" class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">最大文件数量</label>
              <p class="setting-desc">单次对比最多支持的文件数</p>
            </div>
            <input type="number" v-model.number="settings.maxMultiFileCount" min="3" max="20" class="number-input" />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn-save" @click="save">保存设置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.personal-view { display: flex; flex-direction: column; gap: 20px; }

.page-header-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 20px 24px;
}
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.header-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); margin: 12px 0 0; letter-spacing: -0.5px; line-height: 1.2; }
.header-title p { font-size: 15px; color: var(--color-text-secondary, #6E6A60); margin: 8px 0 0; }
.reset-button {
  display: inline-flex; align-items: center; gap: 8px; padding: 0 20px; height: 48px;
  border: 0.7px solid var(--color-border, #E5DFD3); background: var(--color-bg-white, #FFFFFF);
  border-radius: 12px; font-size: 15px; color: var(--color-text-body, #3A3A3A);
  cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}
.reset-button:hover { background: var(--color-bg-secondary, #F7F3EA); }
.reset-button .icon { font-size: 18px; }

.section-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 24px 28px;
}

.sub-tab-bar {
  display: flex; gap: 4px; background: var(--color-bg-secondary, #F7F3EA);
  border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 24px;
}
.sub-tab {
  padding: 8px 20px; border: none; border-radius: 8px; background: transparent;
  color: var(--color-text-muted, #8A8578); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.sub-tab.active { background: var(--color-primary, #C0392B); color: #fff; font-weight: 600; }

.sub-panel { display: flex; flex-direction: column; gap: 20px; }

.settings-card {
  background: var(--color-bg-secondary, #F7F3EA);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 12px; padding: 20px;
}

.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0; gap: 20px;
  border-bottom: 0.7px solid var(--color-border-soft, #EDE9E0);
}
.setting-row:last-child { border-bottom: none; }

.setting-label-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--color-text-primary, #1F1D1A); }
.setting-desc { font-size: 12px; color: var(--color-text-muted, #8A8578); margin: 0; }

.number-stepper {
  display: flex; align-items: center; gap: 2px;
  background: var(--color-bg-white, #FFFFFF);
  border-radius: 8px; padding: 4px; flex-shrink: 0;
}
.stepper-btn {
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: var(--color-bg-secondary, #F7F3EA); color: var(--color-text-secondary, #6E6A60);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; font-size: 16px;
}
.stepper-btn:hover { background: rgba(192,57,43,0.08); color: var(--color-primary, #C0392B); }
.stepper-input {
  width: 48px; height: 28px; border: none; background: transparent;
  text-align: center; font-size: 14px; font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
}
.stepper-input:focus { outline: none; }

.toggle {
  width: 48px; height: 26px; border-radius: 999px;
  background: var(--color-border, #E5DFD3);
  cursor: pointer; transition: background 0.2s; flex-shrink: 0;
  position: relative;
}
.toggle-knob {
  position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle.on { background: var(--color-primary, #C0392B); }
.toggle.on .toggle-knob { transform: translateX(22px); }

.select-input {
  width: 200px; height: 36px; padding: 0 12px;
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 10px; font-size: 13px; background: var(--color-bg-white, #FFFFFF);
  color: var(--color-text-body, #3A3A3A); cursor: pointer; outline: none;
}
.select-input:focus { border-color: var(--color-primary, #C0392B); }

.number-input {
  width: 80px; height: 32px; padding: 0 12px;
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 8px; font-size: 14px; text-align: center;
  background: var(--color-bg-white, #FFFFFF); color: var(--color-text-primary, #1F1D1A);
  outline: none;
}
.number-input:focus { border-color: var(--color-primary, #C0392B); }

.form-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.btn-save {
  padding: 10px 28px; border: none; border-radius: 10px;
  background: var(--color-primary, #C0392B); color: #fff;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-save:hover { background: color-mix(in srgb, var(--color-primary, #C0392B) 88%, black); }
</style>
