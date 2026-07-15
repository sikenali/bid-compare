<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiFilterLine,
  RiFileLine,
  RiExchangeLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { getPropertyCheckResult, deletePropertyCheckResult } from '../utils/compareResultStore'

interface PropertyDetail {
  name: string;
  leftValue: string;
  rightValue: string;
  status: 'match' | 'mismatch' | 'warning';
}

const route = useRoute()
const router = useRouter()

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
  const resultId = route.query.resultId as string
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
    alert('没有可导出的对比数据')
    return
  }

  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: '属性对比报告', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `匹配属性：${matchCount.value}项`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `不匹配属性：${mismatchCount.value}项`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `警告属性：${warningCount.value}项`, size: 16 })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `左侧文件：${leftFileName.value}`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `右侧文件：${rightFileName.value}`, size: 16 })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '属性对比详情：', bold: true, size: 20 })],
            spacing: { after: 100 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '对比类型', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: leftFileName.value, bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: rightFileName.value, bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '是否匹配', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                ]
              }),
              ...propertyDetails.value.map(property => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: property.name, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: property.leftValue, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: property.rightValue, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({
                    text: property.status === 'match' ? '匹配' : property.status === 'mismatch' ? '不匹配' : '警告',
                    alignment: AlignmentType.CENTER
                  })] }),
                ]
              }))
            ]
          })
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    
    // 生成文件名：file1vsfile2-属性对比报告.docx
    const leftName = (leftFileName.value || 'file1').replace(/\.[^/.]+$/, '')
    const rightName = (rightFileName.value || 'file2').replace(/\.[^/.]+$/, '')
    const fileName = `${leftName}vs${rightName}-属性对比报告.docx`
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    alert('导出报告失败，请重试')
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
    <!-- 文件信息条 -->
    <div class="file-info-bar">
      <div class="file-info-side">
        <div class="file-icon file-a-icon">
          <RiFileLine />
        </div>
        <div class="file-details">
          <div class="file-name">{{ leftFileName }}</div>
          <div class="file-meta">文档 A</div>
        </div>
      </div>
      <div class="compare-icon-wrapper">
        <RiExchangeLine />
      </div>
      <div class="file-info-side right">
        <div class="file-details">
          <div class="file-name">{{ rightFileName }}</div>
          <div class="file-meta">文档 B</div>
        </div>
        <div class="file-icon file-b-icon">
          <RiFileLine />
        </div>
      </div>
    </div>

    <!-- 属性对比表格区 -->
    <div class="ba-card property-table-card">
      <!-- 表格头部 -->
      <div class="ba-card-header">
        <div class="ba-card-header-icon">
          <RiFilterLine class="header-icon" />
        </div>
        <h2 class="ba-card-header-title">属性对比详情</h2>

        <!-- 统计徽章 -->
        <div class="header-stats">
          <div class="ba-stat-badge ba-stat-success">
            <span class="ba-stat-badge-icon">✓</span>
            <span>匹配：{{ matchCount }}项</span>
          </div>
          <div class="ba-stat-badge ba-stat-danger">
            <span class="ba-stat-badge-icon">✕</span>
            <span>不匹配：{{ mismatchCount }}项</span>
          </div>
          <div class="ba-stat-badge ba-stat-warn">
            <span class="ba-stat-badge-icon">!</span>
            <span>警告：{{ warningCount }}项</span>
          </div>
        </div>
      </div>

      <!-- 表格内容 -->
      <div class="ba-table-scroll property-table">
        <div class="property-table-inner">
        <!-- 表头 -->
        <div class="table-header">
          <div class="table-col col-name">
            <span class="col-text">属性字段</span>
          </div>
          <div class="table-col col-value-left">
            <span class="col-text ba-text-file-a">文件 A</span>
          </div>
          <div class="table-col col-value-right">
            <span class="col-text ba-text-file-b">文件 B</span>
          </div>
          <div class="table-col col-status">
            <span class="col-text">结果</span>
          </div>
        </div>

        <!-- 表体 -->
        <div class="table-body">
          <div
            v-for="(property, index) in propertyDetails"
            :key="index"
            class="table-row"
            :class="{ 'row-mismatch': property.status === 'mismatch' }"
          >
            <div class="table-col col-name">
              <span class="col-text name-text">{{ property.name }}</span>
            </div>
            <div class="table-col col-value-left">
              <span class="col-text value-text" :class="{ 'value-mismatch': property.status === 'mismatch' }">{{ property.leftValue }}</span>
            </div>
            <div class="table-col col-value-right">
              <span class="col-text value-text" :class="{ 'value-mismatch': property.status === 'mismatch' }">{{ property.rightValue }}</span>
            </div>
            <div class="table-col col-status">
              <component :is="getStatusIcon(property.status)" class="status-icon-svg" :style="{ color: getStatusColor(property.status) }" />
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="propertyDetails.length === 0" class="empty-state">
            <p>暂无对比数据</p>
          </div>
        </div>
        </div>
      </div>
      <div class="card-actions">
        <button class="card-action-btn" @click="handleBack">返回</button>
        <button class="card-action-btn card-action-primary" @click="handleExport">导出</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.property-result-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--color-parchment);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  font-family: var(--font-ui);
}

.property-table-card {
  padding: var(--spacing-5);
}

/* 文件信息条 */
.file-info-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--color-icon-bg);
  border-radius: 12px;
}

.file-info-side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-info-side.right {
  flex-direction: row-reverse;
}

.file-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-white);
  flex-shrink: 0;
}

.file-a-icon {
  background: var(--color-accent-red);
}

.file-b-icon {
  background: var(--color-blue-accent);
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: var(--color-brown-muted);
}

.compare-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-tan-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-accent-red);
  flex-shrink: 0;
}

.property-table-card .ba-card-header {
  margin-bottom: var(--spacing-4);
  gap: 10px;
}

.header-icon {
  font-size: 16px;
  color: var(--color-gold-dark);
}

.ba-card-header {
  padding: 12px 20px;
  margin-bottom: 0;
}

.ba-card-header-icon {
  width: 32px;
  height: 32px;
}

.ba-card-header-title {
  font-size: 14px;
  white-space: nowrap;
  font-family: var(--font-ui);
  color: var(--color-brown-dark);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
}

.header-stats :deep(.ba-stat-badge) {
  font-size: 11px;
  padding: 3px 8px;
}

.property-table {
  border: 0.7px solid var(--color-tan-border);
  border-radius: var(--radius-md);
}

.property-table-inner {
  display: flex;
  flex-direction: column;
  min-width: 720px;
}

.table-header {
  display: grid;
  grid-template-columns: 200px 1fr 1fr 90px;
  background: var(--color-cream-darker);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.table-header .table-col {
  padding: 10px 16px;
}

.table-body {
  overflow: visible;
}

.table-row {
  display: grid;
  grid-template-columns: 200px 1fr 1fr 90px;
  border-top: 0.7px solid var(--color-tan-border);
}

.table-row.row-mismatch {
  background: rgba(254, 242, 242, 0.6);
}

.table-col {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  min-width: 0;
}

.col-name {
  justify-content: flex-start;
}

.col-value-left {
  justify-content: flex-start;
}

.col-status {
  justify-content: center;
  border-right: 0.7px solid var(--color-tan-border);
}

.col-value-right {
  justify-content: flex-start;
}

.col-text {
  font-size: var(--text-body);
  line-height: 1.4;
  word-break: break-word;
}

.table-header .col-text {
  font-weight: 600;
  font-family: var(--font-ui);
  color: var(--color-brown);
  font-size: var(--text-body-sm);
}

.name-text {
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.value-text {
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.value-text.value-mismatch {
  color: var(--color-cinnabar);
  font-weight: 600;
}

.status-icon-svg {
  font-size: 20px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--color-brown-muted);
  font-size: var(--text-body);
  font-family: var(--font-ui);
}

/* ================= 移动端响应式 ================= */
@media (max-width: 768px) {
  .property-result-container {
    padding: 12px 12px;
    gap: 12px;
  }

  .property-table-card {
    padding: 14px;
  }

  .property-table-card .ba-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .ba-card-header-title {
    font-size: 16px;
  }

  .header-stats {
    margin-left: 0;
    width: 100%;
  }

  .header-stats .ba-stat-badge {
    font-size: 12px;
    padding: 4px 10px;
  }

  /* 表格容器允许横向滚动,但内容最小宽减小 */
  .property-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .property-table-inner {
    min-width: 600px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 140px 1fr 1fr 60px;
  }

  .table-header .table-col,
  .table-col {
    padding: 8px 10px;
  }

  .col-text {
    font-size: 13px;
  }

  .status-icon-svg {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .property-table-inner {
    min-width: 480px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 110px 1fr 1fr 50px;
  }

  .table-header .table-col,
  .table-col {
    padding: 6px 8px;
  }

  .col-text {
    font-size: 12px;
  }

  .header-stats .ba-stat-badge {
    font-size: 11px;
    padding: 3px 8px;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-tan-light);
}

.card-action-btn {
  padding: 8px 20px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  background: var(--color-cream-dark);
  color: var(--color-brown-muted);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.2s;
}

.card-action-btn:hover {
  background: var(--color-cream-darker);
}

.card-action-primary {
  border: none;
  background: var(--color-accent-red);
  color: var(--color-white);
  font-weight: 600;
}

.card-action-primary:hover {
  background: var(--color-accent-red-dark);
}
</style>
