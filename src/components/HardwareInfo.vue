<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  RiComputerLine,
  RiWifiLine,
  RiFingerprintLine,
  RiCpuLine,
  RiHardDrive2Line,
  RiRamLine
} from '@remixicon/vue'

interface HardwareInfo {
  label: string;
  value: string;
  icon: any;
}

interface InfoSection {
  title: string;
  items: HardwareInfo[];
}

const deviceInfo = ref<InfoSection>({
  title: '设备信息',
  items: [
    { label: '操作系统', value: 'Windows 11 Pro', icon: RiComputerLine },
    { label: '系统版本', value: '23H2', icon: RiComputerLine },
    { label: '处理器', value: 'Intel Core i7-12700K', icon: RiCpuLine },
    { label: '内存', value: '32 GB DDR5', icon: RiRamLine },
    { label: '硬盘', value: '1TB NVMe SSD', icon: RiHardDrive2Line }
  ]
})

const networkInfo = ref<InfoSection>({
  title: '网络信息',
  items: [
    { label: 'IP 地址', value: '192.168.1.100', icon: RiWifiLine },
    { label: 'MAC 地址', value: '00-1B-44-11-3A-B7', icon: RiWifiLine },
    { label: '子网掩码', value: '255.255.255.0', icon: RiWifiLine },
    { label: '默认网关', value: '192.168.1.1', icon: RiWifiLine }
  ]
})

const fingerprintInfo = ref<InfoSection>({
  title: '指纹信息',
  items: [
    { label: '设备指纹', value: 'A7F3E9D2C1B8', icon: RiFingerprintLine },
    { label: '硬件指纹', value: 'HW-2024-0409-001', icon: RiFingerprintLine },
    { label: '授权状态', value: '已授权', icon: RiFingerprintLine }
  ]
})

const sections = ref<InfoSection[]>([deviceInfo.value, networkInfo.value, fingerprintInfo.value])

onMounted(() => {
  // 未来可以从系统 API 获取硬件信息
  console.log('硬件信息页面已加载')
})
</script>

<template>
  <div class="hardware-info-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">硬件信息</h1>
      <p class="page-subtitle">查看系统硬件和网络信息</p>
    </div>

    <!-- 信息卡片列表 -->
    <div class="info-cards">
      <div v-for="(section, index) in sections" :key="index" class="info-card">
        <div class="card-header">
          <h2 class="card-title">{{ section.title }}</h2>
        </div>
        <div class="card-content">
          <div v-for="(item, itemIndex) in section.items" :key="itemIndex" class="info-item">
            <div class="info-label">
              <component :is="item.icon" class="item-icon" />
              <span>{{ item.label }}</span>
            </div>
            <div class="info-value">{{ item.value }}</div>
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
  padding: 24px;
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
  gap: 16px;
}

.info-card {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(248, 244, 233, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.1);
  transition: all 0.2s;
}

.info-item:hover {
  background-color: rgba(248, 244, 233, 0.5);
  border-color: rgba(166, 124, 82, 0.2);
}

.info-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.item-icon {
  font-size: 18px;
  color: rgba(139, 0, 0, 1);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
}
</style>
