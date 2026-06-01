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
            <div v-for="(dup, dIdx) in group.items" :key="dIdx" class="table-row">
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
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } from 'docx'

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
    alert('没有可导出的对比数据')
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
  cursor: pointer;
  position: relative;
}

.matrix-cell:hover {
  background: rgba(248, 244, 233, 0.5);
  transform: scale(1.02);
}

.matrix-cell .sim-value {
  font-weight: 700;
  font-size: 13px;
}

.matrix-cell .dup-count {
  display: block;
  font-size: 10px;
  color: rgba(101, 70, 40, 0.6);
  margin-top: 2px;
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

/* 文件对独立表格容器 */
.pair-tables {
  margin-bottom: 24px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.5);
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
  background: rgba(245, 238, 226, 0.7);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  font-size: 13px;
}

.table-group-header:hover {
  background: rgba(245, 238, 226, 1);
}

.table-group-header .group-chevron {
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

.table-group-header .group-chevron.collapsed {
  transform: rotate(-90deg);
}

.table-group-header .pair-group-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.7);
  flex-shrink: 0;
}

.table-group-header .pair-group-files {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.table-group-header .pair-group-file {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-group-header .pair-group-arrow {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.5);
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
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.table-group-header .pair-group-sim.medium {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.table-group-header .pair-group-sim.low {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 1);
}

.table-group-header .pair-group-count {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.6);
  margin-left: auto;
}

/* 数据表格 */
.data-table {
  border-top: 1px solid rgba(166, 124, 82, 0.12);
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

.table-row:last-child {
  border-bottom: none;
}

/* 数据表格 */
.data-table {
  border-top: 1px solid rgba(166, 124, 82, 0.12);
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

.col-content {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.col-content-left {
  border-right: 1px solid rgba(166, 124, 82, 0.1);
}

.col-content-right {
  border-left: 1px solid rgba(166, 124, 82, 0.1);
}

.header-file-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.8);
  flex-shrink: 0;
}

/* 分组列头（基于文件名的动态列标签） */
.pair-group-column-headers {
  display: flex;
  background: rgba(245, 238, 226, 0.4);
  border-bottom: 1px solid rgba(166, 124, 82, 0.12);
  font-size: 11px;
  font-weight: 600;
  color: rgba(44, 24, 16, 0.8);
  position: sticky;
  top: 36px;
  z-index: 1;
}

.pair-group-column-headers .col {
  padding: 6px 12px;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row .col {
  padding: 6px 4px;
  font-size: 12px;
  color: rgba(44, 24, 16, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row .col-content {
  background: rgba(248, 244, 233, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  margin: 4px 6px;
  white-space: normal;
  max-height: none;
  cursor: pointer;
  transition: background 0.2s;
}

.table-row .col-content:hover {
  background: rgba(245, 238, 226, 0.6);
  color: rgba(46, 89, 132, 1);
}

.table-row .col-content :deep(.highlighted-text) {
  background: rgba(255, 215, 0, 0.9);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
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

.col-similarity {
  width: 70px;
  flex-shrink: 0;
  text-align: center;
  font-weight: 600;
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

/* 矩阵单元格点击高亮闪烁 */
@keyframes highlight-flash {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 3px rgba(196, 30, 58, 0.5), 0 0 20px rgba(196, 30, 58, 0.3); }
}

.highlight-flash {
  animation: highlight-flash 0.5s ease-in-out 2;
  border-radius: 10px;
}
</style>
