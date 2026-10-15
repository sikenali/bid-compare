<script setup lang="ts">
/**
 * 主题设置面板（通用组件）
 */
import { RiCheckLine } from '@remixicon/vue'

interface Props {
  settings: { theme: string }
  onThemeChange?: (theme: string) => void
}
const props = defineProps<Props>()

const themes = [
  { id: 'light', name: '羊皮纸', desc: '温润雅致 · 默认主题',
    previewBg: '#FBF7F0', navBg: '#F5EFE3', logoBg: '#C23B22',
    brandColor: '#3D2B1F', sidebarBg: '#F5EFE3', card1Bg: '#F0E8D8', card2Bg: '#F5EFE3', textColor: '#C23B22' },
  { id: 'dark', name: '深色', desc: '深邃护眼 · 夜间模式',
    previewBg: '#2C2416', navBg: '#3D3224', logoBg: '#C23B22',
    brandColor: '#E8DCC8', sidebarBg: '#3D3224', card1Bg: '#4A3D2C', card2Bg: '#3D3224', textColor: '#E8DCC8' },
  { id: 'paper', name: '白纸', desc: '清爽干净 · 极简模式',
    previewBg: '#FFFFFF', navBg: '#F5F5F5', logoBg: '#C23B22',
    brandColor: '#3D2B1F', sidebarBg: '#F5F5F5', card1Bg: '#F0F0F0', card2Bg: '#F5F5F5', textColor: '#3D2B1F' },
]

function selectTheme(t: string) {
  props.onThemeChange?.(t)
}
</script>

<template>
  <div class="st-theme-panel">
    <div class="st-theme-cards">
      <div
        v-for="t in themes"
        :key="t.id"
        class="st-theme-card"
        :class="{ 'st-theme-card--active': settings.theme === t.id }"
        @click="selectTheme(t.id)"
      >
        <div class="st-theme-preview" :style="{ background: t.previewBg }">
          <div class="st-theme-preview-nav" :style="{ background: t.navBg }">
            <div class="st-theme-logo" :style="{ background: t.logoBg }" />
            <span class="st-theme-brand" :style="{ color: t.brandColor }">文比猩</span>
          </div>
          <div class="st-theme-preview-body">
            <div class="st-theme-sidebar" :style="{ background: t.sidebarBg }" />
            <div class="st-theme-content">
              <div class="st-theme-block" :style="{ background: t.card1Bg }" />
              <div class="st-theme-block st-theme-block--sm" :style="{ background: t.card2Bg }" />
            </div>
          </div>
        </div>
        <div class="st-theme-info">
          <div class="st-theme-texts">
            <span class="st-theme-name" :style="{ color: t.textColor }">{{ t.name }}</span>
            <span class="st-theme-desc">{{ t.desc }}</span>
          </div>
          <div class="st-theme-check" :class="{ 'st-theme-check--on': settings.theme === t.id }">
            <RiCheckLine v-if="settings.theme === t.id" :size="14" color="#fff" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st-theme-panel { display: flex; flex-direction: column; gap: 20px; }
.st-theme-cards { display: flex; gap: 18px; }
.st-theme-card {
  flex: 1; border-radius: 12px; overflow: hidden;
  cursor: pointer; border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--color-white, #fff);
}
.st-theme-card:hover { border-color: var(--color-tan-border, #E0D5C0); }
.st-theme-card--active { border-color: var(--color-cinnabar, #C23B22); box-shadow: 0 4px 20px rgba(194,59,34,0.15); }
.st-theme-preview { height: 170px; display: flex; flex-direction: column; }
.st-theme-preview-nav { height: 34px; display: flex; align-items: center; gap: 6px; padding: 0 12px; flex-shrink: 0; }
.st-theme-logo { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
.st-theme-brand { font-size: 10px; font-weight: 600; }
.st-theme-preview-body { flex: 1; display: flex; }
.st-theme-sidebar { width: 44px; flex-shrink: 0; }
.st-theme-content { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 10px; }
.st-theme-block { height: 44px; border-radius: 6px; }
.st-theme-block--sm { height: 30px; }
.st-theme-info { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--color-white, #fff); }
.st-theme-texts { display: flex; flex-direction: column; gap: 2px; }
.st-theme-name { font-size: 14px; font-weight: 600; }
.st-theme-desc { font-size: 11px; color: var(--color-brown-muted, #8B7355); }
.st-theme-check { width: 22px; height: 22px; border-radius: 50%; background: var(--color-tan-dark, #D4C4A8); display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
.st-theme-check--on { background: var(--color-cinnabar, #C23B22); }
</style>
