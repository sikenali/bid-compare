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
  background-color: rgba(248, 244, 233, 1);
  gap: 12px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面标题区 */
.page-header {
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 4px 0;
  font-family: SourceHanSans-Bold;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(101, 70, 40, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.refresh-btn:hover:not(:disabled) {
  background-color: rgba(139, 0, 0, 0.1);
  border-color: rgba(139, 0, 0, 0.3);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.refresh-icon {
  font-size: 18px;
  color: rgba(101, 70, 40, 0.8);
  transition: transform 0.3s ease;
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
  background: rgba(139, 0, 0, 0.08);
  border: 1px solid rgba(139, 0, 0, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(139, 0, 0, 1);
}

/* 布局 - 左侧导航 + 右侧内容 */
.info-layout {
  display: flex;
  gap: 24px;
  min-height: calc(100vh - 180px);
  padding: 0 24px 24px 24px;
  overflow-y: auto;
}

/* 左侧导航 */
.info-nav {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 2px solid rgba(139, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.1);
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
  border-radius: 8px;
  background: transparent;
  color: rgba(101, 70, 40, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.6);
  color: rgba(44, 24, 16, 1);
}

.nav-tab.active {
  background: rgba(139, 0, 0, 0.08);
  color: rgba(139, 0, 0, 1);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.1);
}

.nav-tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-tab.active .nav-tab-icon {
  color: rgba(139, 0, 0, 1);
}

.nav-tab-label {
  flex: 1;
}

/* 右侧内容 */
.info-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.info-section {
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.06);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  font-family: SourceHanSans-SemiBold;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 信息字段 */
.info-field,
.info-field-full {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 14px;
  color: rgba(101, 70, 40, 0.8);
  font-weight: 500;
}

.field-value-box {
  background-color: rgba(248, 244, 233, 0.5);
  border: 1px solid rgba(166, 124, 82, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.field-value-box.wide {
  padding: 14px;
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  line-height: 1.4;
}

.field-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}

/* 加载状态 */
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
  border: 3px solid rgba(216, 191, 156, 0.3);
  border-top-color: rgba(139, 0, 0, 1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: rgba(101, 70, 40, 0.8);
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.error-text {
  font-size: 14px;
  color: rgba(196, 30, 58, 1);
  margin-bottom: 16px;
}

.retry-btn {
  padding: 10px 24px;
  border: 1px solid rgba(139, 0, 0, 0.3);
  border-radius: 8px;
  background-color: transparent;
  color: rgba(139, 0, 0, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.retry-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

/* 移动端响应式 */
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
