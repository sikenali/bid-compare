<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiExchange2Line
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
  leftStartIndex?: number;
  leftEndIndex?: number;
  rightStartIndex?: number;
  rightEndIndex?: number;
}

const route = useRoute()
const router = useRouter()

// 数据
const segments = ref<SimilarSegment[]>([])
const leftFileName = ref('')
const rightFileName = ref('')
const textSimilarity = ref('0%')
const similarSegmentsCount = ref(0)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)

// 计算属性
const totalPages = computed(() => Math.ceil(segments.value.length / pageSize.value))
const startRecord = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const endRecord = computed(() => Math.min(currentPage.value * pageSize.value, segments.value.length))
const totalRecords = computed(() => segments.value.length)

// 当前页数据
const pageSegments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return segments.value.slice(start, end)
})

// 页码列表
const pageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (current <= 3) {
    pages.push(1, 2, 3, 4, 5)
  } else if (current >= total - 2) {
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    for (let i = current - 2; i <= current + 2; i++) pages.push(i)
  }
  return pages
})

// 初始化数据
const initData = () => {
  const result = sessionStorage.getItem('compareResult')
  if (result) {
    try {
      const data = JSON.parse(result)
      segments.value = data.segments || []
      leftFileName.value = data.leftFileName || '左侧文件'
      rightFileName.value = data.rightFileName || '右侧文件'
      textSimilarity.value = data.textSimilarity || '0%'
      similarSegmentsCount.value = data.similarSegmentsCount || segments.value.length
    } catch (error) {
      console.error('解析对比结果失败:', error)
    }
  }
}

initData()

const handleBack = () => {
  router.push('/file-compare')
}

const handleExport = async () => {
  if (segments.value.length === 0) {
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
            children: [new TextRun({ text: `文本重复率：${textSimilarity.value}`, size: 16 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `雷同片段：${similarSegmentsCount.value}处`, size: 16 })],
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
                  new TableCell({ children: [new Paragraph({ text: leftFileName.value, bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '位置', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: rightFileName.value, bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                  new TableCell({ children: [new Paragraph({ text: '位置', bold: true, alignment: AlignmentType.CENTER })], shading: { fill: '#f0f0f0' } }),
                ]
              }),
              ...segments.value.map(segment => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: segment.id.toString(), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.leftContent.replace(/<[^>]*>/g, '') })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.leftPage, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.rightContent.replace(/<[^>]*>/g, '') })] }),
                  new TableCell({ children: [new Paragraph({ text: segment.rightPage, alignment: AlignmentType.CENTER })] }),
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

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <div class="result-page-container">
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

    <!-- 对比列表区 -->
    <div class="comparison-list">
      <!-- 列表头部 -->
      <div class="list-header">
        <div class="title-section">
          <div class="icon-container">
            <RiExchange2Line class="title-icon" />
          </div>
          <span class="spacer"></span>
          <h2 class="list-title">相似片段详情</h2>
        </div>
        <span class="stats-info">共 {{ totalRecords }} 条记录，显示第 {{ startRecord }} - {{ endRecord }} 条</span>
      </div>

      <!-- 对比数据表 -->
      <div class="data-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col col-index">序号</div>
          <div class="col col-content">{{ leftFileName }}</div>
          <div class="col col-position">源文件位置</div>
          <div class="col col-content">{{ rightFileName }}</div>
          <div class="col col-position">修订版位置</div>
        </div>

        <!-- 表体 -->
        <div class="table-body">
          <div v-for="segment in pageSegments" :key="segment.id" class="table-row">
            <div class="col col-index">{{ segment.id }}</div>
            <div class="col col-content" v-html="segment.leftContent"></div>
            <div class="col col-position">{{ segment.leftPage }}</div>
            <div class="col col-content" v-html="segment.rightContent"></div>
            <div class="col col-position">{{ segment.rightPage }}</div>
          </div>
        </div>
      </div>

      <!-- 分页控件 -->
      <div class="pagination">
        <div class="pagination-info">
          共 {{ totalRecords }} 条记录，显示第 {{ startRecord }} - {{ endRecord }} 条
        </div>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">
            <RiArrowLeftSLine />
          </button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            class="page-number"
            :class="{ active: page === currentPage }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">
            <RiArrowRightSLine />
          </button>
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

/* 对比列表区 */
.comparison-list {
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 自定义滚动条 */
.table-body::-webkit-scrollbar {
  width: 6px;
}

.table-body::-webkit-scrollbar-track {
  background: rgba(245, 238, 226, 0.5);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb {
  background: rgba(166, 124, 82, 0.3);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: rgba(166, 124, 82, 0.5);
}

/* 列表头部 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header .title-section {
  display: flex;
  align-items: center;
}

.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(252, 231, 243, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-icon {
  font-size: 20px;
  color: rgba(219, 39, 119, 1);
}

.spacer {
  width: 12px;
  flex-shrink: 0;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
  white-space: nowrap;
}

.stats-info {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  white-space: nowrap;
}

/* 对比数据表 */
.data-table {
  border: 0.7px solid rgba(230, 215, 191, 1);
  border-radius: 8px;
  overflow: hidden;
}

/* 表头 */
.table-header {
  display: grid;
  grid-template-columns: 81px 377px 122px 377px 122px;
  background-color: rgba(245, 238, 226, 1);
}

.table-header .col {
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-SemiBold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(230, 215, 191, 1);
}

.table-header .col-content {
  justify-content: flex-start;
  border-right: 1px solid rgba(230, 215, 191, 1);
}

.table-header .col-position {
  border-right: 1px solid rgba(230, 215, 191, 1);
}

/* 表体 */
.table-body {
  max-height: 600px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 81px 377px 122px 377px 122px;
  border-bottom: 1px solid rgba(230, 215, 191, 0.5);
  transition: background-color 0.2s;
  min-height: 80px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: rgba(245, 238, 226, 0.5);
}

.table-row .col {
  padding: 16px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Regular;
  line-height: 1.6;
}

.table-row .col-index {
  justify-content: center;
  font-weight: 500;
  color: rgba(166, 124, 82, 1);
}

.table-row .col-content {
  justify-content: flex-start;
  text-align: left;
  overflow: hidden;
  border-right: 1px solid rgba(230, 215, 191, 0.3);
}

.table-row .col-position {
  justify-content: center;
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  border-right: 1px solid rgba(230, 215, 191, 0.3);
}

/* 分页控件 */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.pagination-info {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 共用分页按钮样式 */
.page-btn,
.page-number {
  width: 40px;
  height: 40px;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Medium;
}

.page-btn {
  color: rgba(107, 79, 52, 1);
}

.page-btn:hover:not(:disabled),
.page-number:hover {
  background-color: rgba(245, 238, 226, 1);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-number.active {
  background-color: rgba(139, 0, 0, 1);
  border-color: rgba(139, 0, 0, 1);
  color: rgba(255, 255, 255, 1);
}

/* 高亮文本样式 */
:deep(.highlighted-text) {
  background-color: rgba(255, 215, 0, 0.7) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  display: inline-block !important;
  line-height: 1.4 !important;
  z-index: 1000 !important;
  position: relative !important;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .page-header {
    display: none;
  }

  .result-page-container {
    padding: 16px;
    gap: 12px;
  }

  .comparison-list {
    padding: 16px;
    gap: 16px;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .list-title {
    font-size: 18px;
  }

  .data-table {
    overflow-x: auto;
  }

  .table-header,
  .table-row {
    grid-template-columns: 60px minmax(200px, 1fr) 80px minmax(200px, 1fr) 80px;
    min-width: 700px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
}
</style>
