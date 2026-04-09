<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine
} from '@remixicon/vue'

interface PropertyDetail {
  name: string;
  leftValue: string;
  rightValue: string;
  status: 'match' | 'mismatch' | 'warning';
}

const router = useRouter()

const propertyDetails = ref<PropertyDetail[]>([])
const matchCount = ref(0)
const mismatchCount = ref(0)
const warningCount = ref(0)
const leftFileName = ref('')
const rightFileName = ref('')

onMounted(() => {
  const result = sessionStorage.getItem('propertyCheckResult')
  if (!result) {
    router.push('/property-check')
    return
  }

  try {
    const data = JSON.parse(result)
    propertyDetails.value = data.properties || []
    matchCount.value = data.stats?.matchCount || 0
    mismatchCount.value = data.stats?.mismatchCount || 0
    warningCount.value = data.stats?.warningCount || 0
    leftFileName.value = data.leftFileName || '文件 A'
    rightFileName.value = data.rightFileName || '文件 B'
  } catch (error) {
    console.error('解析属性检查结果失败:', error)
    router.push('/property-check')
  }
})

const handleBack = () => {
  router.push('/property-check')
}

const handleExport = () => {
  alert('导出功能开发中...')
}

const getStatusIcon = (status: string): any => {
  if (status === 'match') return RiCheckLine
  if (status === 'mismatch') return RiCloseLine
  return RiAlertLine
}

const getStatusText = (status: string): string => {
  if (status === 'match') return '匹配'
  if (status === 'mismatch') return '不匹配'
  return '警告'
}
</script>

<template>
  <div class="property-result-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-section">
        <button class="back-btn" @click="handleBack">
          <RiArrowLeftLine class="back-icon" />
        </button>
        <div class="title-text">
          <h1 class="page-title">属性检查结果</h1>
          <p class="page-subtitle">{{ leftFileName }} vs {{ rightFileName }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="export-btn" @click="handleExport">
          <RiFileExcelLine class="export-icon" />
          <span>导出报告</span>
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card match">
        <div class="stat-icon-wrapper match">
          <RiCheckLine class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">匹配属性</span>
          <span class="stat-value match">{{ matchCount }}项</span>
        </div>
      </div>
      <div class="stat-card mismatch">
        <div class="stat-icon-wrapper mismatch">
          <RiCloseLine class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">不匹配属性</span>
          <span class="stat-value mismatch">{{ mismatchCount }}项</span>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon-wrapper warning">
          <RiAlertLine class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">警告属性</span>
          <span class="stat-value warning">{{ warningCount }}项</span>
        </div>
      </div>
    </div>

    <!-- 属性对比表格 -->
    <div class="property-table">
      <div class="table-header-bar">
        <h2 class="section-title">属性对比详情</h2>
      </div>

      <!-- 表头 -->
      <div class="table-header">
        <div class="table-col col-name">对比类型</div>
        <div class="table-col col-value">{{ leftFileName }}</div>
        <div class="table-col col-value">{{ rightFileName }}</div>
        <div class="table-col col-status">是否匹配</div>
      </div>

      <!-- 表体 -->
      <div class="table-body">
        <div
          v-for="(property, index) in propertyDetails"
          :key="index"
          class="table-row"
          :class="`status-${property.status}`"
        >
          <div class="table-col col-name">{{ property.name }}</div>
          <div class="table-col col-value">{{ property.leftValue }}</div>
          <div class="table-col col-value">{{ property.rightValue }}</div>
          <div class="table-col col-status">
            <component :is="getStatusIcon(property.status)" class="status-icon" :class="property.status" />
            <span class="status-text" :class="property.status">
              {{ getStatusText(property.status) }}
            </span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="propertyDetails.length === 0" class="empty-state">
          <p>暂无对比数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.property-result-container {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: rgba(139, 0, 0, 1);
}

.back-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.back-icon {
  font-size: 20px;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-Bold;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: rgba(139, 0, 0, 1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  font-family: SourceHanSans-Medium;
}

.export-btn:hover {
  background-color: rgba(139, 0, 0, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.export-icon {
  font-size: 18px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.match {
  background-color: rgba(34, 139, 34, 0.1);
}

.stat-icon-wrapper.mismatch {
  background-color: rgba(139, 0, 0, 0.1);
}

.stat-icon-wrapper.warning {
  background-color: rgba(255, 165, 0, 0.1);
}

.stat-icon {
  font-size: 24px;
}

.stat-icon-wrapper.match .stat-icon {
  color: rgba(34, 139, 34, 1);
}

.stat-icon-wrapper.mismatch .stat-icon {
  color: rgba(139, 0, 0, 1);
}

.stat-icon-wrapper.warning .stat-icon {
  color: rgba(255, 165, 0, 1);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
}

.stat-value.match {
  color: rgba(34, 139, 34, 1);
}

.stat-value.mismatch {
  color: rgba(139, 0, 0, 1);
}

.stat-value.warning {
  color: rgba(255, 165, 0, 1);
}

/* 属性表格 */
.property-table {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-header-bar {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
  background-color: rgba(248, 244, 233, 0.5);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 120px;
  background-color: rgba(248, 244, 233, 0.8);
  border-bottom: 2px solid rgba(166, 124, 82, 0.3);
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.table-header .table-col {
  padding: 12px 16px;
  text-align: center;
}

.table-body {
  overflow-y: auto;
  flex: 1;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 120px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  transition: background-color 0.2s;
  font-size: 13px;
}

.table-row:hover {
  background-color: rgba(248, 244, 233, 0.3);
}

.table-row.status-mismatch {
  background-color: rgba(139, 0, 0, 0.05);
}

.table-row.status-mismatch:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.table-col {
  padding: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(44, 24, 16, 1);
}

.col-name {
  justify-content: flex-start;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
}

.col-value {
  color: rgba(166, 124, 82, 1);
}

.col-status {
  justify-content: center;
  gap: 8px;
}

.status-icon {
  font-size: 20px;
}

.status-icon.match {
  color: rgba(34, 139, 34, 1);
}

.status-icon.mismatch {
  color: rgba(139, 0, 0, 1);
}

.status-icon.warning {
  color: rgba(255, 165, 0, 1);
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
}

.status-text.match {
  color: rgba(34, 139, 34, 1);
}

.status-text.mismatch {
  color: rgba(139, 0, 0, 1);
}

.status-text.warning {
  color: rgba(255, 165, 0, 1);
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: rgba(166, 124, 82, 1);
  font-size: 14px;
  font-family: SourceHanSans-Regular;
}
</style>
