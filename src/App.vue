<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { RiExchangeLine, RiFilePaper2Line, RiSearchEyeLine, RiHistoryLine, RiSettings3Line } from '@remixicon/vue'
import { useRecentRecords } from './composables/useRecentRecords'
import RecentRecords from './components/RecentRecords.vue'

const router = useRouter()
const route = useRoute()

const { recentRecords: fcRecords, addRecentRecord: addFcRecord, clearAllRecords: clearFcRecords, deleteRecord: deleteFcRecord } = useRecentRecords('fileCompare')
const { recentRecords: pcRecords, addRecentRecord: addPcRecord, clearAllRecords: clearPcRecords, deleteRecord: deletePcRecord } = useRecentRecords('propertyCheck')

const historyTab = ref('fileCompare')

const showHistory = ref(false)

const navItems = [
  { key: 'file-compare', icon: RiFilePaper2Line, route: '/file-compare' },
  { key: 'property-check', icon: RiSearchEyeLine, route: '/property-check' },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/file-compare')) return 'file-compare'
  if (route.path.startsWith('/property-check')) return 'property-check'
  return 'file-compare'
})

const indicatorStyle = computed(() => {
  const idx = navItems.findIndex(i => i.key === activeNav.value)
  return {
    left: `${idx * 64 + 6}px`,
    width: '48px'
  }
})

const navigateTo = (item: typeof navItems[0]) => {
  router.push(item.route)
}

const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

const viewHistoricalRecord = async (record: any) => {
  if (historyTab.value === 'fileCompare') {
    const { storeCompareResult } = await import('./utils/compareResultStore')
    const compareResult = {
      segments: record.similarSegments || [],
      leftFileName: record.leftFileName,
      rightFileName: record.rightFileName,
      textSimilarity: record.similarity,
      similarSegmentsCount: record.similarSegments ? record.similarSegments.length : 0,
      leftTotalPages: 1,
      rightTotalPages: 1
    }
    const resultId = storeCompareResult(compareResult)
    router.push({ path: '/file-compare-result', query: { resultId, t: Date.now() } })
  } else {
    const { storePropertyCheckResult } = await import('./utils/compareResultStore')
    const checkResult = {
      propertyDetails: record.propertyDetails || [],
      leftFileName: record.leftFileName,
      rightFileName: record.rightFileName,
      totalProperties: record.propertyDetails?.length || 0,
      matchingProperties: record.propertyDetails?.filter((p: any) => p.status === 'match').length || 0,
      nonMatchingProperties: record.propertyDetails?.filter((p: any) => p.status === 'mismatch').length || 0,
      warningProperties: record.propertyDetails?.filter((p: any) => p.status === 'warning').length || 0,
      similarity: record.similarity,
      leftFileProperties: {},
      rightFileProperties: {},
      similarityStatus: 'match'
    }
    const resultId = storePropertyCheckResult(checkResult)
    router.push({ path: '/property-check-result', query: { resultId, t: Date.now() } })
  }
  showHistory.value = false
}

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <div class="app-container">
    <header class="top-nav">
      <div class="nav-left" @click="router.push('/')" style="cursor: pointer">
        <div class="logo-icon">
          <RiExchangeLine class="logo-svg" />
        </div>
        <div class="brand-group">
          <span class="brand-name">文比猩</span>
          <span class="brand-sub">Boomerang</span>
        </div>
      </div>
      <nav class="nav-tabs">
        <div class="nav-tabs-indicator" :style="indicatorStyle" />
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-tab-item"
          :class="{ active: activeNav === item.key }"
          @click="navigateTo(item)"
          :title="item.key === 'file-compare' ? '文件对比' : '属性检查'"
        >
          <component :is="item.icon" size="20" />
        </button>
      </nav>
      <div class="nav-actions">
        <button class="nav-btn" title="历史记录" @click="toggleHistory">
          <span class="nav-btn-content">
            <RiHistoryLine size="20" />
            <span class="nav-btn-label">历史</span>
          </span>
        </button>
        <button class="nav-btn" title="设置" @click="router.push('/settings')">
          <span class="nav-btn-content">
            <RiSettings3Line size="20" />
            <span class="nav-btn-label">设置</span>
          </span>
        </button>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <!-- 历史记录弹窗 -->
    <div v-if="showHistory" class="ba-modal-overlay" @click="toggleHistory">
      <div class="history-modal" @click.stop>
        <div class="history-modal-header">
          <h3>历史记录</h3>
          <button class="history-close-btn" @click="toggleHistory">×</button>
        </div>
        <div class="history-tabs">
          <button class="history-tab" :class="{ active: historyTab === 'fileCompare' }" @click="historyTab = 'fileCompare'">文件对比</button>
          <button class="history-tab" :class="{ active: historyTab === 'propertyCheck' }" @click="historyTab = 'propertyCheck'">属性检查</button>
        </div>
        <div class="history-modal-body">
          <RecentRecords
            v-if="historyTab === 'fileCompare' && fcRecords.length > 0"
            :recent-records="fcRecords"
            :on-clear-all="clearFcRecords"
            :on-view-record="viewHistoricalRecord"
            :on-delete-record="deleteFcRecord"
            :on-close="toggleHistory"
          />
          <RecentRecords
            v-else-if="historyTab === 'propertyCheck' && pcRecords.length > 0"
            :recent-records="pcRecords"
            :on-clear-all="clearPcRecords"
            :on-view-record="viewHistoricalRecord"
            :on-delete-record="deletePcRecord"
            :on-close="toggleHistory"
          />
          <div v-else class="history-empty">
            <p>暂无历史记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-nav-bg);
  font-family: var(--font-ui);
  overflow: hidden;
}

.top-nav {
  height: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--color-nav-bg);
  border-bottom: 1px solid var(--color-tan-light);
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent-red);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-svg {
  font-size: 22px;
  color: #fff;
}

.brand-group {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-brown-dark);
  line-height: 1.2;
}

.brand-sub {
  font-size: 12px;
  color: var(--color-brown-muted);
  line-height: 1.2;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tabs {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 16px;
  background: var(--color-cream-dark);
  border: 0.7px solid var(--color-tan-border);
  border-radius: 24px;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.nav-tabs-indicator {
  position: absolute;
  top: 6px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-cinnabar), #d45a4a);
  transition: left 0.3s ease-out, width 0.3s ease-out;
  pointer-events: none;
  z-index: 0;
  box-shadow: 0 2px 8px rgba(var(--rgb-cinnabar), 0.3);
}

.nav-tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--color-brown-muted);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  z-index: 1;
}

.nav-tab-item:hover {
  color: var(--color-brown-dark);
  background: var(--color-cream-darker);
}

.nav-tab-item.active {
  color: #fff;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--color-cream-dark);
  border: 0.7px solid var(--color-tan-border);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  white-space: nowrap;
  color: var(--color-brown);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  width: 90px;
  background: var(--color-cinnabar);
  border-color: transparent;
  color: #fff;
}

.nav-btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn-label {
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  display: none;
}

.nav-btn:hover .nav-btn-label {
  display: inline;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: var(--color-nav-bg);
}

/* 历史记录弹窗 */
.history-modal {
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  width: min(600px, 90vw);
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-tan-light);
}

.history-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
}

.history-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-cream-dark);
  color: var(--color-brown);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.history-close-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.history-modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.history-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 20px 0;
  border-bottom: 1px solid var(--color-tan-light);
}

.history-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--color-brown-muted);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.history-tab:hover {
  color: var(--color-brown-dark);
}

.history-tab.active {
  color: var(--color-cinnabar);
  border-bottom-color: var(--color-cinnabar);
  font-weight: 600;
}

.history-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-brown-muted);
  font-size: 14px;
  font-family: var(--font-ui);
}
</style>