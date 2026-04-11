<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
      <div class="title-section">
        <button class="back-btn" @click="handleBack">
          <RiArrowLeftLine class="back-icon" />
          <span class="back-text">返回</span>
        </button>
      </div>
      <button class="export-btn" @click="handleExport">
        <RiFileExcelLine class="export-icon" />
        <span>导出报告</span>
      </button>
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
          <RiCloseCircleLine class="stat-icon" />
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

    <!-- 属性对比表格区 -->
    <div class="property-table-card">
      <!-- 表格头部 -->
      <div class="table-card-header">
        <div class="header-icon-wrapper">
          <RiFilterLine class="header-icon" />
        </div>
        <h2 class="header-title">属性对比详情</h2>
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
          <div class="table-col col-status">
            <span class="col-text">状态</span>
          </div>
          <div class="table-col col-value-right">
            <span class="col-text file-b">{{ rightFileName }}</span>
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
            <div class="table-col col-status">
              <component :is="getStatusIcon(property.status)" class="status-icon-svg" :style="{ color: getStatusColor(property.status) }" />
            </div>
            <div class="table-col col-value-right">
              <span class="col-text value-text" :class="{ 'value-mismatch': property.status === 'mismatch' }">{{ property.rightValue }}</span>
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
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  height: 53px;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  gap: 8px;
  transition: all 0.3s;
}

.back-btn:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
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
  height: 53px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
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
}

.property-table {
  border: 0.7px solid rgba(230, 215, 191, 1);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 269px 323px 162px 323px;
  background-color: rgba(245, 238, 226, 1);
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 269px 323px 162px 323px;
  border-top: 0.7px solid rgba(230, 215, 191, 1);
}

.table-row.row-mismatch {
  background-color: rgba(254, 242, 242, 1);
}

.table-col {
  padding: 16px 24px;
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
