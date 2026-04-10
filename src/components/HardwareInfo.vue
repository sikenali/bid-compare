<script setup lang="ts">
import {
  RiWindowsLine,
  RiWifiLine,
  RiFingerprintLine
} from '@remixicon/vue'
import { useHardwareInfo } from '../composables/useHardwareInfo'

const {
  systemInfo,
  networkInfo,
  fingerprintInfo,
  isLoading,
  error,
  refresh
} = useHardwareInfo()
</script>

<template>
  <div class="hardware-info-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">硬件信息</h1>
          <p class="page-subtitle">查看系统硬件和网络信息</p>
        </div>
        <div class="header-actions">
          <button class="refresh-btn" @click="refresh" :disabled="isLoading" title="刷新">
            <RiWifiLine class="refresh-icon" :class="{ spinning: isLoading }" />
          </button>
          <span v-if="!isLoading" class="sample-badge">实时数据</span>
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
      <button class="retry-btn" @click="refresh">重试</button>
    </div>

    <!-- 信息卡片列表 -->
    <div v-else class="info-cards">
      <!-- 操作系统信息 -->
      <div v-if="systemInfo" class="info-card">
        <div class="card-header">
          <div class="icon-container" :style="{ backgroundColor: systemInfo.iconBg }">
            <RiWindowsLine class="card-icon" :style="{ color: systemInfo.iconColor }" />
          </div>
          <h2 class="card-title">{{ systemInfo.title }}</h2>
        </div>
        <div class="card-body">
          <div class="info-multi-columns">
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
      </div>

      <!-- 网络信息 -->
      <div v-if="networkInfo" class="info-card">
        <div class="card-header">
          <div class="icon-container" :style="{ backgroundColor: networkInfo.iconBg }">
            <RiWifiLine class="card-icon" :style="{ color: networkInfo.iconColor }" />
          </div>
          <h2 class="card-title">{{ networkInfo.title }}</h2>
        </div>
        <div class="card-body">
          <div class="info-multi-columns">
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
      </div>

      <!-- 设备指纹信息 -->
      <div v-if="fingerprintInfo" class="info-card">
        <div class="card-header">
          <div class="icon-container" :style="{ backgroundColor: fingerprintInfo.iconBg }">
            <RiFingerprintLine class="card-icon" :style="{ color: fingerprintInfo.iconColor }" />
          </div>
          <h2 class="card-title">{{ fingerprintInfo.title }}</h2>
        </div>
        <div class="card-body">
          <div class="info-full-width">
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
  overflow: auto;
  background-color: rgba(248, 244, 233, 1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面头部 */
.page-header {
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
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
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: rgba(139, 0, 0, 0.1);
}

.refresh-btn:disabled {
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 18px;
  color: rgba(107, 79, 52, 1);
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sample-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background-color: rgba(220, 252, 231, 1);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(34, 139, 34, 1);
  font-family: SourceHanSans-Medium;
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
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
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

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
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
  color: rgba(220, 38, 38, 1);
  font-family: SourceHanSans-Regular;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 8px 24px;
  border: 1px solid rgba(139, 0, 0, 1);
  border-radius: 8px;
  background-color: transparent;
  color: rgba(139, 0, 0, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

/* 信息卡片 */
.info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 指纹信息卡片占满整行 */
.info-card:last-child {
  grid-column: 1 / -1;
}

.info-card {
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  font-size: 20px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

/* 卡片内容 */
.card-body {
  margin-top: 24px;
}

/* 多列布局（系统信息/网络信息） */
.info-multi-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 全宽布局（指纹信息） */
.info-full-width {
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
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
}

.field-value-box {
  background-color: rgba(245, 238, 226, 1);
  border-radius: 8px;
  padding: 12px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.field-value-box.wide {
  padding: 16px;
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  line-height: 1.4;
}

.field-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>
