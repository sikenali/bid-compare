<script setup lang="ts">
/**
 * 文比猩 — 导出设置面板（独立模块）
 * 可被任意 App 通过 SettingsShell 或直接引用使用
 */
import { computed } from 'vue'
import { RiFileWord2Line, RiMarkdownLine, RiCheckLine } from '@remixicon/vue'

const props = defineProps<{
  exportFormat: 'word' | 'md'
  includeHighlight: boolean
  includeCharts: boolean
  onUpdate: (patch: { exportFormat?: 'word' | 'md'; includeHighlight?: boolean; includeCharts?: boolean }) => void
}>()

const formats = [
  { value: 'word' as const, label: 'Word 格式', ext: '.docx', icon: RiFileWord2Line, color: '#2D6A9F',
    features: ['保留完整格式与排版样式', '支持表格、图片、页眉页脚', '兼容 Microsoft Word / WPS', '支持目录自动生成'] },
  { value: 'md' as const,   label: 'Markdown',  ext: '.md',   icon: RiMarkdownLine,  color: '#8B7355',
    features: ['纯文本格式，轻量易读', '适合版本管理与协作', '可快速转换为 HTML/PDF', '兼容各类 Markdown 编辑器'] },
]
</script>

<template>
  <div class="ba-export-panel">
    <div class="ba-export-cards">
      <div
        v-for="fmt in formats"
        :key="fmt.value"
        class="ba-export-card"
        :class="{ 'ba-export-card--active': props.exportFormat === fmt.value }"
        @click="props.onUpdate({ exportFormat: fmt.value })"
      >
        <div class="ba-export-card-head">
          <div class="ba-export-card-icon" :style="{ background: fmt.color + '18', color: fmt.color }">
            <component :is="fmt.icon" :size="26" />
          </div>
          <div class="ba-export-card-titles">
            <span class="ba-export-card-name">{{ fmt.label }}</span>
            <span class="ba-export-card-ext">{{ fmt.ext }}</span>
          </div>
          <div class="ba-export-check" :class="{ 'ba-export-check--on': props.exportFormat === fmt.value }">
            <RiCheckLine v-if="props.exportFormat === fmt.value" :size="16" color="#fff" />
          </div>
        </div>
        <div class="ba-export-features">
          <div v-for="f in fmt.features" :key="f" class="ba-export-feature">
            <RiCheckLine :size="15" color="#2D8A4E" />
            <span>{{ f }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ba-export-options">
      <div class="ba-setting-row">
        <div class="ba-setting-label">
          <span class="ba-setting-name">包含高亮样式</span>
          <span class="ba-setting-desc">导出的报告中包含内容高亮样式</span>
        </div>
        <label class="ba-toggle">
          <input type="checkbox" :checked="props.includeHighlight" @change="props.onUpdate({ includeHighlight: ($event.target as HTMLInputElement).checked })" />
          <span class="ba-toggle-slider"></span>
        </label>
      </div>
      <div class="ba-setting-row">
        <div class="ba-setting-label">
          <span class="ba-setting-name">包含统计图表</span>
          <span class="ba-setting-desc">导出的报告中包含统计图表</span>
        </div>
        <label class="ba-toggle">
          <input type="checkbox" :checked="props.includeCharts" @change="props.onUpdate({ includeCharts: ($event.target as HTMLInputElement).checked })" />
          <span class="ba-toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ba-export-panel { display: flex; flex-direction: column; gap: 20px; }
.ba-export-cards { display: flex; gap: 18px; }
.ba-export-card {
  flex: 1; background: var(--color-white, #fff);
  border: 2px solid var(--color-tan-border, #E0D5C0);
  border-radius: var(--radius-xl, 12px); padding: 24px;
  cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
}
.ba-export-card:hover { border-color: var(--color-tan-dark, #D4C4A8); }
.ba-export-card--active { border-color: var(--color-cinnabar, #C23B22); box-shadow: 0 4px 20px rgba(194,59,34,0.12); }
.ba-export-card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.ba-export-card-icon { width: 50px; height: 50px; border-radius: var(--radius-lg, 10px); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ba-export-card-titles { flex: 1; }
.ba-export-card-name { font-size: 18px; font-weight: 700; color: var(--color-brown-dark, #3D2B1F); }
.ba-export-card-ext  { font-size: 12px; color: var(--color-brown-muted, #8B7355); }
.ba-export-check { width: 24px; height: 24px; border-radius: 50%; background: var(--color-tan-dark, #D4C4A8); display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
.ba-export-check--on { background: var(--color-cinnabar, #C23B22); }
.ba-export-features { display: flex; flex-direction: column; gap: 9px; }
.ba-export-feature { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--color-brown-dark, #3D2B1F); }

.ba-export-options { display: flex; flex-direction: column; gap: 12px; padding-top: 16px; border-top: 1px solid var(--color-tan-border, #E0D5C0); }
.ba-setting-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
.ba-setting-label { display: flex; flex-direction: column; gap: 2px; }
.ba-setting-name  { font-size: 14px; font-weight: 500; color: var(--color-brown-dark, #3D2B1F); }
.ba-setting-desc  { font-size: 12px; color: var(--color-brown-muted, #8B7355); }

.ba-toggle { position: relative; width: 44px; height: 24px; background: var(--color-tan-dark, #D4C4A8); border-radius: 999px; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
.ba-toggle input { display: none; }
.ba-toggle-slider { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.ba-toggle input:checked + .ba-toggle-slider { transform: translateX(20px); }
.ba-toggle:has(input:checked) { background: var(--color-cinnabar, #C23B22); }
</style>
