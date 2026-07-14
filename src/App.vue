<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { RiExchangeLine, RiHistoryLine, RiSettings3Line } from '@remixicon/vue'
import { useRecentRecords } from './composables/useRecentRecords'
import RecentRecords from './components/RecentRecords.vue'

const router = useRouter()
const route = useRoute()

const { recentRecords, addRecentRecord, clearAllRecords, deleteRecord } = useRecentRecords('fileCompare')

const showHistory = ref(false)

const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

const viewHistoricalRecord = async (record: any) => {
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
        <div class="history-modal-body">
          <RecentRecords
            v-if="recentRecords.length > 0"
            :recent-records="recentRecords"
            :on-clear-all="clearAllRecords"
            :on-view-record="viewHistoricalRecord"
            :on-delete-record="deleteRecord"
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

.history-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-brown-muted);
  font-size: 14px;
  font-family: var(--font-ui);
}
</style>