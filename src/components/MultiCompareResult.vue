<template>
  <div class="multi-compare-result">
    <div class="result-header">
      <h2>多文件对比结果</h2>
      <div class="header-right">
        <div class="result-summary-inline">
          <span class="summary-item">
            <span class="summary-label">文件</span>
            <span class="summary-value">{{ fileCount }}</span>
          </span>
          <span class="summary-divider">|</span>
          <span class="summary-item">
            <span class="summary-label">重复</span>
            <span class="summary-value">{{ totalDuplicates }}</span>
          </span>
          <span class="summary-divider">|</span>
          <span class="summary-item">
            <span class="summary-label">相似度</span>
            <span class="summary-value">{{ averageSimilarity }}%</span>
          </span>
        </div>
        <button class="matrix-toggle-btn" @click="showMatrix = !showMatrix">
          <RiTableLine class="toggle-icon" />
          <span>{{ showMatrix ? '隐藏矩阵' : '相似度矩阵' }}</span>
        </button>
        <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
          <button class="export-btn" @click="handleExport">
            <RiDownloadLine class="export-icon" />
            <span>导出</span>
          </button>
        </BorderBeam>
        <button class="back-btn" @click="$emit('close')">
          <RiArrowLeftLine class="back-icon" />
          <span>返回</span>
        </button>
      </div>
    </div>

    <!-- 相似度矩阵 -->
    <div class="similarity-matrix" v-if="showMatrix">
      <div class="matrix-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner-cell"></th>
              <th v-for="(file, idx) in fileNames" :key="idx" class="matrix-header">
                <div class="header-content">
                  <RiFileLine class="file-icon" />
                  <span>{{ truncateName(file) }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, rowIdx) in fileNames" :key="rowIdx">
              <td class="matrix-header row-header">
                <div class="header-content">
                  <RiFileLine class="file-icon" />
                  <span>{{ truncateName(file) }}</span>
                </div>
              </td>
              <td v-for="(colFile, colIdx) in fileNames" :key="colIdx" 
                  class="matrix-cell"
                  :class="getSimilarityClass(similarityMatrix[rowIdx]?.[colIdx])">
                <span v-if="rowIdx === colIdx" class="diagonal">-</span>
                <span v-else-if="similarityMatrix[rowIdx]?.[colIdx] !== undefined">
                  {{ similarityMatrix[rowIdx][colIdx] }}%
                </span>
                <span v-else class="no-data">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 重复片段详情 -->
    <div class="duplicate-details" v-if="duplicates.length > 0">
      <div class="duplicate-header-bar">
        <div class="duplicate-title-section">
          <RiExchange2Line class="duplicate-title-icon" />
          <h3>重复片段详情</h3>
        </div>
        <div class="duplicate-stats">
          <div class="stat-badge stat-badge-100">
            <span class="stat-badge-icon">💯</span>
            <span>100%相同：{{ count100Similarity }}个</span>
          </div>
          <div class="stat-badge stat-badge-threshold">
            <span class="stat-badge-icon">🎯</span>
            <span>≥75%：{{ countHighSimilarity }}个</span>
          </div>
        </div>
      </div>

      <!-- 对比数据表 -->
      <div class="data-table">
        <div class="table-header">
          <div class="col col-index">序号</div>
          <div class="col col-pair">文件对</div>
          <div class="col col-content">内容A</div>
          <div class="col col-content">内容B</div>
          <div class="col col-similarity">相似度</div>
        </div>
        <div class="table-body">
          <template v-for="group in pageGroups" :key="group.leftFileName + group.rightFileName">
            <!-- 文件对分组头 -->
            <div class="pair-group-header" @click="toggleGroup(group.leftFileName, group.rightFileName)">
              <div class="pair-group-info">
                <span class="group-chevron" :class="{ collapsed: isGroupCollapsed(group.leftFileName, group.rightFileName) }">
                  <RiArrowDownSLine />
                </span>
                <RiExchange2Line class="pair-group-icon" />
                <span class="pair-group-files">
                  <span class="pair-group-file" :title="group.leftFileName">{{ truncateName(group.leftFileName) }}</span>
                  <RiArrowRightLine class="pair-group-arrow" />
                  <span class="pair-group-file" :title="group.rightFileName">{{ truncateName(group.rightFileName) }}</span>
                </span>
                <span class="pair-group-sim" :class="getSimilarityClass(getPairSimilarity(group.leftFileName, group.rightFileName))">
                  整体相似度 {{ getPairSimilarity(group.leftFileName, group.rightFileName) }}%
                </span>
                <span class="pair-group-count">{{ group.items.length }} 处重复</span>
              </div>
            </div>
            <!-- 分组内的行 -->
            <div v-for="dup in group.items" :key="dup.id" class="table-row"
                 v-show="!isGroupCollapsed(group.leftFileName, group.rightFileName)">
              <div class="col col-index">{{ dup.id }}</div>
              <div class="col col-pair">
                <span class="pair-name" :title="dup.leftFileName">{{ truncateName(dup.leftFileName) }}</span>
                <RiArrowRightLine class="pair-arrow" />
                <span class="pair-name" :title="dup.rightFileName">{{ truncateName(dup.rightFileName) }}</span>
              </div>
              <div class="col col-content" v-html="dup.leftContent"
                   @click.stop="openContentModal(dup)"></div>
              <div class="col col-content" v-html="dup.rightContent"
                   @click.stop="openContentModal(dup)"></div>
              <div class="col col-similarity" :class="getSimilarityClass(dup.similarity)">
                {{ dup.similarity }}%
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 内容弹窗 -->
      <div class="content-modal-overlay" v-if="contentModal" @click.self="closeContentModal">
        <div class="content-modal">
          <div class="content-modal-header">
            <div class="content-modal-title">
              <RiExchange2Line class="modal-title-icon" />
              <h3>内容对比详情</h3>
            </div>
            <button class="modal-close-btn" @click="closeContentModal">
              <RiCloseLine />
            </button>
          </div>
          <div class="content-modal-subtitle">
            <RiFileLine class="subtitle-icon" />
            <span class="subtitle-file" :title="contentModal.leftFileName">{{ truncateName(contentModal.leftFileName) }}</span>
            <RiArrowRightLine class="subtitle-arrow" />
            <RiFileLine class="subtitle-icon" />
            <span class="subtitle-file" :title="contentModal.rightFileName">{{ truncateName(contentModal.rightFileName) }}</span>
            <span class="subtitle-sim" :class="getSimilarityClass(contentModal.similarity)">{{ contentModal.similarity }}%</span>
          </div>
          <div class="content-modal-body">
            <div class="content-side">
              <div class="content-side-label">内容 A</div>
              <div class="content-side-text" v-html="contentModal.leftContent"></div>
            </div>
            <div class="content-divider">
              <RiArrowRightLine />
            </div>
            <div class="content-side">
              <div class="content-side-label">内容 B</div>
              <div class="content-side-text" v-html="contentModal.rightContent"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页控件 -->
      <div class="pagination">
        <div class="pagination-info">
          共 {{ totalRecords }} 条记录，显示第 {{ startRecord }} - {{ endRecord }} 条
        </div>
        <div class="page-size-control">
          <span class="page-size-label">每页</span>
          <select class="page-size-select" v-model.number="pageSize">
            <option :value="10">10条</option>
            <option :value="20">20条</option>
            <option :value="50">50条</option>
          </select>
        </div>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">
            <RiArrowLeftSLine />
          </button>
          <template v-for="page in pageNumbers" :key="page">
            <span v-if="page === -1" class="page-ellipsis">...</span>
            <button
              v-else
              class="page-number"
              :class="{ active: page === currentPage }"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </template>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">
            <RiArrowRightSLine />
          </button>
        </div>
      </div>
    </div>

    <div class="no-duplicates" v-else>
      <RiCheckLine class="no-dup-icon" />
      <p>未发现重复片段</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { 
  RiFileLine, RiArrowLeftLine, RiCheckLine, RiTableLine,
  RiDownloadLine, RiExchange2Line, RiArrowLeftSLine, RiArrowRightSLine,
  RiArrowRightLine, RiArrowDownSLine, RiCloseLine
} from '@remixicon/vue'
import { BorderBeam } from 'vue3-border-beam'

interface DuplicatePair {
  id?: number
  leftFileName: string
  rightFileName: string
  leftContent: string
  rightContent: string
  similarity: number
  leftPage?: string
  rightPage?: string
}

interface Props {
  fileNames: string[]
  similarityMatrix: number[][]
  duplicates: DuplicatePair[]
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'close'): void
}>()

const showMatrix = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

// 分组折叠状态
const collapsedPairs = ref(new Set<string>())

const toggleGroup = (leftName: string, rightName: string) => {
  const key = `${leftName}||${rightName}`
  const set = collapsedPairs.value
  if (set.has(key)) {
    set.delete(key)
  } else {
    set.add(key)
  }
  // 触发响应式更新
  collapsedPairs.value = new Set(set)
}

const isGroupCollapsed = (leftName: string, rightName: string): boolean => {
  return collapsedPairs.value.has(`${leftName}||${rightName}`)
}

// 内容弹窗
interface ContentModalData {
  leftContent: string
  rightContent: string
  leftFileName: string
  rightFileName: string
  similarity: number
}

const contentModal = ref<ContentModalData | null>(null)

const openContentModal = (dup: DuplicatePair) => {
  contentModal.value = {
    leftContent: dup.leftContent,
    rightContent: dup.rightContent,
    leftFileName: dup.leftFileName,
    rightFileName: dup.rightFileName,
    similarity: dup.similarity,
  }
}

const closeContentModal = () => {
  contentModal.value = null
}

// 切换每页条数时回到第一页
watch(pageSize, () => {
  currentPage.value = 1
})

const fileCount = computed(() => props.fileNames.length)

const totalDuplicates = computed(() => props.duplicates.length)

const averageSimilarity = computed(() => {
  if (props.duplicates.length === 0) return 0
  const sum = props.duplicates.reduce((acc, dup) => acc + dup.similarity, 0)
  return Math.round(sum / props.duplicates.length)
})

const count100Similarity = computed(() => {
  return props.duplicates.filter(d => d.similarity === 100).length
})

const countHighSimilarity = computed(() => {
  return props.duplicates.filter(d => d.similarity >= 75).length
})

const sortedDuplicates = computed(() => {
  return [...props.duplicates]
    .sort((a, b) => {
      // 先按文件对分组排序
      const pairA = a.leftFileName + a.rightFileName
      const pairB = b.leftFileName + b.rightFileName
      if (pairA !== pairB) return pairA.localeCompare(pairB)
      return b.similarity - a.similarity
    })
    .map((dup, idx) => ({ ...dup, id: idx + 1 }))
})

// 按文件对分组
interface DuplicateGroup {
  leftFileName: string
  rightFileName: string
  items: DuplicatePair[]
}

const pairGroups = computed(() => {
  const groups: DuplicateGroup[] = []
  const all = sortedDuplicates.value
  for (const dup of all) {
    const last = groups[groups.length - 1]
    if (last && last.leftFileName === dup.leftFileName && last.rightFileName === dup.rightFileName) {
      last.items.push(dup)
    } else {
      groups.push({ leftFileName: dup.leftFileName, rightFileName: dup.rightFileName, items: [dup] })
    }
  }
  return groups
})

// 从矩阵获取文件对相似度
const getPairSimilarity = (leftName: string, rightName: string): number => {
  const leftIdx = props.fileNames.indexOf(leftName)
  const rightIdx = props.fileNames.indexOf(rightName)
  if (leftIdx === -1 || rightIdx === -1) return 0
  return props.similarityMatrix[leftIdx]?.[rightIdx] || 0
}

// 分页相关
const totalRecords = computed(() => sortedDuplicates.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
const startRecord = computed(() => totalRecords.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const endRecord = computed(() => totalRecords.value === 0 ? 0 : Math.min(currentPage.value * pageSize.value, totalRecords.value))

const pageDuplicates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedDuplicates.value.slice(start, end)
})

// 当前页按文件对分组
const pageGroups = computed(() => {
  const groups: DuplicateGroup[] = []
  for (const dup of pageDuplicates.value) {
    const last = groups[groups.length - 1]
    if (last && last.leftFileName === dup.leftFileName && last.rightFileName === dup.rightFileName) {
      last.items.push(dup)
    } else {
      groups.push({ leftFileName: dup.leftFileName, rightFileName: dup.rightFileName, items: [dup] })
    }
  }
  return groups
})

const pageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push(-1) // 省略号
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push(-1)
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push(-1)
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push(-1)
      pages.push(total)
    }
  }
  
  return pages
})

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const goToPage = (page: number) => {
  if (page > 0 && page <= totalPages.value) currentPage.value = page
}

const truncateName = (name: string): string => {
  if (name.length <= 12) return name
  return name.substring(0, 10) + '...'
}

const getSimilarityClass = (value: number | undefined): string => {
  if (value === undefined || value === null) return ''
  if (value >= 75) return 'high'
  if (value >= 50) return 'medium'
  if (value >= 25) return 'low'
  return 'minimal'
}

// 导出功能
const handleExport = () => {
  if (sortedDuplicates.value.length === 0) {
    alert('没有可导出的对比数据')
    return
  }

  let md = '# 多文件对比报告\n\n'
  
  // 统计信息
  md += '## 统计信息\n\n'
  md += `- 文件数量：${fileCount.value}\n`
  md += `- 重复片段：${totalDuplicates.value}处\n`
  md += `- 平均相似度：${averageSimilarity.value}%\n\n`

  // 相似度矩阵
  md += '## 相似度矩阵\n\n'
  md += '| 文件 |'
  props.fileNames.forEach(name => { md += ` ${truncateName(name)} |` })
  md += '\n|------|'
  props.fileNames.forEach(() => { md += '------|' })
  md += '\n'
  props.fileNames.forEach((name, rowIdx) => {
    md += `| ${truncateName(name)} |`
    props.fileNames.forEach((_, colIdx) => {
      if (rowIdx === colIdx) {
        md += ' - |'
      } else {
        md += ` ${props.similarityMatrix[rowIdx]?.[colIdx] || '-'}% |`
      }
    })
    md += '\n'
  })
  md += '\n'

  // 重复片段详情（按文件对分组）
  md += '## 重复片段详情\n\n'
  let prevLeft = ''
  let prevRight = ''
  sortedDuplicates.value.forEach(dup => {
    if (dup.leftFileName !== prevLeft || dup.rightFileName !== prevRight) {
      const pairSim = getPairSimilarity(dup.leftFileName, dup.rightFileName)
      md += `\n**${truncateName(dup.leftFileName)} ↔ ${truncateName(dup.rightFileName)}（整体相似度 ${pairSim}%）**\n\n`
      md += '| 序号 | 内容A | 内容B | 相似度 |\n'
      md += '|------|-------|-------|--------|\n'
      prevLeft = dup.leftFileName
      prevRight = dup.rightFileName
    }
    const leftContent = (dup.leftContent || '').replace(/<[^>]*>/g, '').replace(/…/g, '').substring(0, 30) + '...'
    const rightContent = (dup.rightContent || '').replace(/<[^>]*>/g, '').replace(/…/g, '').substring(0, 30) + '...'
    md += `| ${dup.id} | ${leftContent} | ${rightContent} | ${dup.similarity}% |\n`
  })

  md += '\n---\n\n'
  md += `*报告生成时间：${new Date().toLocaleString()}*\n`

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `多文件对比报告-${new Date().getTime()}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.multi-compare-result {
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 4px 16px rgba(44, 24, 16, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-summary-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(248, 244, 233, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-item .summary-label {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
}

.summary-item .summary-value {
  font-size: 14px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
}

.summary-divider {
  color: rgba(166, 124, 82, 0.3);
  font-size: 12px;
}

.matrix-toggle-btn,
.export-btn,
.back-btn {
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
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
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.matrix-toggle-btn:hover,
.export-btn:hover,
.back-btn:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

.toggle-icon,
.export-icon,
.back-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 1);
}

/* 相似度矩阵 */
.similarity-matrix {
  margin-bottom: 24px;
}

.matrix-container {
  overflow-x: auto;
  padding-bottom: 8px;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 400px;
}

.matrix-table th,
.matrix-table td {
  padding: 10px 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  text-align: center;
  font-size: 12px;
}

.corner-cell {
  background: rgba(248, 244, 233, 0.3);
}

.matrix-header {
  background: rgba(248, 244, 233, 0.5);
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.row-header {
  text-align: left;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.8);
  flex-shrink: 0;
}

.matrix-cell {
  transition: all 0.2s;
  font-weight: 500;
}

.matrix-cell:hover {
  background: rgba(248, 244, 233, 0.5);
}

.matrix-cell.high {
  background: rgba(196, 30, 58, 0.15);
  color: rgba(196, 30, 58, 1);
}

.matrix-cell.medium {
  background: rgba(255, 152, 0, 0.15);
  color: rgba(255, 152, 0, 1);
}

.matrix-cell.low {
  background: rgba(76, 175, 80, 0.15);
  color: rgba(76, 175, 80, 1);
}

.matrix-cell.minimal {
  color: rgba(101, 70, 40, 0.5);
}

.diagonal {
  color: rgba(101, 70, 40, 0.4);
  font-style: italic;
}

.no-data {
  color: rgba(101, 70, 40, 0.3);
}

/* 重复片段详情 */
.duplicate-details {
  margin-top: 24px;
}

.duplicate-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.duplicate-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duplicate-title-icon {
  font-size: 20px;
  color: rgba(46, 89, 132, 1);
}

.duplicate-title-section h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.duplicate-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.stat-badge-100 {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.stat-badge-threshold {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.stat-badge-icon {
  font-size: 14px;
}

/* 数据表格 */
.data-table {
  border: 1px solid rgba(166, 124, 82, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  background: rgba(248, 244, 233, 0.5);
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
  font-size: 12px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.table-header .col {
  padding: 12px;
  text-align: center;
}

.col-index {
  width: 50px;
  flex-shrink: 0;
}

.col-pair {
  width: 140px;
  flex-shrink: 0;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.pair-name {
  font-size: 11px;
  color: rgba(44, 24, 16, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 52px;
}

.pair-arrow {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.6);
  flex-shrink: 0;
}

.col-content {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.col-similarity {
  width: 70px;
  flex-shrink: 0;
  text-align: center;
  font-weight: 600;
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
}

.table-row {
  display: flex;
  border-bottom: 1px solid rgba(166, 124, 82, 0.1);
  transition: background 0.2s;
}

.table-row:hover {
  background: rgba(248, 244, 233, 0.3);
}

/* 文件对分组头 */
.pair-group-header {
  background: rgba(245, 238, 226, 0.6);
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  border-top: 1px solid rgba(166, 124, 82, 0.15);
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.pair-group-header:hover {
  background: rgba(245, 238, 226, 0.9);
}

.group-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 16px;
  color: rgba(101, 70, 40, 0.5);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.group-chevron.collapsed {
  transform: rotate(-90deg);
}

.pair-group-header:first-child {
  border-top: none;
}

.pair-group-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
}

.pair-group-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.7);
  flex-shrink: 0;
}

.pair-group-files {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.pair-group-file {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pair-group-arrow {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.5);
  flex-shrink: 0;
}

.pair-group-sim {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  margin-left: 4px;
}

.pair-group-sim.high {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.pair-group-sim.medium {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.pair-group-sim.low {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 1);
}

.pair-group-count {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.6);
  margin-left: auto;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row .col {
  padding: 10px 12px;
  font-size: 12px;
  color: rgba(44, 24, 16, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row .col-content {
  cursor: pointer;
}

.table-row .col-content:hover {
  color: rgba(46, 89, 132, 1);
}

.table-row .col-content :deep(.highlighted-text) {
  background: rgba(255, 235, 59, 0.5);
  padding: 0 2px;
  border-radius: 2px;
}

.table-row .col-similarity.high {
  color: rgba(196, 30, 58, 1);
}

.table-row .col-similarity.medium {
  color: rgba(255, 152, 0, 1);
}

.table-row .col-similarity.low {
  color: rgba(76, 175, 80, 1);
}

/* 分页控件 */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
}

.pagination-info {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.8);
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

.page-btn,
.page-number {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background: white;
  color: rgba(44, 24, 16, 1);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled),
.page-number:hover {
  background: rgba(248, 244, 233, 0.8);
  border-color: rgba(166, 124, 82, 0.5);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number.active {
  background: rgba(139, 0, 0, 1);
  color: white;
  border-color: rgba(139, 0, 0, 1);
}

/* 内容弹窗 */
.content-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40px;
}

.content-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.content-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
}

.content-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title-icon {
  font-size: 18px;
  color: rgba(46, 89, 132, 1);
}

.content-modal-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(101, 70, 40, 0.1);
  border-radius: 6px;
  cursor: pointer;
  color: rgba(44, 24, 16, 0.7);
  font-size: 18px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.content-modal-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(248, 244, 233, 0.3);
  border-bottom: 1px solid rgba(166, 124, 82, 0.1);
  font-size: 12px;
}

.subtitle-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.7);
}

.subtitle-file {
  color: rgba(44, 24, 16, 0.9);
  font-weight: 500;
}

.subtitle-arrow {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.5);
}

.subtitle-sim {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.subtitle-sim.high {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.subtitle-sim.medium {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.subtitle-sim.low {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 1);
}

.content-modal-body {
  display: flex;
  padding: 20px;
  gap: 0;
  overflow-y: auto;
  flex: 1;
}

.content-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-side-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(101, 70, 40, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
}

.content-side-text {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(44, 24, 16, 0.9);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', Courier, monospace;
  background: rgba(248, 244, 233, 0.2);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.1);
}

.content-side-text :deep(.highlighted-text) {
  background: rgba(255, 235, 59, 0.5);
  padding: 0 2px;
  border-radius: 2px;
}

.content-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: rgba(166, 124, 82, 0.3);
  font-size: 20px;
  flex-shrink: 0;
}

/* 每页条数选择 */
.page-size-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-size-label {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
}

.page-size-select {
  padding: 4px 8px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background: white;
  color: rgba(44, 24, 16, 1);
  font-size: 12px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.page-size-select:hover,
.page-size-select:focus {
  border-color: rgba(166, 124, 82, 0.6);
}

/* 无重复提示 */
.no-duplicates {
  text-align: center;
  padding: 40px 20px;
  color: rgba(101, 70, 40, 0.6);
}

.no-dup-icon {
  font-size: 48px;
  color: rgba(76, 175, 80, 0.6);
  margin-bottom: 12px;
}

.no-duplicates p {
  margin: 0;
  font-size: 14px;
}
</style>
