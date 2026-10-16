<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiEraserLine,
  RiDownload2Line,
  RiCheckLine,
} from '@remixicon/vue'
import { Packer } from 'docx'
import { getPropertyCheckResult, deletePropertyCheckResult } from '../utils/compareResultStore'
import { useToast } from '../composables/useToast'
import { generatePropertyWordReport, generatePropertyPdfReport, downloadBlob } from '../utils/exportReport'

interface PropertyDetail {
  name: string;
  leftValue: string;
  rightValue: string;
  status: 'match' | 'mismatch' | 'warning';
}

const route = useRoute()
const router = useRouter()
const { error: showError } = useToast()

const propertyDetails = ref<PropertyDetail[]>([])
const matchCount = ref(0)
const mismatchCount = ref(0)
const warningCount = ref(0)
const leftFileName = ref('')
const rightFileName = ref('')

// 加载数据函数
const loadData = () => {
  let data: any = null

  // 1. 优先尝试从路由参数中的 resultId 读取模块级存储
  const resultId = route.params.resultId as string
  if (resultId) {
    data = getPropertyCheckResult(resultId)
    // 读取后删除，避免内存积累
    if (data) {
      deletePropertyCheckResult(resultId)
    }
  }

  // 2. 如果模块级存储没有，尝试从 sessionStorage 读取（兼容旧数据）
  if (!data) {
    const result = sessionStorage.getItem('propertyCheckResult')
    if (result) {
      try {
        data = JSON.parse(result)
        sessionStorage.removeItem('propertyCheckResult')
      } catch (e) {
        // ignore
      }
    }
  }

  if (!data) {
    return
  }

  try {
    propertyDetails.value = data.propertyDetails || []
    matchCount.value = data.matchingProperties || 0
    mismatchCount.value = data.nonMatchingProperties || 0
    warningCount.value = data.warningProperties || 0
    leftFileName.value = data.leftFileName || '文件 A'
    rightFileName.value = data.rightFileName || '文件 B'
  } catch (error) {
    router.push('/property-check')
  }
}

onMounted(() => {
  loadData()
})

onActivated(() => {
  loadData()
})

watch(() => route.query.t, () => {
  loadData()
})

const handleBack = () => {
  router.push('/property-check')
}

const handleExport = async () => {
  if (propertyDetails.value.length === 0) {
    showError('没有可导出的对比数据')
    return
  }

  try {
    const exportData = {
      leftFileName: leftFileName.value || '文件A',
      rightFileName: rightFileName.value || '文件B',
      matchCount: matchCount.value,
      mismatchCount: mismatchCount.value,
      warningCount: warningCount.value,
      propertyDetails: propertyDetails.value,
      similarity: '—',
    }

    const leftName = (leftFileName.value || 'file1').replace(/\.[^/.]+$/, '')
    const rightName = (rightFileName.value || 'file2').replace(/\.[^/.]+$/, '')
    const baseName = `${leftName}vs${rightName}`

    // 默认导出 Word，同时提供 PDF 选项
    const doc = generatePropertyWordReport(exportData)
    const blob = await Packer.toBlob(doc)
    downloadBlob(blob, `${baseName}-属性对比报告.docx`)

    showToast('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showError('导出报告失败，请重试')
  }
}

const getStatusIcon = (status: string): any => {
  if (status === 'match') return RiCheckLine
  if (status === 'mismatch') return RiCloseCircleLine
  return RiAlertLine
}

const getStatusColor = (status: string): string => {
  if (status === 'match') return 'var(--color-jade)'
  if (status === 'mismatch') return 'var(--color-cinnabar)'
  return 'var(--color-gold-dark)'
}
</script>

<template>
  <div class="property-result-container">
    <!-- 筛选行 -->
    <div class="filter-row">
      <div class="filter-left">
        <div class="stat-badge stat-match">
          <RiCheckboxCircleLine class="stat-icon" />
          <span>相同 {{ matchCount }} 处</span>
        </div>
        <div class="stat-badge stat-mismatch">
          <RiCloseCircleLine class="stat-icon" />
          <span>不同 {{ mismatchCount }} 处</span>
        </div>
        <div v-if="warningCount > 0" class="stat-badge stat-warning">
          <RiAlertLine class="stat-icon" />
          <span>存疑 {{ warningCount }} 处</span>
        </div>
        <span class="stat-total">共：{{ matchCount + mismatchCount + warningCount }} 处</span>
      </div>
      <div class="filter-right">
        <button class="filter-btn filter-btn-primary" @click="handleExport">
          <RiDownload2Line class="btn-icon" />
          导出
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-area">
      <div class="property-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="th th-index">序号</div>
          <div class="th th-name">属性字段</div>
          <div class="th th-value">原始版本</div>
          <div class="th th-value">修订版本</div>
          <div class="th th-result">对比结果</div>
        </div>

        <!-- 表体 -->
        <div class="table-body">
          <div
            v-for="(property, index) in propertyDetails"
            :key="index"
            class="table-row"
            :class="{ 'row-alternate': index % 2 === 1 }"
          >
            <div class="color-bar" :class="property.status === 'match' ? 'bar-match' : property.status === 'warning' ? 'bar-warning' : 'bar-mismatch'"></div>
            <div class="td td-index">{{ index + 1 }}</div>
            <div class="td td-name">{{ property.name }}</div>
            <div class="td td-value" :class="property.status === 'mismatch' ? 'text-mismatch' : property.status === 'warning' ? 'text-warning' : 'text-match'">
              {{ property.leftValue }}
            </div>
            <div class="td td-value" :class="property.status === 'mismatch' ? 'text-mismatch' : property.status === 'warning' ? 'text-warning' : 'text-match'">
              {{ property.rightValue }}
            </div>
            <div class="td td-result">
              <component :is="getStatusIcon(property.status)" class="result-icon" :style="{ color: getStatusColor(property.status) }" />
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="propertyDetails.length === 0" class="empty-state">
            <p>暂无对比数据</p>
          </div>
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
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px;
  font-family: var(--font-ui);
}

/* 筛选行 */
.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 15px;
  font-family: var(--font-ui);
}

.stat-match {
  background: var(--color-bg-secondary, #F3F1EA);
  color: var(--color-text-body, #3A3A3A);
}

.stat-match .stat-icon {
  color: var(--color-jade, #4E9B7A);
  font-size: 17px;
}

.stat-mismatch {
  background: var(--color-diff-deleted, #FBE9E7);
  color: var(--color-text-body, #3A3A3A);
}

.stat-mismatch .stat-icon {
  color: var(--color-cinnabar, #C0392B);
  font-size: 17px;
}

.stat-warning {
  background: var(--color-diff-modified, #FFF8E1);
  color: var(--color-text-body, #3A3A3A);
}

.stat-warning .stat-icon {
  color: var(--color-gold-dark, #D4A030);
  font-size: 17px;
}

.stat-total {
  font-size: 15px;
  color: var(--color-text-muted, #8A8578);
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  border: 0.7px solid var(--color-border, #E5DFD3);
  border-radius: 10px;
  background: var(--color-bg-card, #FCFBF8);
  color: var(--color-text-body, #3A3A3A);
  font-size: 15px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: var(--color-bg-secondary, #F7F3EA);
}

.filter-btn-primary {
  border: none;
  background: var(--color-accent-red, #C0392B);
  color: var(--color-white, #FFFFFF);
}

.filter-btn-primary:hover {
  background: var(--color-accent-red-dark, #A93226);
}

.btn-icon {
  font-size: 17px;
}

/* 表格 */
.content-area {
  display: flex;
  flex-direction: column;
}

.property-table {
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 12px;
  background: var(--color-bg-white, #FFFFFF);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 272px 1fr 1fr 136px;
  height: 54px;
  background: var(--color-bg-secondary, #F7F3EA);
  border-radius: 8px 8px 0 0;
  padding: 0 24px;
  align-items: center;
}

.th {
  font-size: 15px;
  color: var(--color-text-secondary, #6E6A60);
  font-family: var(--font-ui);
}

.th-result {
  text-align: center;
}

.table-body {
  overflow: visible;
}

.table-row {
  display: grid;
  grid-template-columns: 100px 272px 1fr 1fr 136px;
  height: 48px;
  align-items: center;
  padding: 0 24px;
  border-top: 0.7px solid var(--color-border-soft, #EDE9E0);
  position: relative;
}

.row-alternate {
  background: var(--color-bg-card, #FDFCF9);
}

.color-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.bar-match {
  background: var(--color-jade, #4E9B7A);
}

.bar-mismatch {
  background: var(--color-cinnabar, #C0392B);
}

.bar-warning {
  background: var(--color-gold-dark, #D4A030);
}

.td {
  font-size: 16px;
  font-family: var(--font-ui);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-index {
  color: var(--color-text-muted, #8A8578);
  padding-left: 16px;
}

.td-name {
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
}

.text-mismatch {
  color: var(--color-cinnabar, #C0392B);
}

.text-warning {
  color: var(--color-text-muted, #8A8578);
}

.text-match {
  color: var(--color-text-secondary, #6E6A60);
}

.td-result {
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon {
  font-size: 22px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-muted, #8A8578);
  font-size: 16px;
  font-family: var(--font-ui);
}

/* 响应式 */
@media (max-width: 768px) {
  .property-result-container {
    padding: 12px;
    gap: 12px;
  }

  .filter-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .filter-right {
    width: 100%;
  }

  .table-header {
    grid-template-columns: 60px 140px 1fr 1fr 80px;
    padding: 0 12px;
    font-size: 13px;
  }

  .table-row {
    grid-template-columns: 60px 140px 1fr 1fr 80px;
    padding: 0 12px;
    font-size: 13px;
  }

  .td {
    font-size: 13px;
  }
}
</style>
