<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiFilterLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

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
  const result = sessionStorage.getItem('propertyCheckResult')
  if (!result) {
    console.warn('未找到属性检查结果数据')
    return
  }

  try {
    const data = JSON.parse(result)
    propertyDetails.value = data.propertyDetails || []
    matchCount.value = data.matchingProperties || 0
    mismatchCount.value = data.nonMatchingProperties || 0
    warningCount.value = data.warningProperties || 0
    leftFileName.value = data.leftFileName || '文件 A'
    rightFileName.value = data.rightFileName || '文件 B'
    console.log('加载属性检查结果:', {
      leftFileName: leftFileName.value,
      rightFileName: rightFileName.value,
      propertyCount: propertyDetails.value.length
    })
  } catch (error) {
    console.error('解析属性检查结果失败:', error)
    router.push('/property-check')
  }
}

onMounted(() => {
  console.log('PropertyCheckResult - onMounted')
  loadData()
})

// 如果组件被 keep-alive 缓存，激活时重新加载数据
onActivated(() => {
  console.log('PropertyCheckResult - onActivated')
  loadData()
})

// 监听路由查询参数变化，重新加载数据
watch(() => route.query.t, () => {
  console.log('PropertyCheckResult - route.query.t changed')
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
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '属性对比报告.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出报告失败:', error)
    alert('导出报告失败，请重试')
  }
}

const getStatusIcon = (status: string): any => {
  if (status === 'match') return RiCheckLine
  if (status === 'mismatch') return RiCloseCircleLine
  return RiAlertLine
}

const getStatusColor = (status: string): string => {
  if (status === 'match') return 'rgba(34, 139, 34, 1)'
  if (status === 'mismatch') return 'rgba(220, 38, 38, 1)'
  return 'rgba(255, 165, 0, 1)'
}
</script>

<template>
  <div class="property-result-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">属性检查结果</h1>
          <p class="page-subtitle">显示两个文件的基础属性差异和匹配统计</p>
        </div>
        <div class="header-actions">
          <button class="back-btn" @click="handleBack">
            <RiArrowLeftLine class="back-icon" />
            <span class="back-text">返回</span>
          </button>
          <button class="export-btn" @click="handleExport">
            <RiFileExcelLine class="export-icon" />
            <span>导出报告</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 属性对比表格区 -->
    <div class="property-table-card">
      <!-- 表格头部 -->
      <div class="table-card-header">
        <div class="header-icon-wrapper">
          <RiFilterLine class="header-icon" />
        </div>
        <h2 class="header-title">属性对比详情</h2>
        
        <!-- 统计徽章 -->
        <div class="header-stats">
          <div class="stat-badge stat-match">
            <span class="stat-badge-icon">✓</span>
            <span>匹配：{{ matchCount }}项</span>
          </div>
          <div class="stat-badge stat-mismatch">
            <span class="stat-badge-icon">✕</span>
            <span>不匹配：{{ mismatchCount }}项</span>
          </div>
          <div class="stat-badge stat-warning">
            <span class="stat-badge-icon">!</span>
            <span>警告：{{ warningCount }}项</span>
          </div>
        </div>
      </div>

      <!-- 表格内容 -->
      <div class="property-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="table-col col-name">
            <span class="col-text">属性字段</span>
          </div>
          <div class="table-col col-value-left">
            <span class="col-text file-a">{{ leftFileName }}</span>
          </div>
          <div class="table-col col-value-right">
            <span class="col-text file-b">{{ rightFileName }}</span>
          </div>
          <div class="table-col col-status">
            <span class="col-text">状态</span>
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
  </div>
</template>

<style scoped>
.property-result-container {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  height: 40px;
  padding: 0 20px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(139, 0, 0, 1);
  border: 1px solid rgba(139, 0, 0, 0.3);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.back-btn:hover {
  background-color: rgba(139, 0, 0, 0.05);
  border-color: rgba(139, 0, 0, 1);
}

.back-icon {
  font-size: 18px;
  color: rgba(107, 79, 52, 1);
}

.back-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Medium;
}

.export-btn {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  background-color: rgba(46, 89, 132, 1);
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
  background-color: rgba(46, 89, 132, 0.9);
  box-shadow: 0 4px 12px rgba(46, 89, 132, 0.3);
}

.export-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 1);
}

/* 属性对比表格区 */
.property-table-card {
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.table-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.header-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(254, 243, 199, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon {
  font-size: 20px;
  color: rgba(217, 119, 6, 1);
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
  white-space: nowrap;
}

/* 头部统计徽章 */
.header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  font-family: SourceHanSans-Medium, sans-serif;
  white-space: nowrap;
}

.stat-badge-icon {
  font-size: 12px;
  font-weight: 700;
}

.stat-match {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgba(22, 101, 52, 1);
}

.stat-match .stat-badge-icon {
  color: rgba(34, 197, 94, 1);
}

.stat-mismatch {
  background-color: rgba(239, 68, 68, 0.1);
  color: rgba(153, 27, 27, 1);
}

.stat-mismatch .stat-badge-icon {
  color: rgba(239, 68, 68, 1);
}

.stat-warning {
  background-color: rgba(249, 115, 22, 0.1);
  color: rgba(154, 52, 18, 1);
}

.stat-warning .stat-badge-icon {
  color: rgba(249, 115, 22, 1);
}

.property-table {
  border: 0.7px solid rgba(230, 215, 191, 1);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 269px 323px 323px 162px;
  background-color: rgba(245, 238, 226, 1);
}

.table-header .table-col {
  padding: 10px 24px;
}

.table-body {
  overflow: visible;
}

.table-row {
  display: grid;
  grid-template-columns: 269px 323px 323px 162px;
  border-top: 0.7px solid rgba(230, 215, 191, 1);
}

.table-row.row-mismatch {
  background-color: rgba(254, 242, 242, 1);
}

.table-col {
  padding: 10px 24px;
  display: flex;
  align-items: center;
}

.col-name {
  justify-content: flex-start;
}

.col-value-left {
  justify-content: flex-start;
}

.col-status {
  justify-content: center;
  border-right: 0.7px solid rgba(230, 215, 191, 1);
}

.col-value-right {
  justify-content: flex-start;
}

.col-text {
  font-size: 14px;
  line-height: 1.2;
}

.table-header .col-text {
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  color: rgba(107, 79, 52, 1);
}

.table-header .col-text.file-a {
  color: rgba(153, 27, 27, 1);
}

.table-header .col-text.file-b {
  color: rgba(30, 64, 175, 1);
}

.name-text {
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
}

.value-text {
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Regular;
}

.value-text.value-mismatch {
  color: rgba(153, 27, 27, 1);
}

.status-icon-svg {
  font-size: 20px;
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: rgba(166, 124, 82, 1);
  font-size: 14px;
  font-family: SourceHanSans-Regular;
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .page-header {
    display: none;
  }
}
</style>
