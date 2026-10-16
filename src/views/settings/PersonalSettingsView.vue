<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { riToCompName } from '../../utils/icon'
import { UiSwitch } from '../../components/ui'
import { RiRestartLine } from '@remixicon/vue'

const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

const subTab = ref<'algorithm' | 'preprocess' | 'features'>('algorithm')

const subTabs = [
  { key: 'algorithm' as const, label: '对比算法', icon: 'ri-settings-4-line', desc: '配置对比算法参数' },
  { key: 'preprocess' as const, label: '文本设置', icon: 'ri-text-wrap', desc: '配置文本处理选项' },
  { key: 'features' as const, label: '参数设置', icon: 'ri-slideshow-4-line', desc: '配置查重参数' },
]

const clampNumber = (value: string | number, min: number, max: number): number => {
  if (value === '' || value === null || value === undefined) return min
  const num = parseInt(String(value).replace(/\D/g, ''), 10)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

watch(
  () => [settings.enableImageCompare, settings.enableMultiFileCompare, settings.enableOCRCompare, settings.removeWatermark, settings.clauseRemovalEnabled],
  () => { saveSettings() }
)

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
            <p>配置对比算法、文本处理与功能开关</p>
          </div>
        </div>
        <button class="reset-button" @click="reset">
          <RiRestartLine class="icon" />恢复默认
        </button>
      </div>
    </div>

    <!-- 标签导航 -->
    <div class="tab-nav">
      <button v-for="t in subTabs" :key="t.key" class="tab-btn" :class="{active: subTab===t.key}" @click="subTab=t.key">
        <component :is="riToCompName(t.icon)" class="icon" /><span>{{ t.label }}</span>
      </button>
    </div>

    <!-- 对比算法 -->
    <template v-if="subTab === 'algorithm'">
      <div class="section-card">
        <div class="card-title">对比算法参数</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">N-gram 大小</div>
            <div class="setting-desc">设置文本分片的字符数量</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.ngramSize = Math.max(1, settings.ngramSize - 1)">−</button>
            <input type="text" :value="settings.ngramSize" class="stepper-input" @input="settings.ngramSize = clampNumber($event.target.value, 1, 10)" />
            <button class="stepper-btn" @click="settings.ngramSize = Math.min(10, settings.ngramSize + 1)">+</button>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">最小查重字数</div>
            <div class="setting-desc">标记为重复的最少连续字符数</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.minDupChars = Math.max(5, settings.minDupChars - 5)">−</button>
            <input type="text" :value="settings.minDupChars" class="stepper-input" @input="settings.minDupChars = clampNumber($event.target.value, 5, 200)" />
            <button class="stepper-btn" @click="settings.minDupChars = Math.min(200, settings.minDupChars + 5)">+</button>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">相似度阈值</div>
            <div class="setting-desc">文本片段相似度达到此百分比即标记为重复</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.max(1, settings.textSimilarityThreshold - 1)">−</button>
            <input type="text" :value="settings.textSimilarityThreshold" class="stepper-input" @input="settings.textSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
            <button class="stepper-btn" @click="settings.textSimilarityThreshold = Math.min(100, settings.textSimilarityThreshold + 1)">+</button>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">图像相似度阈值</div>
            <div class="setting-desc">图像相似度达到此百分比即标记为重复</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.max(1, settings.imageSimilarityThreshold - 1)">−</button>
            <input type="text" :value="settings.imageSimilarityThreshold" class="stepper-input" @input="settings.imageSimilarityThreshold = clampNumber($event.target.value, 1, 100)" />
            <button class="stepper-btn" @click="settings.imageSimilarityThreshold = Math.min(100, settings.imageSimilarityThreshold + 1)">+</button>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">最大结果数</div>
            <div class="setting-desc">最多显示的相似片段数量</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.maxResults = Math.max(10, settings.maxResults - 10)">−</button>
            <input type="text" :value="settings.maxResults" class="stepper-input" @input="settings.maxResults = clampNumber($event.target.value, 10, 500)" />
            <button class="stepper-btn" @click="settings.maxResults = Math.min(500, settings.maxResults + 10)">+</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 文本设置 -->
    <template v-else-if="subTab === 'preprocess'">
      <div class="section-card">
        <div class="card-title">文本处理选项</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">忽略大小写</div>
            <div class="setting-desc">对比时是否忽略英文字母大小写差异</div>
          </div>
          <UiSwitch v-model="settings.ignoreCase" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">忽略标点符号</div>
            <div class="setting-desc">对比时是否忽略标点符号差异</div>
          </div>
          <UiSwitch v-model="settings.ignorePunctuation" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">忽略空白字符</div>
            <div class="setting-desc">对比时是否忽略空格、制表符等空白字符</div>
          </div>
          <UiSwitch v-model="settings.ignoreWhitespace" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">忽略不可见字符</div>
            <div class="setting-desc">对比时是否忽略零宽字符等不可见字符</div>
          </div>
          <UiSwitch v-model="settings.ignoreInvisibleChars" />
        </div>
      </div>
    </template>

    <!-- 参数设置 -->
    <template v-else>
      <div class="section-card">
        <div class="card-title">查重功能参数</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">水印文字剔除</div>
            <div class="setting-desc">解析时自动过滤常见水印文字</div>
          </div>
          <UiSwitch v-model="settings.removeWatermark" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">相同条款剔除</div>
            <div class="setting-desc">启用后自动剔除招标文件中完全相同的条款</div>
          </div>
          <UiSwitch v-model="settings.clauseRemovalEnabled" />
        </div>
        <div v-if="settings.clauseRemovalEnabled" class="setting-item">
          <div class="setting-info">
            <div class="setting-name">剔除颗粒度</div>
            <div class="setting-desc">条款剔除的最小连续相同字符数</div>
          </div>
          <div class="number-stepper">
            <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.max(2, settings.clauseRemovalGranularity - 1)">−</button>
            <input type="text" :value="settings.clauseRemovalGranularity" class="stepper-input" @input="settings.clauseRemovalGranularity = clampNumber($event.target.value, 2, 50)" />
            <button class="stepper-btn" @click="settings.clauseRemovalGranularity = Math.min(50, settings.clauseRemovalGranularity + 1)">+</button>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">图片查重</div>
            <div class="setting-desc">开启后可使用图片对比功能</div>
          </div>
          <UiSwitch v-model="settings.enableImageCompare" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">OCR 文字识别</div>
            <div class="setting-desc">开启后对 Word/PDF 中的图片进行文字识别对比</div>
          </div>
          <UiSwitch v-model="settings.enableOCRCompare" />
        </div>
        <div v-if="settings.enableOCRCompare" class="setting-item">
          <div class="setting-info">
            <div class="setting-name">OCR 识别语言</div>
            <div class="setting-desc">选择图片文字识别的语言</div>
          </div>
          <select v-model="settings.ocrLanguage" class="select-input">
            <option value="chi_sim+eng">中文简体 + 英文</option>
            <option value="chi_tra+eng">中文繁体 + 英文</option>
            <option value="eng">英文</option>
            <option value="chi_sim">中文简体</option>
          </select>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">多文件对比</div>
            <div class="setting-desc">开启后可同时对比多个文件（3个以上）</div>
          </div>
          <UiSwitch v-model="settings.enableMultiFileCompare" />
        </div>
        <div v-if="settings.enableMultiFileCompare" class="setting-item">
          <div class="setting-info">
            <div class="setting-name">最大文件数量</div>
            <div class="setting-desc">单次对比最多支持的文件数</div>
          </div>
          <input type="number" v-model.number="settings.maxMultiFileCount" min="3" max="20" class="number-input" />
        </div>
      </div>
    </template>

    <div class="form-actions">
      <button class="btn-reset" @click="reset">
        <RiRestartLine class="icon" />恢复默认
      </button>
      <button class="btn-save" @click="save">保存设置</button>
    </div>
  </div>
</template>

<style scoped>
.personal-view { display:flex; flex-direction:column; gap:20px; max-width:900px; }

/* Page header card */
.page-header-card {
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px;
  padding: 20px 24px;
}
.header-content { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; }
.header-info { flex:1; display:flex; flex-direction:column; gap:4px; }
.breadcrumb { display:flex; align-items:center; gap:8px; font-size:14px; font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.breadcrumb span { color:var(--color-text-faint,#A7A296); }
.breadcrumb span.sep { color:var(--color-text-faint,#A7A296); }
.breadcrumb span.current { color:var(--color-text-body,#3A3A3A); font-weight:500; }
.header-title h1 { font-size:30px; font-weight:700; color:var(--color-text-primary,#1F1D1A); margin:12px 0 0 0; letter-spacing:-0.5px; font-family:"SourceHanSans-Bold", var(--font-family-cn); line-height:1.2; }
.header-title p { font-size:15px; color:var(--color-text-secondary,#6E6A60); margin:8px 0 0 0; font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.reset-button {
  display:inline-flex; align-items:center; gap:8px; padding:0 20px; height:48px;
  border:0.7px solid var(--color-border,#E5DFD3); background-color:var(--color-bg-white,#FFFFFF);
  border-radius:12px; font-size:15px; color:var(--color-text-body,#3A3A3A);
  cursor:pointer; transition:all .2s; flex-shrink:0; font-family:"SourceHanSans-Regular", var(--font-family-cn);
}
.reset-button:hover { background-color:var(--color-bg-secondary,#F7F3EA); }
.reset-button .icon { font-size:18px; }

/* Tab nav */
.tab-nav { display:flex; gap:8px; background-color:var(--color-bg-white,#fff); border:0.7px solid var(--color-border-soft,#EDE9E0); border-radius:12px; padding:6px; width:fit-content; }
.tab-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 20px; border:none; border-radius:8px; background-color:transparent; font-size:14px; font-weight:500; color:var(--color-text-secondary,#6E6A60); cursor:pointer; font-family:var(--font-ui); transition:all .2s; }
.tab-btn:hover { background-color:var(--color-bg-secondary,#F7F3EA); }
.tab-btn.active { background-color:var(--color-primary-soft); color:var(--color-primary,#C0392B); }
[data-theme="dark"] .tab-btn.active { color:#FFFFFF; }
.tab-btn .icon { font-size:16px; }

/* Section card */
.section-card { background-color:var(--color-bg-white,#fff); border:0.7px solid var(--color-border-soft,#EDE9E0); border-radius:16px; padding:24px 32px; }
.card-title { font-size:16px; font-weight:600; color:var(--color-text-primary,#1F1D1A); margin-bottom:16px; font-family:"SourceHanSans-Regular", var(--font-family-cn); }

/* Setting item */
.setting-item { display:flex; align-items:center; justify-content:space-between; height:64px; border-bottom:0.7px solid var(--color-border-soft,#EDE9E0); }
.setting-item:last-child { border-bottom:none; }
.setting-info { display:flex; flex-direction:column; gap:4px; }
.setting-name { font-size:15px; font-weight:500; color:var(--color-text-primary,#1F1D1A); font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.setting-desc { font-size:13px; color:var(--color-text-muted,#8A8578); font-family:"SourceHanSans-Regular", var(--font-family-cn); }

/* Number stepper */
.number-stepper { display:flex; align-items:center; gap:2px; background-color:var(--color-bg-white,#FFFFFF); border:0.7px solid var(--color-border-soft,#EDE9E0); border-radius:8px; padding:4px; flex-shrink:0; }
.stepper-btn { width:28px; height:28px; border:none; border-radius:6px; background-color:var(--color-bg-secondary,#F7F3EA); color:var(--color-text-secondary,#6E6A60); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; font-size:16px; }
.stepper-btn:hover { background-color:rgba(192,57,43,0.08); color:var(--color-primary,#C0392B); }
.stepper-input { width:48px; height:28px; border:none; background-color:transparent; text-align:center; font-size:14px; font-weight:500; color:var(--color-text-primary,#1F1D1A); }
.stepper-input:focus { outline:none; }

/* Select input */
.select-input { width:200px; height:36px; padding:0 12px; border:0.7px solid var(--color-border-soft,#EDE9E0); border-radius:10px; font-size:13px; background-color:var(--color-bg-white,#FFFFFF); color:var(--color-text-body,#3A3A3A); cursor:pointer; outline:none; font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.select-input:focus { border-color:var(--color-primary,#C0392B); }

/* Number input */
.number-input { width:80px; height:32px; padding:0 12px; border:0.7px solid var(--color-border-soft,#EDE9E0); border-radius:8px; font-size:14px; text-align:center; background-color:var(--color-bg-white,#FFFFFF); color:var(--color-text-primary,#1F1D1A); outline:none; }
.number-input:focus { border-color:var(--color-primary,#C0392B); }

/* Form actions */
.form-actions { display:flex; justify-content:flex-end; gap:12px; margin-top:8px; }
.btn-reset { display:inline-flex; align-items:center; gap:8px; padding:0 20px; height:44px; border:0.7px solid var(--color-border,#E5DFD3); border-radius:10px; background-color:var(--color-bg-white,#fff); color:var(--color-text-body,#3A3A3A); font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.btn-reset:hover { background-color:var(--color-bg-secondary,#F7F3EA); }
.btn-reset .icon { font-size:16px; }
.btn-save { display:inline-flex; align-items:center; gap:6px; padding:0 24px; height:44px; border:none; border-radius:10px; background-color:var(--color-primary,#C0392B); color:#fff; font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; font-family:"SourceHanSans-Regular", var(--font-family-cn); }
.btn-save:hover { background-color:color-mix(in srgb,var(--color-primary,#C0392B) 88%,black); }
</style>
