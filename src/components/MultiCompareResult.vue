<template>
  <div class="multi-compare-result">
    <div class="result-header">
      <h2 class="multi-result-title">多文件对比结果</h2>
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
        <button class="ba-btn-secondary ba-btn-sm" @click="showMatrix = !showMatrix">
          <RiTableLine class="ba-btn-icon" />
          <span class="ba-btn-text-mobile-hide">{{ showMatrix ? '隐藏矩阵' : '相似度矩阵' }}</span>
        </button>
        <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
          <button class="ba-btn-primary ba-btn-sm" @click="handleExport">
            <RiDownloadLine class="ba-btn-icon" />
            <span>导出</span>
          </button>
        </BorderBeam>
        <button class="ba-btn-ghost ba-btn-sm" @click="$emit('close')">
          <RiArrowLeftLine class="ba-btn-icon" />
          <span class="ba-btn-text-mobile-hide">返回</span>
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
                  :class="getSimilarityClass(similarityMatrix[rowIdx]?.[colIdx])"
                  :data-row="rowIdx"
                  :data-col="colIdx"
                  @click="handleMatrixCellClick(rowIdx, colIdx)">
                <span v-if="rowIdx === colIdx" class="diagonal">-</span>
                <span v-else-if="similarityMatrix[rowIdx]?.[colIdx] !== undefined">
                  <span class="sim-value">{{ similarityMatrix[rowIdx][colIdx] }}%</span>
                  <span class="dup-count">({{ getDuplicateCount(file, colFile) }}处)</span>
                </span>
                <span v-else class="no-data">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 重复片段详情 -->
    <div class="duplicate-details" v-if="duplicateGroups && duplicateGroups.length > 0">
      <div class="duplicate-header-bar">
        <div class="duplicate-title-section">
          <RiExchange2Line class="duplicate-title-icon" />
          <h3>重复片段详情</h3>
        </div>
        <div class="duplicate-stats">
          <div class="ba-stat-badge ba-stat-danger">
            <span class="ba-stat-badge-icon">💯</span>
            <span>100%相同：{{ count100Similarity }}个</span>
          </div>
          <div class="ba-stat-badge ba-stat-warn">
            <span class="ba-stat-badge-icon">🎯</span>
            <span>≥75%：{{ countHighSimilarity }}个</span>
          </div>
        </div>
      </div>

      <!-- 每个文件对一张独立表格 -->
      <div class="pair-tables" v-for="(group, gIdx) in duplicateGroups" :key="gIdx"
           :ref="el => setTableRef(el, gIdx)">
        <!-- 表格头（可折叠） -->
        <div class="table-group-header" @click="toggleGroup(gIdx)">
          <span class="group-chevron" :class="{ collapsed: isGroupCollapsed(gIdx) }">
            <RiArrowDownSLine />
          </span>
          <RiExchange2Line class="pair-group-icon" />
          <span class="pair-group-files">
            <span class="pair-group-file" :title="group.leftFileName">{{ truncateName(group.leftFileName) }}</span>
            <RiArrowRightLine class="pair-group-arrow" />
            <span class="pair-group-file" :title="group.rightFileName">{{ truncateName(group.rightFileName) }}</span>
          </span>
          <span class="pair-group-sim" :class="getSimilarityClass(getPairSimilarity(group.leftFileName, group.rightFileName))">
            相似度 {{ getPairSimilarity(group.leftFileName, group.rightFileName) }}%
          </span>
          <span class="pair-group-count">{{ group.items.length }} 处重复</span>
        </div>

        <!-- 表格体 -->
        <div class="data-table" v-show="!isGroupCollapsed(gIdx)">
          <div class="table-header">
            <div class="col col-index">序号</div>
            <div class="col col-content col-content-left">
              <RiFileLine class="header-file-icon" />
              <span :title="group.leftFileName">{{ truncateName(group.leftFileName) }}</span>
            </div>
            <div class="col col-content col-content-right">
              <RiFileLine class="header-file-icon" />
              <span :title="group.rightFileName">{{ truncateName(group.rightFileName) }}</span>
            </div>
            <div class="col col-similarity">相似度</div>
          </div>
          <div class="table-body">
            <div v-for="(dup, dIdx) in group.items" :key="dIdx" class="table-row" :data-similarity="`${dup.similarity}%`">
              <div class="col col-index">{{ dIdx + 1 }}</div>
              <div class="col col-content" v-html="dup.leftContent"
                   @click.stop="openContentModal(dup)"></div>
              <div class="col col-content" v-html="dup.rightContent"
                   @click.stop="openContentModal(dup)"></div>
              <div class="col col-similarity" :class="getSimilarityClass(dup.similarity)">
                {{ dup.similarity }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 内容弹窗 -->
      <div class="ba-modal-overlay content-modal-overlay" v-if="contentModal" @click.self="closeContentModal">
        <div class="ba-modal content-modal">
          <div class="ba-modal-header">
            <div class="ba-modal-title">
              <RiExchange2Line class="modal-title-icon" />
              <span>内容对比详情</span>
            </div>
            <button class="ba-close-btn" @click="closeContentModal" aria-label="关闭">
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
              <div class="content-side-label" :title="contentModal.leftFileName">{{ truncateName(contentModal.leftFileName) }}</div>
              <div class="content-side-text" v-html="contentModal.leftContent"></div>
            </div>
            <div class="content-divider">
              <RiArrowRightLine />
            </div>
            <div class="content-side">
              <div class="content-side-label" :title="contentModal.rightFileName">{{ truncateName(contentModal.rightFileName) }}</div>
              <div class="content-side-text" v-html="contentModal.rightContent"></div>
            </div>
          </div>
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
import { computed, ref, nextTick } from 'vue'
import { 
  RiFileLine, RiArrowLeftLine, RiCheckLine, RiTableLine,
  RiDownloadLine, RiExchange2Line,
  RiArrowRightLine, RiArrowDownSLine, RiCloseLine
} from '@remixicon/vue'
import { BorderBeam } from 'vue3-border-beam'
import { htmlToMarkdown } from '../utils/sanitize'
import { useSettings } from '../composables/useSettings'
import { useToast } from '../composables/useToast'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } from 'docx'

const { error: showError } = useToast()

interface DuplicatePair {
  leftFileName: string
  rightFileName: string
  leftContent: string
  rightContent: string
  similarity: number
  leftPage?: string
  rightPage?: string
}

interface DuplicateGroup {
  leftFileName: string
  rightFileName: string
  items: DuplicatePair[]
}

interface Props {
  fileNames: string[]
  similarityMatrix: number[][]
  duplicateGroups: DuplicateGroup[]
}

const props = defineProps<Props>()

const { settings } = useSettings()

defineEmits<{
  (e: 'close'): void
}>()

const showMatrix = ref(false)

// 各表格独立折叠控制（按索引）
const collapsedIndices = ref(new Set<number>())

// 表格 DOM 引用
const tableRefs = ref<(HTMLElement | null)[]>([])

const setTableRef = (el: any, idx: number) => {
  tableRefs.value[idx] = el
}

const toggleGroup = (idx: number) => {
  const set = collapsedIndices.value
  if (set.has(idx)) {
    set.delete(idx)
  } else {
    set.add(idx)
  }
  collapsedIndices.value = new Set(set)
}

const isGroupCollapsed = (idx: number): boolean => {
  return collapsedIndices.value.has(idx)
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

const fileCount = computed(() => props.fileNames.length)

const totalDuplicates = computed(() => {
  return props.duplicateGroups.reduce((acc, g) => acc + g.items.length, 0)
})

const averageSimilarity = computed(() => {
  const all = props.duplicateGroups.flatMap(g => g.items)
  if (all.length === 0) return 0
  const sum = all.reduce((acc, dup) => acc + dup.similarity, 0)
  return Math.round(sum / all.length)
})

const count100Similarity = computed(() => {
  return props.duplicateGroups.flatMap(g => g.items).filter(d => d.similarity === 100).length
})

const countHighSimilarity = computed(() => {
  return props.duplicateGroups.flatMap(g => g.items).filter(d => d.similarity >= 75).length
})

// 从矩阵获取文件对相似度
const getPairSimilarity = (leftName: string, rightName: string): number => {
  const leftIdx = props.fileNames.indexOf(leftName)
  const rightIdx = props.fileNames.indexOf(rightName)
  if (leftIdx === -1 || rightIdx === -1) return 0
  return props.similarityMatrix[leftIdx]?.[rightIdx] || 0
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

const htmlToHighlightedRuns = (html: string): TextRun[] => {
  if (!html) return [new TextRun('')]
  
  const runs: TextRun[] = []
  const regex = /<span class="highlighted-text">([^<]*)<\/span>/g
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const normalText = html.substring(lastIndex, match.index).replace(/<[^>]*>/g, '')
      if (normalText) {
        runs.push(new TextRun({ text: normalText }))
      }
    }
    runs.push(new TextRun({ 
      text: match[1],
      highlight: 'yellow',
      bold: true
    }))
    lastIndex = regex.lastIndex
  }
  
  if (lastIndex < html.length) {
    const remainingText = html.substring(lastIndex).replace(/<[^>]*>/g, '')
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText }))
    }
  }
  
  return runs.length > 0 ? runs : [new TextRun('')]
}

const stripHighlightAndConvert = (html: string): string => {
  if (!html) return ''
  return html
    .replace(/<span class="highlighted-text">([^<]*)<\/span>/g, '**$1**')
    .replace(/<[^>]*>/g, '')
}

const getDuplicateCount = (fileA: string, fileB: string): number => {
  const group = props.duplicateGroups.find(g => 
    (g.leftFileName === fileA && g.rightFileName === fileB) ||
    (g.leftFileName === fileB && g.rightFileName === fileA)
  )
  return group?.items.length || 0
}

const handleMatrixCellClick = (rowIdx: number, colIdx: number) => {
  if (rowIdx === colIdx) return
  const fileA = props.fileNames[rowIdx]
  const fileB = props.fileNames[colIdx]
  const groupIdx = props.duplicateGroups.findIndex(g =>
    (g.leftFileName === fileA && g.rightFileName === fileB) ||
    (g.leftFileName === fileB && g.rightFileName === fileA)
  )
  if (groupIdx === -1) return
  
  if (isGroupCollapsed(groupIdx)) {
    toggleGroup(groupIdx)
  }
  
  nextTick(() => {
    const tableEl = tableRefs.value[groupIdx]
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      tableEl.classList.add('highlight-flash')
      setTimeout(() => tableEl.classList.remove('highlight-flash'), 1500)
    }
  })
}

// 导出功能
const handleExport = () => {
  if (totalDuplicates.value === 0) {
    showError('没有可导出的对比数据')
    return
  }

  if (settings.exportFormat === 'word') {
    generateWordReport()
    return
  }

  const md = generateMarkdownReport()
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `多文件对比报告-${new Date().getTime()}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const generateMarkdownReport = (): string => {
  let md = '# 多文件对比报告\n\n'

  md += '> **统计信息**\n\n'
  md += `- **文件数量**：${fileCount.value}\n`
  md += `- **重复片段**：${totalDuplicates.value} 处\n`
  md += `- **平均相似度**：${averageSimilarity.value}%\n\n`

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

  // 每个文件对独立板块
  md += '## 重复片段详情\n\n'
  props.duplicateGroups.forEach((group, gIdx) => {
    const pairSim = getPairSimilarity(group.leftFileName, group.rightFileName)
    md += `### ${gIdx + 1}. ${truncateName(group.leftFileName)} ↔ ${truncateName(group.rightFileName)}\n\n`
    md += `相似度：**${pairSim}%**\n\n`
    md += '| 序号 | 内容 | 内容 | 相似度 |\n'
    md += '|------|------|------|--------|\n'
    group.items.forEach((dup, dIdx) => {
      const leftContent = stripHighlightAndConvert(dup.leftContent || '').substring(0, 60)
      const rightContent = stripHighlightAndConvert(dup.rightContent || '').substring(0, 60)
      md += `| ${dIdx + 1} | ${leftContent} | ${rightContent} | ${dup.similarity}% |\n`
    })
    md += '\n'
  })

  md += '---\n\n'
  md += `*报告生成时间：${new Date().toLocaleString()}*\n`
  return md
}

const generateWordReport = async () => {
  const children: (Paragraph | Table)[] = []
  children.push(new Paragraph({ children: [new TextRun({ text: '多文件对比报告', bold: true, size: 32 })], alignment: AlignmentType.CENTER }))
  children.push(new Paragraph({ children: [new TextRun({ text: `文件数量：${fileCount.value}  重复片段：${totalDuplicates.value}  平均相似度：${averageSimilarity.value}%`, size: 20 })] }))
  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))

  props.duplicateGroups.forEach((group, gIdx) => {
    const pairSim = getPairSimilarity(group.leftFileName, group.rightFileName)

    children.push(new Paragraph({ children: [new TextRun({ text: `${gIdx + 1}. ${truncateName(group.leftFileName)} ↔ ${truncateName(group.rightFileName)}`, bold: true, size: 24 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: `相似度：${pairSim}%`, size: 20 })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))

    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '序号', bold: true })] })], width: { size: 500, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: truncateName(group.leftFileName), bold: true })] })], width: { size: 3000, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: truncateName(group.rightFileName), bold: true })] })], width: { size: 3000, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '相似度', bold: true })] })], width: { size: 1000, type: WidthType.DXA } }),
        ]
      })
    ]

    group.items.forEach((dup, dIdx) => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun(String(dIdx + 1))] })] }),
          new TableCell({ children: [new Paragraph({ children: htmlToHighlightedRuns(dup.leftContent || '') })] }),
          new TableCell({ children: [new Paragraph({ children: htmlToHighlightedRuns(dup.rightContent || '') })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${dup.similarity}%`, bold: true, color: dup.similarity >= 75 ? 'C41E3A' : dup.similarity >= 50 ? 'FF9800' : '4CAF50' })] })] }),
        ]
      }))
    })

    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }))
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
  })

  children.push(new Paragraph({ children: [new TextRun({ text: `报告生成时间：${new Date().toLocaleString()}`, size: 16, italics: true })] }))

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `多文件对比报告-${new Date().getTime()}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.multi-compare-result {
  padding: 20px;
  background: var(--color-cream);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(var(--rgb-tan-light), 0.2);
  box-shadow: var(--shadow-md);
  font-family: var(--font-ui);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.multi-result-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-summary-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(var(--rgb-parchment), 0.5);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-tan-light), 0.15);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-item .summary-label {
  font-size: 11px;
  color: rgba(var(--rgb-brown), 0.7);
}

.summary-item .summary-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.summary-divider {
  color: var(--color-tan-light);
  font-size: 12px;
}

/* 相似度矩阵 */
.similarity-matrix {
  margin-bottom: 24px;
}

.matrix-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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
  border: 1px solid rgba(var(--rgb-tan-light), 0.2);
  text-align: center;
  font-size: 12px;
}

.corner-cell {
  background: rgba(var(--rgb-parchment), 0.3);
}

.matrix-header {
  background: rgba(var(--rgb-parchment), 0.5);
  font-weight: 600;
  color: var(--color-brown-dark);
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
  color: rgba(var(--rgb-cloud-blue), 0.8);
  flex-shrink: 0;
}

.matrix-cell {
  transition: all 0.2s;
  font-weight: 500;
  cursor: pointer;
  position: relative;
}

.matrix-cell:hover {
  background: rgba(var(--rgb-parchment), 0.5);
  transform: scale(1.02);
}

.matrix-cell .sim-value {
  font-weight: 700;
  font-size: 13px;
}

.matrix-cell .dup-count {
  display: block;
  font-size: 10px;
  color: rgba(var(--rgb-brown), 0.6);
  margin-top: 2px;
}

.matrix-cell.high {
  background: rgba(var(--rgb-cinnabar), 0.15);
  color: var(--color-cinnabar);
}

.matrix-cell.medium {
  background: var(--color-gold-dark);
  color: var(--color-gold-dark);
}

.matrix-cell.low {
  background: var(--color-jade);
  color: var(--color-jade);
}

.matrix-cell.minimal {
  color: var(--color-brown-muted);
}

.diagonal {
  color: var(--color-brown-muted);
  font-style: italic;
}

.no-data {
  color: var(--color-brown-muted);
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
  background: rgba(var(--rgb-parchment), 0.3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-tan-light), 0.15);
  gap: 12px;
  flex-wrap: wrap;
}

.duplicate-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duplicate-title-icon {
  font-size: 20px;
  color: var(--color-cloud-blue);
}

.duplicate-title-section h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.duplicate-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 文件对独立表格容器 */
.pair-tables {
  margin-bottom: 24px;
  border: 1px solid rgba(var(--rgb-tan-light), 0.2);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(var(--rgb-cream), 0.5);
}

.pair-tables:last-child {
  margin-bottom: 0;
}

/* 表格头（可折叠） */
.table-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(var(--rgb-cream-dark), 0.7);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  font-size: 13px;
}

.table-group-header:hover {
  background: rgba(var(--rgb-cream-dark), 1);
}

.table-group-header .group-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 16px;
  color: var(--color-brown-muted);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.table-group-header .group-chevron.collapsed {
  transform: rotate(-90deg);
}

.table-group-header .pair-group-icon {
  font-size: 14px;
  color: rgba(var(--rgb-cloud-blue), 0.7);
  flex-shrink: 0;
}

.table-group-header .pair-group-files {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  min-width: 0;
}

.table-group-header .pair-group-file {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-group-header .pair-group-arrow {
  font-size: 12px;
  color: var(--color-tan-light);
  flex-shrink: 0;
}

.table-group-header .pair-group-sim {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  margin-left: 4px;
}

.table-group-header .pair-group-sim.high {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.table-group-header .pair-group-sim.medium {
  background: var(--color-gold-dark);
  color: var(--color-gold-dark);
}

.table-group-header .pair-group-sim.low {
  background: var(--color-jade);
  color: var(--color-jade);
}

.table-group-header .pair-group-count {
  font-size: 11px;
  color: rgba(var(--rgb-brown), 0.6);
  margin-left: auto;
  flex-shrink: 0;
}

/* 数据表格 - 单一定义 */
.data-table {
  border-top: 1px solid rgba(var(--rgb-tan-light), 0.12);
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
}

.table-row {
  display: flex;
  border-bottom: 1px solid rgba(var(--rgb-tan-light), 0.1);
  transition: background 0.2s;
}

.table-row:hover {
  background: rgba(var(--rgb-parchment), 0.3);
}

.table-row:last-child {
  border-bottom: none;
}

.table-header {
  display: flex;
  background: rgba(var(--rgb-parchment), 0.5);
  border-bottom: 1px solid rgba(var(--rgb-tan-light), 0.2);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.table-header .col {
  padding: 12px;
  text-align: center;
}

.col-index {
  width: 50px;
  flex-shrink: 0;
}

.col-content {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.col-content-left {
  border-right: 1px solid rgba(var(--rgb-tan-light), 0.1);
}

.col-content-right {
  border-left: 1px solid rgba(var(--rgb-tan-light), 0.1);
}

.header-file-icon {
  font-size: 14px;
  color: rgba(var(--rgb-cloud-blue), 0.8);
  flex-shrink: 0;
}

.table-row .col {
  padding: 6px 4px;
  font-size: 12px;
  color: rgba(var(--rgb-brown-dark), 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row .col-content {
  background: rgba(var(--rgb-parchment), 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  margin: 4px 6px;
  white-space: normal;
  max-height: none;
  cursor: pointer;
  transition: background 0.2s;
}

.table-row .col-content:hover {
  background: rgba(var(--rgb-cream-dark), 0.6);
  color: var(--color-cloud-blue);
}

.table-row .col-content :deep(.highlighted-text) {
  background: rgba(var(--rgb-gold), 0.9);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
  color: var(--color-brown-dark);
}

.table-row .col-similarity.high {
  color: var(--color-cinnabar);
}

.table-row .col-similarity.medium {
  color: var(--color-gold-dark);
}

.table-row .col-similarity.low {
  color: var(--color-jade);
}

.col-similarity {
  width: 70px;
  flex-shrink: 0;
  text-align: center;
  font-weight: 600;
}

/* 内容弹窗 */
.content-modal {
  width: 90%;
  max-width: 1000px;
  max-height: 80vh;
}

.content-modal-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(var(--rgb-parchment), 0.3);
  border-bottom: 1px solid rgba(var(--rgb-tan-light), 0.1);
  font-size: 12px;
  flex-wrap: wrap;
}

.subtitle-icon {
  font-size: 14px;
  color: rgba(var(--rgb-cloud-blue), 0.7);
}

.subtitle-file {
  color: rgba(var(--rgb-brown-dark), 0.9);
  font-weight: 500;
}

.subtitle-arrow {
  font-size: 12px;
  color: var(--color-tan-light);
}

.subtitle-sim {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.subtitle-sim.high {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.subtitle-sim.medium {
  background: var(--color-gold-dark);
  color: var(--color-gold-dark);
}

.subtitle-sim.low {
  background: var(--color-jade);
  color: var(--color-jade);
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
  color: rgba(var(--rgb-brown), 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(var(--rgb-tan-light), 0.15);
}

.content-side-text {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--rgb-brown-dark), 0.9);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-ui);
  background: rgba(var(--rgb-parchment), 0.2);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--rgb-tan-light), 0.1);
}

.content-side-text :deep(.highlighted-text) {
  background: rgba(var(--rgb-gold), 0.5);
  padding: 0 2px;
  border-radius: 2px;
}

.content-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: var(--color-tan-light);
  font-size: 20px;
  flex-shrink: 0;
}

/* 无重复提示 */
.no-duplicates {
  text-align: center;
  padding: 40px 20px;
  color: rgba(var(--rgb-brown), 0.6);
}

.no-dup-icon {
  font-size: 48px;
  color: var(--color-jade);
  margin-bottom: 12px;
}

.no-duplicates p {
  margin: 0;
  font-size: 14px;
}

/* 矩阵单元格点击高亮闪烁 */
@keyframes highlight-flash {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 3px rgba(var(--rgb-cinnabar), 0.5), 0 0 20px rgba(var(--rgb-cinnabar), 0.3); }
}

.highlight-flash {
  animation: highlight-flash 0.5s ease-in-out 2;
  border-radius: 10px;
}

/* ================= 移动端响应式 ================= */
@media (max-width: 1024px) {
  .header-right {
    gap: 6px;
  }
}

@media (max-width: 768px) {
  .multi-compare-result {
    padding: 14px;
    border-radius: var(--radius-lg);
  }

  .result-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 16px;
  }

  .multi-result-title {
    font-size: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }

  .result-summary-inline {
    width: 100%;
    justify-content: space-between;
    padding: 6px 10px;
  }

  .summary-item .summary-value {
    font-size: 13px;
  }

  .duplicate-header-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .duplicate-stats {
    width: 100%;
  }

  .table-group-header {
    flex-wrap: wrap;
    padding: 10px;
  }

  .table-group-header .pair-group-files {
    min-width: 0;
  }

  .table-group-header .pair-group-file {
    max-width: 100px;
  }

  .table-group-header .pair-group-count {
    width: 100%;
    margin-left: 26px;
    margin-top: 4px;
  }

  /* 文件对数据表格:移动端表头隐藏,行变卡片 */
  .data-table .table-header {
    display: none;
  }

  .data-table .table-body {
    max-height: none;
  }

  .data-table .table-row {
    flex-direction: column;
    padding: 10px;
    gap: 8px;
    background: rgba(var(--rgb-cream), 0.6);
    border: 1px solid rgba(var(--rgb-tan-light), 0.1);
    border-radius: 8px;
    margin: 6px;
  }

  .data-table .table-row .col {
    width: 100%;
    padding: 0;
    white-space: normal;
  }

  .data-table .table-row .col-index {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    color: var(--color-brown-muted);
    font-size: 12px;
  }

  .data-table .table-row .col-index::after {
    content: '相似度 ' attr(data-similarity);
  }

  .data-table .table-row .col-content {
    margin: 0;
    padding: 8px 10px;
  }

  .data-table .table-row .col-similarity {
    text-align: right;
    font-size: 14px;
  }

  /* 内容弹窗移动端适配 */
  .content-modal {
    width: 100%;
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .content-modal-subtitle {
    padding: 8px 12px;
  }

  .content-modal-body {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }

  .content-divider {
    padding: 8px 0;
    transform: rotate(90deg);
  }
}

@media (max-width: 480px) {
  .multi-compare-result {
    padding: 10px;
  }

  .matrix-table {
    min-width: 320px;
  }

  .matrix-table th,
  .matrix-table td {
    padding: 6px 4px;
    font-size: 10px;
  }

  .matrix-cell .sim-value {
    font-size: 11px;
  }

  .matrix-cell .dup-count {
    font-size: 9px;
  }
}
</style>
