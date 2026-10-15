<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const { settings, saveSettings } = useSettings()
const { show: showToast } = useToast()

const formats = [
  { value: 'word' as const, label: 'Word 文档 · .docx', desc: '保留完整格式与排版样式', ext: '.docx', icon: 'RiFileWord2Line', iconColor: '#2B579A' },
  { value: 'markdown' as const, label: 'Markdown · .md', desc: '轻盈纯文本，便于二次编辑', ext: '.md', icon: 'RiMarkdownLine', iconColor: '#8B7355' },
]

const selectedFormat = ref(settings.exportFormat || 'word')
const includeHighlight = ref(settings.includeHighlight ?? true)
const includeCharts = ref(settings.includeCharts ?? true)

onMounted(() => {
  selectedFormat.value = settings.exportFormat || 'word'
  includeHighlight.value = settings.includeHighlight ?? true
  includeCharts.value = settings.includeCharts ?? true
})

function selectFormat(f: 'word' | 'markdown') {
  selectedFormat.value = f
  settings.exportFormat = f === 'markdown' ? 'md' : 'word'
  saveSettings()
  showToast(`导出格式已切换为 ${f === 'markdown' ? 'Markdown' : 'Word'}`, 'success')
}

function toggleHighlight() {
  includeHighlight.value = !includeHighlight.value
  settings.includeHighlight = includeHighlight.value
  saveSettings()
}

function toggleCharts() {
  includeCharts.value = !includeCharts.value
  settings.includeCharts = includeCharts.value
  saveSettings()
}

function resetAll() {
  settings.exportFormat = 'word'
  settings.includeHighlight = true
  settings.includeCharts = true
  selectedFormat.value = 'word'
  includeHighlight.value = true
  includeCharts.value = true
  saveSettings()
  showToast('已恢复默认导出设置', 'success')
}
</script>

<template>
  <div class="export-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span>设置中心</span><span class="sep">/</span>
            <span class="current">导出管理</span>
          </div>
          <div class="header-title">
            <h1>导出管理</h1>
            <p>配置 Word、Markdown 等成品的输出规格与默认行为</p>
          </div>
        </div>
        <button class="reset-button" @click="resetAll">
          <RiRestartLine class="icon" />恢复默认
        </button>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title">默认导出格式</div>
      <div class="format-group">
        <div
          v-for="fmt in formats"
          :key="fmt.value"
          class="format-cell"
          :class="{ active: selectedFormat === fmt.value }"
          @click="selectFormat(fmt.value)"
        >
          <div class="format-icon" :style="{ background: fmt.iconColor + '18', color: fmt.iconColor }">
            <component :is="fmt.icon" :size="26" />
          </div>
          <div class="format-info">
            <div class="format-name">{{ fmt.label }}</div>
            <div class="format-desc">{{ fmt.desc }}</div>
          </div>
          <div class="format-check" :class="{ on: selectedFormat === fmt.value }">
            <RiCheckLine v-if="selectedFormat === fmt.value" :size="16" color="#fff" />
          </div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="card-title">导出选项</div>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">包含高亮样式</div>
          <div class="setting-desc">导出的报告中包含内容高亮样式</div>
        </div>
        <div class="toggle" :class="{ on: includeHighlight }" @click="toggleHighlight">
          <div class="toggle-knob" />
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">包含统计图表</div>
          <div class="setting-desc">导出的报告中包含统计图表</div>
        </div>
        <div class="toggle" :class="{ on: includeCharts }" @click="toggleCharts">
          <div class="toggle-knob" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-view { display: flex; flex-direction: column; gap: 20px; }

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
.card-title { font-size: 17px; font-weight: 500; color: var(--color-text-primary, #1F1D1A); margin-bottom: 20px; }

/* Format cards */
.format-group { display: flex; gap: 24px; }
.format-cell {
  flex: 1; display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border: 2px solid var(--color-border-soft, #EDE9E0);
  border-radius: 14px; cursor: pointer; transition: all 0.2s;
}
.format-cell:hover { border-color: var(--color-border, #E5DFD3); }
.format-cell.active { border-color: var(--color-primary, #C0392B); box-shadow: 0 4px 20px rgba(192,57,43,0.12); }
.format-icon {
  width: 50px; height: 50px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.format-info { flex: 1; }
.format-name { font-size: 16px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); }
.format-desc { font-size: 12px; color: var(--color-text-muted, #8A8578); margin-top: 2px; }
.format-check {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--color-border, #E5DFD3);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s; flex-shrink: 0;
}
.format-check.on { background: var(--color-primary, #C0392B); }

/* Setting items */
.setting-item {
  display: flex; align-items: center; justify-content: space-between;
  height: 72px; gap: 20px; border-bottom: 0.7px solid var(--color-border-soft, #EDE9E0);
}
.setting-item:last-child { border-bottom: none; }
.setting-info { flex: 1; }
.setting-name { font-size: 16px; font-weight: 500; color: var(--color-text-primary, #1F1D1A); }
.setting-desc { font-size: 14px; color: var(--color-text-muted, #8A8578); margin-top: 6px; }

/* Toggle */
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
</style>
