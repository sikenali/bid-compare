<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowLeftLine,
  RiText,
  RiPercentLine,
  RiCheckLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

interface SimilarSegment {
  id: number;
  similarity: string;
  similarityValue: number;
  leftContent: string;
  rightContent: string;
  leftPage: string;
  rightPage: string;
}

interface ComparisonStats {
  totalWords: number;
  similarWords: number;
  similarityRate: number;
}

const route = useRoute()
const router = useRouter()

const segments = ref<SimilarSegment[]>([])
const stats = ref<ComparisonStats | null>(null)
const leftFileName = ref('')
const rightFileName = ref('')

onMounted(() => {
  const result = sessionStorage.getItem('compareResult')
  if (!result) {
    router.push('/file-compare')
    return
  }

  try {
    const data = JSON.parse(result)
    segments.value = data.segments || []
    stats.value = data.stats || null
    leftFileName.value = data.leftFileName || '左侧文件'
    rightFileName.value = data.rightFileName || '右侧文件'
    hasMore.value = false
  } catch (error) {
    console.error('解析对比结果失败:', error)
    router.push('/file-compare')
  }
})

const handleBack = () => {
  router.push('/file-compare')
}

const handleExport = async () => {
  if (!stats.value || segments.value.length === 0) {
    alert('没有可导出的对比数据')
    return
  }

  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: '文件对比报告', bold: true, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '相似度统计：', bold: true, size: 20 })],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `总字数：${stats.value.totalWords.toLocaleString()}` , size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `相似字数：${stats.value.similarWords.toLocaleString()}`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `整体重合率：${stats.value.similarityRate.toFixed(2)}%`, size: 16 })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '文件信息：', bold: true, size: 20 })],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `左侧文件：${leftFileName.value}`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `右侧文件：${rightFileName.value}`, size: 16 })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '雷同片段详情：', bold: true, size: 20 })],
            spacing: { after: 100 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: '序号', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '左侧内容', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '相似度', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '右侧内容', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                ]
              }),
              ...segments.value.map(segment => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: segment.id.toString(), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.leftContent.replace(/<[^>]*>/g, '') })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.similarity, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.rightContent.replace(/<[^>]*>/g, '') })] }),
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
    link.download = '文件对比报告.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出报告失败:', error)
    alert('导出报告失败，请重试')
  }
}

const getSimilarityLevel = (value: number): string => {
  if (value >= 90) return 'high'
  if (value >= 70) return 'medium'
  return 'low'
}
</script>

<template>
  <div class="result-page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-section">
        <button class="back-btn" @click="handleBack">
          <RiArrowLeftLine class="back-icon" />
        </button>
        <div class="title-text">
          <h1 class="page-title">文件对比结果</h1>
          <p class="page-subtitle">{{ leftFileName }} vs {{ rightFileName }}</p>
        </div>
      </div>
      <button class="export-btn" @click="handleExport">
        <RiFileExcelLine class="export-icon" />
        <span>导出报告</span>
      </button>
    </div>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon-wrapper">
          <RiText class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">总字数</span>
          <span class="stat-value">{{ stats.totalWords.toLocaleString() }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper similar">
          <RiCheckLine class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">相似字数</span>
          <span class="stat-value similar">{{ stats.similarWords.toLocaleString() }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper rate">
          <RiPercentLine class="stat-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">整体重合率</span>
          <span class="stat-value rate">{{ stats.similarityRate.toFixed(2) }}%</span>
        </div>
      </div>
    </div>

    <!-- 对比列表 -->
    <div class="comparison-list">
      <div class="section-header">
        <h2 class="section-title">相似片段列表</h2>
        <span class="section-count">共 {{ segments.length }} 条</span>
      </div>

      <!-- 表头 -->
      <div class="table-header">
        <div class="table-col col-index">序号</div>
        <div class="table-col col-content">左侧文件内容</div>
        <div class="table-col col-position">左侧位置</div>
        <div class="table-col col-content">右侧文件内容</div>
        <div class="table-col col-position">右侧位置</div>
        <div class="table-col col-similarity">相似度</div>
      </div>

      <!-- 表体 -->
      <div class="table-body">
        <div v-for="(segment, index) in segments" :key="segment.id" class="table-row">
          <div class="table-col col-index">{{ index + 1 }}</div>
          <div class="table-col col-content" v-html="segment.leftContent"></div>
          <div class="table-col col-position">{{ segment.leftPage }}</div>
          <div class="table-col col-content" v-html="segment.rightContent"></div>
          <div class="table-col col-position">{{ segment.rightPage }}</div>
          <div class="table-col col-similarity">
            <span :class="['similarity-tag', getSimilarityLevel(segment.similarityValue)]">
              {{ segment.similarityValue }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page-container {
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
  background-color: rgba(166, 124, 82, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.similar {
  background-color: rgba(34, 139, 34, 0.1);
}

.stat-icon-wrapper.rate {
  background-color: rgba(139, 0, 0, 0.1);
}

.stat-icon {
  font-size: 24px;
  color: rgba(166, 124, 82, 1);
}

.stat-icon-wrapper.similar .stat-icon {
  color: rgba(34, 139, 34, 1);
}

.stat-icon-wrapper.rate .stat-icon {
  color: rgba(139, 0, 0, 1);
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

.stat-value.similar {
  color: rgba(34, 139, 34, 1);
}

.stat-value.rate {
  color: rgba(139, 0, 0, 1);
}

/* 对比列表 */
.comparison-list {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.section-count {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

/* 表格 */
.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 100px 1fr 100px 100px;
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
  grid-template-columns: 60px 1fr 100px 1fr 100px 100px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  transition: background-color 0.2s;
  font-size: 13px;
}

.table-row:hover {
  background-color: rgba(248, 244, 233, 0.3);
}

.table-col {
  padding: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-index {
  font-weight: 500;
  color: rgba(166, 124, 82, 1);
}

.col-content {
  text-align: left;
  justify-content: flex-start;
  line-height: 1.6;
  color: rgba(44, 24, 16, 1);
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-position {
  color: rgba(166, 124, 82, 1);
  font-size: 12px;
}

.col-similarity {
  justify-content: center;
}

.similarity-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
}

.similarity-tag.high {
  background-color: rgba(139, 0, 0, 0.1);
  color: rgba(139, 0, 0, 1);
}

.similarity-tag.medium {
  background-color: rgba(166, 124, 82, 0.2);
  color: rgba(166, 124, 82, 1);
}

.similarity-tag.low {
  background-color: rgba(34, 139, 34, 0.1);
  color: rgba(34, 139, 34, 1);
}

/* 高亮文本样式 */
:deep(.highlighted-text) {
  background-color: rgba(255, 215, 0, 0.6);
  color: #8B0000;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
}
</style>
