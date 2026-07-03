<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  RiWindowsLine,
  RiWifiLine,
  RiFingerprintLine,
  RiRestartLine,
  RiComputerLine,
  RiServerLine
} from '@remixicon/vue'
import { useHardwareInfo } from '../composables/useHardwareInfo'
import { BorderBeam } from 'vue3-border-beam'

const {
  systemInfo,
  networkInfo,
  fingerprintInfo,
  isLoading,
  error,
  refresh
} = useHardwareInfo()

// 当前激活的标签页
const activeTab = ref('system')

// 导航标签配置
const navTabs = [
  { key: 'system', label: '操作系统', icon: RiWindowsLine },
  { key: 'network', label: '网络信息', icon: RiWifiLine },
  { key: 'fingerprint', label: '设备指纹', icon: RiFingerprintLine }
]
</script>

<template>
  <div class="hardware-info-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">硬件信息</h1>
          <p class="page-subtitle">查看系统硬件和网络信息</p>
        </div>
        <div class="header-actions">
          <BorderBeam size="sm" color-variant="ocean" theme="dark" :duration="2">
            <button class="refresh-btn" @click="refresh" :disabled="isLoading" title="刷新">
              <RiRestartLine class="refresh-icon" :class="{ spinning: isLoading }" />
            </button>
          </BorderBeam>
          <span class="sample-badge">实时数据</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在获取硬件信息...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <p class="error-text">获取硬件信息失败：{{ error }}</p>
      <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
        <button class="retry-btn" @click="refresh">重试</button>
      </BorderBeam>
    </div>

    <!-- 内容区 - 左侧导航 + 右侧内容 -->
    <div v-else class="info-layout">
      <!-- 左侧导航 -->
      <nav class="info-nav">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="nav-tab-icon" />
          <span class="nav-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- 右侧内容 -->
      <div class="info-content">
        <!-- 操作系统信息 -->
        <div v-if="activeTab === 'system' && systemInfo" class="info-section">
          <h2 class="section-title">{{ systemInfo.title }}</h2>
          <div class="info-grid">
            <div
              v-for="(item, itemIndex) in systemInfo.items"
              :key="itemIndex"
              class="info-field"
            >
              <span class="field-label">{{ item.label }}</span>
              <div class="field-value-box">
                <span class="field-value">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 网络信息 -->
        <div v-if="activeTab === 'network' && networkInfo" class="info-section">
          <h2 class="section-title">{{ networkInfo.title }}</h2>
          <div class="info-grid">
            <div
              v-for="(item, itemIndex) in networkInfo.items"
              :key="itemIndex"
              class="info-field"
            >
              <span class="field-label">{{ item.label }}</span>
              <div class="field-value-box">
                <span class="field-value">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 设备指纹信息 -->
        <div v-if="activeTab === 'fingerprint' && fingerprintInfo" class="info-section">
          <h2 class="section-title">{{ fingerprintInfo.title }}</h2>
          <div class="info-list">
            <div
              v-for="(item, itemIndex) in fingerprintInfo.items"
              :key="itemIndex"
              class="info-field-full"
            >
              <span class="field-label">{{ item.label }}</span>
              <div class="field-value-box wide">
                <span class="field-value mono">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hardware-info-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-parchment);
  gap: var(--spacing-3);
  font-family: var(--font-ui);
}

.page-header {
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.page-title {
  font-size: var(--text-heading-lg);
  font-weight: 700;
  color: var(--color-brown-dark);
  margin: 0 0 4px 0;
  font-family: var(--font-ui);
}

.page-subtitle {
  font-size: var(--text-caption);
  color: var(--color-brown);
  margin: 0;
  font-family: var(--font-ui);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-cream-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  border: 1px solid var(--color-tan-border);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(var(--rgb-cinnabar), 0.1);
  border-color: var(--color-cinnabar);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.refresh-icon {
  font-size: 18px;
  color: var(--color-brown);
  transition: transform var(--transition-normal);
}

.refresh-icon.spinning {
  animation: spin-refresh 1s ease-in-out infinite;
}

@keyframes spin-refresh {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg); }
}

.sample-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  background: rgba(var(--rgb-cinnabar), 0.08);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--color-cinnabar);
}

.info-layout {
  display: flex;
  gap: var(--spacing-6);
  min-height: calc(100vh - 180px);
  padding: 0 24px 24px 24px;
  overflow-y: auto;
}

.info-nav {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--spacing-2);
  background: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
  align-self: stretch;
}

.info-nav::after {
  content: '';
  flex: 1;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-brown);
  font-size: var(--text-body);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.nav-tab:hover {
  background: var(--color-cream-dark);
  color: var(--color-brown-dark);
}

.nav-tab.active {
  background: rgba(var(--rgb-cinnabar), 0.08);
  color: var(--color-cinnabar);
  font-weight: 600;
}

.nav-tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-tab.active .nav-tab-icon {
  color: var(--color-cinnabar);
}

.nav-tab-label {
  flex: 1;
}

.info-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.info-section {
  flex: 1;
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: var(--text-heading);
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0 0 20px 0;
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--color-tan-light);
  font-family: var(--font-ui);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-5);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.info-field,
.info-field-full {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.field-label {
  font-size: var(--text-body);
  color: var(--color-brown);
  font-weight: 500;
}

.field-value-box {
  background: var(--color-parchment);
  border: 1px solid var(--color-tan-light);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.field-value-box.wide {
  padding: 14px;
}

.field-value {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-brown-dark);
  line-height: 1.4;
}

.field-value.mono {
  font-family: 'Courier New', monospace;
  font-size: var(--text-body-sm);
  word-break: break-all;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-tan-border);
  border-top-color: var(--color-cinnabar);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: var(--spacing-4);
  font-size: var(--text-body);
  color: var(--color-brown);
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.error-text {
  font-size: var(--text-body);
  color: var(--color-cinnabar);
  margin-bottom: var(--spacing-4);
}

.retry-btn {
  padding: 10px 24px;
  border: 1px solid var(--color-cinnabar);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-cinnabar);
  cursor: pointer;
  font-size: var(--text-body);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
}

@media (max-width: 768px) {
  .info-layout {
    flex-direction: column;
  }

  .info-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .nav-tab {
    white-space: nowrap;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .page-header {
    margin-bottom: 16px;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
