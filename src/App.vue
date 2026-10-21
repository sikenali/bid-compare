<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettings } from './composables/useSettings'
import { applyTheme, applyStoredTheme } from './composables/useTheme'
import TopNav from './components/layout/TopNav.vue'
import PageFooter from './components/layout/PageFooter.vue'

const router = useRouter()
const route = useRoute()

const { settings } = useSettings()

// 挂载前先把持久化主题写入 DOM，避免首屏闪烁
applyStoredTheme()

watch(() => settings.theme, (val) => {
  applyTheme(val === 'dark' ? 'dark' : 'light')
}, { immediate: true })

const isResultPage = computed(() => {
  return route.path.includes('-result')
})

const pageTitles: Record<string, string> = {
  '/': '文档智能对比平台',
  '/file-compare': '文件对比',
  '/property-check': '属性检查',
  '/image-compare': '图片对比',
  '/batch-compare': '批量对比',
  '/file-compare-result': '对比结果',
  '/property-check-result': '属性检查结果',
}

const currentPageTitle = computed(() => {
  return pageTitles[route.path] || ''
})
</script>

<template>
  <div class="app-container">
    <TopNav
      :title="currentPageTitle"
      :show-back="isResultPage"
    />

    <main class="main-content">
      <router-view />
    </main>

    <PageFooter />

  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-main, var(--color-cream, #FBF7F0));
  font-family: var(--font-ui);
}

.main-content {
  flex: 1;
  overflow: auto;
}

@media (max-width: 768px) {
  .main-content {
    overflow: auto;
  }
}
</style>
