<script setup lang="ts">
import { ref } from 'vue'
import {
  RiWindowsLine,
  RiWifiLine,
  RiFingerprintLine
} from '@remixicon/vue'

interface InfoItem {
  label: string;
  value: string;
  isWide?: boolean;
}

interface InfoSection {
  title: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  items: InfoItem[];
}

const systemInfo = ref<InfoSection>({
  title: '操作系统信息',
  icon: RiWindowsLine,
  iconBg: 'rgba(219, 234, 254, 1)',
  iconColor: 'rgba(37, 99, 235, 1)',
  items: [
    { label: '用户名', value: 'administrator' },
    { label: '操作系统版本', value: 'Windows 11 专业版 22H2' },
    { label: '处理器', value: 'Intel(R) Core(TM) i7-12700H CPU @ 2.30GHz' },
    { label: '内存', value: '16.0 GB (15.7 GB 可用)' },
    { label: '系统类型', value: '64 位操作系统, 基于 x64 的处理器' },
    { label: '计算机名称', value: 'DESKTOP-8V7X9Z2' }
  ]
})

const networkInfo = ref<InfoSection>({
  title: '网络信息',
  icon: RiWifiLine,
  iconBg: 'rgba(254, 243, 199, 1)',
  iconColor: 'rgba(217, 119, 6, 1)',
  items: [
    { label: 'IP 地址', value: '192.168.1.105' },
    { label: 'MAC 地址', value: '00:1A:2B:3C:4D:5E' },
    { label: '子网掩码', value: '255.255.255.0' },
    { label: '网关', value: '192.168.1.1' }
  ]
})

const fingerprintInfo = ref<InfoSection>({
  title: '设备指纹信息',
  icon: RiFingerprintLine,
  iconBg: 'rgba(252, 231, 243, 1)',
  iconColor: 'rgba(219, 39, 119, 1)',
  items: [
    { label: '设备唯一标识', value: '8a7f9d2e-3c5b-7a1f-9d4e-2b8c7a9f3e1d', isWide: true }
  ]
})

const sections = ref<InfoSection[]>([systemInfo.value, networkInfo.value, fingerprintInfo.value])
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
        <span class="sample-badge">示例数据</span>
      </div>
    </div>

    <!-- 信息卡片列表 -->
    <div class="info-cards">
      <div v-for="(section, index) in sections" :key="index" class="info-card">
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="icon-container" :style="{ backgroundColor: section.iconBg }">
            <component :is="section.icon" class="card-icon" :style="{ color: section.iconColor }" />
          </div>
          <h2 class="card-title">{{ section.title }}</h2>
        </div>

        <!-- 信息项列表 -->
        <div class="card-body">
          <!-- 全宽布局（指纹信息） -->
          <div v-if="section.items[0]?.isWide" class="info-full-width">
            <div v-for="(item, itemIndex) in section.items" :key="itemIndex" class="info-field-full">
              <span class="field-label">{{ item.label }}</span>
              <div class="field-value-box wide">
                <span class="field-value mono">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <!-- 多列布局（系统信息/网络信息） -->
          <div v-else class="info-multi-columns">
            <div
              v-for="(item, itemIndex) in section.items"
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

.sample-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background-color: rgba(254, 243, 199, 1);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(217, 119, 6, 1);
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

/* 信息卡片 */
.info-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
}

.field-value-box.wide {
  padding: 16px;
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
}

.field-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>
