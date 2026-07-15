<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RiFileExcelLine,
  RiRestartLine,
  RiSaveLine,
  RiSparkling2Fill,
  RiLoaderLine,
  RiFileWordLine,
  RiListCheck,
  RiExchange2Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiImageLine,
  RiEyeLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
import { useSettings } from '../composables/useSettings'
import { useAIModel } from '../composables/useAIModel'
import { getCompareResult, deleteCompareResult } from '../utils/compareResultStore'
import { sanitizeHTML, sanitizeWithHighlight, htmlToMarkdown } from '../utils/sanitize'
import MarkdownIt from 'markdown-it'
import type { SimilarSegment } from '../utils/textAlgorithms'

// 创建 Markdown 解析器实例
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true
})

const route = useRoute()
const router = useRouter()
const { settings } = useSettings()
const { isLoading, analysisResult, analyzeFileComparison } = useAIModel()

// 数据
const segments = ref<SimilarSegment[]>([])
const leftFileName = ref('')
const rightFileName = ref('')
const textSimilarity = ref('0%')
const similarSegmentsCount = ref(0)
const leftFileContent = ref('')
const rightFileContent = ref('')
const leftTotalPages = ref(1)
const rightTotalPages = ref(1)

// 页码显示 - 随预览面板滚动位置实时变化
const leftCurrentPage = ref(1)
const rightCurrentPage = ref(1)
const leftPageDisplay = computed(() => `第 ${leftCurrentPage.value} / ${leftTotalPages.value} 页`)
const rightPageDisplay = computed(() => `第 ${rightCurrentPage.value} / ${rightTotalPages.value} 页`)

const updateCurrentPage = (panel: HTMLElement | null, totalPages: number) => {
  if (!panel) return 1
  const panelHeight = panel.clientHeight
  if (panelHeight <= 0) return 1
  const scrolled = panel.scrollTop
  // 将面板可视高度视为一页,计算当前"虚拟页"
  const current = Math.floor(scrolled / panelHeight) + 1
  return Math.max(1, Math.min(totalPages, current))
}

// 是否有内容预览
const hasPreviewContent = computed(() => {
  return leftFileContent.value.length > 0 || rightFileContent.value.length > 0
})

// 根据设置过滤结果（显示所有）
const filteredSegments = computed(() => {
  const threshold = settings.textSimilarityThreshold || 75
  
  return segments.value
    .filter(s => s.similarityValue >= threshold)
    .sort((a, b) => b.similarityValue - a.similarityValue)
})

// 实际找到的总数量（用于显示）
const totalFoundCount = computed(() => filteredSegments.value.length)

// 图片雷同结果
const imageDuplicates = ref<any[]>([])

// 上下文查看
const showContextModal = ref(false)
const contextSegment = ref<SimilarSegment | null>(null)
const contextSide = ref<'left' | 'right'>('left')
const contextFullText = ref('')

// 预览模态框
const showPreviewModal = ref(false)
const previewTargetId = ref<number | null>(null)
const previewLeftRef = ref<HTMLElement | null>(null)
const previewRightRef = ref<HTMLElement | null>(null)
let previewIsScrolling = false

const openPreviewForSegment = (segment: SimilarSegment, side: 'left' | 'right' = 'left') => {
  previewTargetId.value = segment.id
  previewTargetSide.value = side
  showPreviewModal.value = true
  nextTick(() => {
    scrollToPreviewSegment(segment.id, side)
  })
}

const previewTargetSide = ref<'left' | 'right'>('left')

const scrollToPreviewSegment = (id: number, side: 'left' | 'right' = 'left') => {
  const panel = side === 'left' ? previewLeftRef.value : previewRightRef.value
  if (!panel) return
  // Also clear highlight from the opposite panel
  const otherPanel = side === 'left' ? previewRightRef.value : previewLeftRef.value
  if (otherPanel) {
    otherPanel.querySelector('.preview-segment-target')?.classList.remove('preview-segment-target')
  }
  panel.querySelector('.preview-segment-target')?.classList.remove('preview-segment-target')
  const el = panel.querySelector(`[data-segment-id="${id}"]`) as HTMLElement | null
  if (!el) return
  el.classList.add('preview-segment-target')
  const panelTop = panel.scrollTop
  const elTop = el.offsetTop
  const panelHeight = panel.clientHeight
  panel.scrollTop = elTop - panelHeight / 2 + el.offsetHeight / 2
}

watch(showPreviewModal, (val) => {
  if (!val) {
    previewTargetId.value = null
    previewTargetSide.value = 'left'
    leftCurrentPage.value = 1
    rightCurrentPage.value = 1
  } else {
    // 弹窗打开时根据当前滚动位置初始化页码
    nextTick(() => {
      leftCurrentPage.value = updateCurrentPage(previewLeftRef.value, leftTotalPages.value)
      rightCurrentPage.value = updateCurrentPage(previewRightRef.value, rightTotalPages.value)
    })
  }
})

// AI分析相关
const showAIAnalysis = ref(false)
const aiModelResponse = ref('')

// 同步滚动状态
const syncScroll = ref(true)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)

// DOM refs for scroll synchronization
const leftContentRef = ref<HTMLElement | null>(null)
const rightContentRef = ref<HTMLElement | null>(null)
const leftPanelRef = ref<HTMLElement | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

// Floating page indicator positions
const leftPageIndicatorTop = ref(12)
const rightPageIndicatorTop = ref(12)

// Scroll synchronization flag
let isScrolling = false

// 计算属性
const totalPages = computed(() => Math.ceil(filteredSegments.value.length / pageSize.value))
const startRecord = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const endRecord = computed(() => Math.min(currentPage.value * pageSize.value, filteredSegments.value.length))
const totalRecords = computed(() => filteredSegments.value.length)

// 当前页数据
const pageSegments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredSegments.value.slice(start, end)
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
  // 先清空旧数据
  segments.value = []
  leftFileName.value = ''
  rightFileName.value = ''
  textSimilarity.value = '0%'
  similarSegmentsCount.value = 0
  leftTotalPages.value = 1
  rightTotalPages.value = 1

  let resultData: any = null

  // 1. 优先尝试从路由参数中的 resultId 读取模块级存储
  const resultId = route.query.resultId as string
  if (resultId) {
    resultData = getCompareResult(resultId)
    // 读取后删除，避免内存积累
    if (resultData) {
      deleteCompareResult(resultId)
    }
  }

  // 2. 如果模块级存储没有，尝试从 sessionStorage 读取（兼容旧数据）
  if (!resultData) {
    const sessionResult = sessionStorage.getItem('compareResult')
    if (sessionResult) {
      try {
        resultData = JSON.parse(sessionResult)
        sessionStorage.removeItem('compareResult')
      } catch (e) {
        // ignore
      }
    }
  }

  if (resultData) {
    segments.value = resultData.segments || []
    leftFileName.value = resultData.leftFileName && resultData.leftFileName !== '' ? resultData.leftFileName : '左侧文件'
    rightFileName.value = resultData.rightFileName && resultData.rightFileName !== '' ? resultData.rightFileName : '右侧文件'
    textSimilarity.value = resultData.textSimilarity || '0%'
    similarSegmentsCount.value = resultData.similarSegmentsCount || segments.value.length

    leftTotalPages.value = resultData.leftTotalPages || 1
    rightTotalPages.value = resultData.rightTotalPages || 1

    leftFileContent.value = resultData.leftFileContent || ''
    rightFileContent.value = resultData.rightFileContent || ''

    imageDuplicates.value = resultData.imageDuplicates || []
  }
}

// 解析文件内容为行数据 (已移除，不再使用全文本解析)
// const parseFileLines = (leftContent: string, rightContent: string, segments: SimilarSegment[]) => {
//   // ... (code removed)
// }

// 在组件挂载时初始化数据
onMounted(() => {
  initData()
})

onActivated(() => {
  initData()
})

watch(() => route.query.t, () => {
  initData()
})

// AI分析处理函数
const handleAIAnalysis = async () => {
  if (segments.value.length === 0) {
    alert('没有可分析的对比数据')
    return
  }

  if (!settings.apiKey) {
    alert('请先在系统设置中配置 API 密钥')
    return
  }

  try {
    const result = await analyzeFileComparison(
      settings,
      leftFileContent.value,
      rightFileContent.value,
      textSimilarity.value,
      segments.value
    )

    // 格式化AI响应
    if (result.error) {
      aiModelResponse.value = `AI分析失败: ${result.error}`
    } else {
      let response = `## AI分析总结\n\n${result.summary}\n`

      if (result.insights.length > 0) {
        response += `\n## 关键发现\n${result.insights.map(insight => `- ${insight}`).join('\n')}\n`
      }

      if (result.suggestions.length > 0) {
        response += `\n## 改进建议\n${result.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}\n`
      }

      aiModelResponse.value = response
    }

    showAIAnalysis.value = true
  } catch (error) {
    aiModelResponse.value = `AI分析失败: ${(error as Error).message}`
    showAIAnalysis.value = true
  }
}

const getContextAround = (segment: SimilarSegment, side: 'left' | 'right', contextChars: number = 200): string => {
  const fullText = side === 'left' ? leftFileContent.value : rightFileContent.value
  if (!fullText) return '（无原文内容）'

  const startIdx = side === 'left' ? (segment.leftStartIndex ?? -1) : (segment.rightStartIndex ?? -1)
  const endIdx = side === 'left' ? (segment.leftEndIndex ?? -1) : (segment.rightEndIndex ?? -1)

  if (startIdx < 0 || endIdx < 0) return '（无位置信息）'

  const ctxStart = Math.max(0, startIdx - contextChars)
  const ctxEnd = Math.min(fullText.length, endIdx + contextChars)

  let before = fullText.substring(ctxStart, startIdx)
  let match = fullText.substring(startIdx, endIdx)
  let after = fullText.substring(endIdx, ctxEnd)

  if (ctxStart > 0) before = '...' + before.slice(-contextChars)
  if (ctxEnd < fullText.length) after = after.slice(0, contextChars) + '...'

  return before + '【' + match + '】' + after
}

const viewContext = (segment: SimilarSegment, side: 'left' | 'right') => {
  contextSegment.value = segment
  contextSide.value = side
  contextFullText.value = getContextAround(segment, side)
  showContextModal.value = true
}

const handleBack = () => {
  router.push('/file-compare')
}

const handleExport = async () => {
  if (segments.value.length === 0) {
    alert('没有可导出的对比数据')
    return
  }

  try {
    const leftName = (leftFileName.value || 'file1').replace(/\.[^/.]+$/, '')
    const rightName = (rightFileName.value || 'file2').replace(/\.[^/.]+$/, '')
    
    if (settings.exportFormat === 'markdown') {
      // 导出 Markdown 格式
      const mdContent = generateMarkdownReport()
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
      const fileName = `${leftName}vs${rightName}-文件对比报告.md`
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // 导出 Word 格式
      const doc = generateWordReport()
      const blob = await Packer.toBlob(doc)
      const fileName = `${leftName}vs${rightName}-文件对比报告.docx`
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  } catch (error) {
    alert('导出报告失败，请重试')
  }
}

// 解析高亮 HTML，返回带高亮标记的 TextRun 数组
function parseHighlightedContent(htmlContent: string): any[] {
  // 移除首尾的省略号
  let content = htmlContent.replace(/^…/, '').replace(/…$/, '')

  const runs: any[] = []

  // 使用正则表达式拆分高亮和普通文本
  const highlightRegex = /<span class="highlighted-text">([\s\S]*?)<\/span>/g
  let lastIndex = 0
  let match

  while ((match = highlightRegex.exec(content)) !== null) {
    // 添加高亮前的普通文本
    if (match.index > lastIndex) {
      const plainText = content.substring(lastIndex, match.index)
      // 解码 HTML 实体
      const decodedText = plainText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/<[^>]*>/g, '')
      runs.push(new TextRun({
        text: decodedText,
        size: 20,
        font: 'Microsoft YaHei'
      }))
    }

    // 添加高亮文本（带背景色）
    const highlightedHtml = match[1]
    // 解码 HTML 实体
    const decodedHighlight = highlightedHtml
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
    runs.push(new TextRun({
      text: decodedHighlight,
      size: 20,
      font: 'Microsoft YaHei',
      bold: true,
      color: '8B0000',
      highlight: 'FFD700'  // 金色高亮背景
    }))

    lastIndex = match.index + match[0].length
  }

  // 添加剩余的普通文本
  if (lastIndex < content.length) {
    const plainText = content.substring(lastIndex)
    const decodedText = plainText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<[^>]*>/g, '')
    runs.push(new TextRun({
      text: decodedText,
      size: 20,
      font: 'Microsoft YaHei'
    }))
  }

  return runs.length > 0 ? runs : [new TextRun({
    text: content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<[^>]*>/g, ''),
    size: 20,
    font: 'Microsoft YaHei'
  })]
}

// 生成 Markdown 报告
function generateMarkdownReport(): string {
  const segmentsData = filteredSegments.value
  let md = ''

  // 报告标题
  md += '# 文件对比报告\n\n'

  // 元数据
  md += `> **生成时间**：${new Date().toLocaleString()}  \n`
  md += `> **左侧文件**：${leftFileName.value || '-'}  \n`
  md += `> **右侧文件**：${rightFileName.value || '-'}  \n\n`

  md += '---\n\n'

  // 统计信息
  md += '## 一、相似度统计\n\n'
  md += '| 指标 | 数值 |\n'
  md += '|------|------|\n'
  md += `| 文本重复率 | ${textSimilarity.value} |\n`
  md += `| 雷同片段 | ${similarSegmentsCount.value}处 |\n\n`

  md += '---\n\n'

  // 雷同片段详情 - 表格总览
  md += '## 二、雷同片段总览\n\n'
  md += '| 序号 | 左侧内容（摘要） | 位置 | 右侧内容（摘要） | 位置 |\n'
  md += '|------|------------------|------|------------------|------|\n'

  for (const segment of segmentsData) {
    const leftBrief = htmlToMarkdown(segment.leftContent || '').replace(/…/g, '').substring(0, 60).replace(/\s+/g, ' ').trim()
    const rightBrief = htmlToMarkdown(segment.rightContent || '').replace(/…/g, '').substring(0, 60).replace(/\s+/g, ' ').trim()

    md += `| ${segment.id} | ${leftBrief || '-'} | ${segment.leftPage || '-'} | ${rightBrief || '-'} | ${segment.rightPage || '-'} |\n`
  }

  md += '\n---\n\n'

  // 详细对比
  md += '## 三、雷同片段详情\n\n'

  for (const segment of segmentsData) {
    const leftClean = htmlToMarkdown(segment.leftContent || '')
    const rightClean = htmlToMarkdown(segment.rightContent || '')

    md += `### 第 ${segment.id} 段\n\n`
    md += `| 项目 | 内容 |\n`
    md += `|------|------|\n`
    md += `| 左侧位置 | ${segment.leftPage || '-'} |\n`
    md += `| 右侧位置 | ${segment.rightPage || '-'} |\n\n`
    md += `**左侧文件：**\n\n`
    md += leftClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
    md += `**右侧文件：**\n\n`
    md += rightClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
    md += '---\n\n'
  }

  md += `*报告由 Bid Assistant 生成于 ${new Date().toLocaleString()}*\n`

  return md
}

// 生成Word报告
function generateWordReport(): Document {
  const includeHighlight = settings.includeHighlight
  const includeCharts = settings.includeCharts

  const children: any[] = [
    // 报告标题
    new Paragraph({
      children: [new TextRun({ text: '文件对比报告', bold: true, size: 32, font: 'Microsoft YaHei' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  ]

  // 统计信息
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '一、相似度统计', bold: true, size: 24, font: 'Microsoft YaHei' })],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `文本重复率：${textSimilarity.value}`, size: 20, font: 'Microsoft YaHei' })],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `雷同片段：${similarSegmentsCount.value}处`, size: 20, font: 'Microsoft YaHei' })],
      spacing: { after: 200 }
    })
  )

  // 统计图表（如果开启）
  if (includeCharts) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '二、文件信息', bold: true, size: 24, font: 'Microsoft YaHei' })],
        spacing: { after: 200 }
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D8BF9C' }
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: '项目', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'F5EEE2' },
                width: { size: 30, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: leftFileName.value, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'F5EEE2' },
                width: { size: 35, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: rightFileName.value, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                shading: { fill: 'F5EEE2' },
                width: { size: 35, type: WidthType.PERCENTAGE }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: '文本重复率', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 30, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: textSimilarity.value, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: textSimilarity.value, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE }
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: '雷同片段数', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 30, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: similarSegmentsCount.value.toString(), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: similarSegmentsCount.value.toString(), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE }
              })
            ]
          })
        ]
      })
    )
  }

  // 雷同片段详情
  children.push(
    new Paragraph({
      children: [new TextRun({ text: includeCharts ? '三、雷同片段详情' : '二、雷同片段详情', bold: true, size: 24, font: 'Microsoft YaHei' })],
      spacing: { after: 200, before: 200 }
    })
  )

  // 构建详情表格
  const detailRows: any[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '序号', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'F5EEE2' },
          width: { size: 8, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: leftFileName.value, bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'F5EEE2' },
          width: { size: 34, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '位置', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'F5EEE2' },
          width: { size: 12, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: rightFileName.value, bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'F5EEE2' },
          width: { size: 34, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '位置', bold: true, size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
          shading: { fill: 'F5EEE2' },
          width: { size: 12, type: WidthType.PERCENTAGE }
        })
      ]
    })
  ]

  // 添加数据行
  filteredSegments.value.forEach(segment => {
    const leftRuns = includeHighlight ? parseHighlightedContent(segment.leftContent) : [new TextRun({ text: segment.leftContent.replace(/<[^>]*>/g, ''), size: 20, font: 'Microsoft YaHei' })]
    const rightRuns = includeHighlight ? parseHighlightedContent(segment.rightContent) : [new TextRun({ text: segment.rightContent.replace(/<[^>]*>/g, ''), size: 20, font: 'Microsoft YaHei' })]

    detailRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.id.toString(), size: 20, font: 'Microsoft YaHei' })], alignment: AlignmentType.CENTER })],
            width: { size: 8, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: leftRuns })],
            width: { size: 34, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.leftPage, size: 18, font: 'Microsoft YaHei', color: 'A67C52' })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: rightRuns })],
            width: { size: 34, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.rightPage, size: 18, font: 'Microsoft YaHei', color: 'A67C52' })], alignment: AlignmentType.CENTER })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
  })

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E6D7BF' }
      },
      rows: detailRows
    })
  )

  return new Document({
    sections: [{
      properties: {},
      children
    }]
  })
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    // 滚动到对应页码的内容位置
    scrollToPage(page)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToPage(currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToPage(currentPage.value)
  }
}

// 滚动到指定页码对应的内容位置
const scrollToPage = (page: number) => {
  // 片段模式下滚动定位
}

// 是否有上一处差异
const hasPrevDiff = computed(() => {
  return filteredSegments.value.length > 0
})

// 是否有下一处差异
const hasNextDiff = computed(() => {
  return filteredSegments.value.length > 0
})

// 计算100%相似度的片段数量
const count100Similarity = computed(() => {
  return filteredSegments.value.filter(s => s.similarityValue >= 100).length
})

// 计算达到相似度阈值的片段数量
const countThresholdSimilarity = computed(() => {
  const threshold = settings.textSimilarityThreshold || 75
  return filteredSegments.value.filter(s => s.similarityValue >= threshold).length
})

// 上一处差异
const goToPrevDiff = () => {
  // TODO: 实现跳转到上一处差异的逻辑
}

// 下一处差异
const goToNextDiff = () => {
  // TODO: 实现跳转到下一处差异的逻辑
}

// 滚动同步处理
let isSyncing = false

const handleLeftScroll = () => {
  if (!syncScroll.value || isSyncing || !leftContentRef.value || !rightContentRef.value) return
  isSyncing = true
  rightContentRef.value.scrollTop = leftContentRef.value.scrollTop
  requestAnimationFrame(() => { isSyncing = false })
}

const handleRightScroll = () => {
  if (!syncScroll.value || isSyncing || !leftContentRef.value || !rightContentRef.value) return
  isSyncing = true
  leftContentRef.value.scrollTop = rightContentRef.value.scrollTop
  requestAnimationFrame(() => { isSyncing = false })
}
const formatMarkdown = (text: string) => {
  if (!text) return ''
  
  // 使用 markdown-it 解析，然后用 DOMPurify 消毒
  const rendered = md.render(text)
  return sanitizeHTML(rendered)
}

// 连接线位置
const connections = computed(() => {
  const lines: { top: number }[] = []
  const count = Math.min(pageSegments.value.length, 10)
  for (let i = 0; i < count; i++) {
    lines.push({ top: 60 + i * 80 })
  }
  return lines
})

// Visible connections based on scroll
const visibleConnections = computed(() => {
  return connections.value
})

// 解析段落（按换行符分割）
const parseParagraphs = (text: string): Array<{ text: string; startIndex: number; endIndex: number }> => {
  const paragraphs: Array<{ text: string; startIndex: number; endIndex: number }> = []
  let currentPos = 0
  
  const lines = text.split(/[\n\r]+/)
  
  for (const line of lines) {
    const lineLength = line.length
    paragraphs.push({
      text: line,
      startIndex: currentPos,
      endIndex: currentPos + lineLength
    })
    currentPos += lineLength + 1
  }
  
  return paragraphs
}

// 检查段落是否包含重复片段
const getHighlightedParagraphHtml = (
  paragraph: { text: string; startIndex: number; endIndex: number },
  segments: SimilarSegment[],
  type: 'left' | 'right'
): string => {
  const overlappingSegments = segments.filter(seg => {
    const segStart = type === 'left' ? seg.leftStartIndex : seg.rightStartIndex
    const segEnd = type === 'left' ? seg.leftEndIndex : seg.rightEndIndex
    return segStart < paragraph.endIndex && segEnd > paragraph.startIndex
  })
  
  if (overlappingSegments.length === 0) {
    return escapeHtml(paragraph.text)
  }
  
  overlappingSegments.sort((a, b) => {
    const aStart = type === 'left' ? a.leftStartIndex : a.rightStartIndex
    const bStart = type === 'left' ? b.leftStartIndex : b.rightStartIndex
    return aStart - bStart
  })
  
  let html = ''
  let currentPos = paragraph.startIndex

  for (const seg of overlappingSegments) {
    const segStart = type === 'left' ? seg.leftStartIndex : seg.rightStartIndex
    const segEnd = type === 'left' ? seg.leftEndIndex : seg.rightEndIndex

    let localStart = Math.max(segStart, paragraph.startIndex) - paragraph.startIndex
    const localEnd = Math.min(segEnd, paragraph.endIndex) - paragraph.startIndex

    const currentOffset = currentPos - paragraph.startIndex
    if (localStart < currentOffset) {
      localStart = currentOffset
    }

    if (localStart < localEnd) {
      if (localStart > currentOffset) {
        html += escapeHtml(paragraph.text.substring(currentOffset, localStart))
      }

      const highlightedText = paragraph.text.substring(localStart, localEnd)
      html += `<span class="text-highlight" data-segment-id="${seg.id}" data-similarity="${seg.similarityValue}">${escapeHtml(highlightedText)}</span>`
    }

    if (segEnd > currentPos) {
      currentPos = segEnd
    }
  }
  
  if (currentPos - paragraph.startIndex < paragraph.text.length) {
    html += escapeHtml(paragraph.text.substring(currentPos - paragraph.startIndex))
  }
  
  return html
}

// 构建段落式全文内容
const buildFullTextHtml = (
  fullText: string,
  segments: SimilarSegment[],
  type: 'left' | 'right'
): string => {
  if (!fullText) return ''
  
  const paragraphs = parseParagraphs(fullText)
  
  let html = '<div class="full-text-content">'
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const hasHighlight = segments.some(seg => {
      const segStart = type === 'left' ? seg.leftStartIndex : seg.rightStartIndex
      const segEnd = type === 'left' ? seg.leftEndIndex : seg.rightEndIndex
      return segStart < para.endIndex && segEnd > para.startIndex
    })
    
    const paraHtml = getHighlightedParagraphHtml(para, segments, type)
    
    html += `<div class="doc-paragraph ${hasHighlight ? 'has-highlight' : ''}" data-p-index="${i}">${paraHtml}</div>`
  }
  
  html += '</div>'
  return html
}

const countAdded = computed(() => filteredSegments.value.filter(s => s.similarityValue >= 100).length)
const countModified = computed(() => filteredSegments.value.filter(s => s.similarityValue >= 80 && s.similarityValue < 100).length)
const countDeleted = computed(() => filteredSegments.value.filter(s => s.similarityValue < 80).length)

const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const previewLeftHtml = computed(() => {
  return buildFullTextHtml(leftFileContent.value, filteredSegments.value, 'left')
})

const previewRightHtml = computed(() => {
  return buildFullTextHtml(rightFileContent.value, filteredSegments.value, 'right')
})

const handlePreviewLeftScroll = () => {
  if (previewIsScrolling) return
  if (!previewLeftRef.value || !previewRightRef.value) return
  previewIsScrolling = true
  previewRightRef.value.scrollTop = previewLeftRef.value.scrollTop
  leftCurrentPage.value = updateCurrentPage(previewLeftRef.value, leftTotalPages.value)
  rightCurrentPage.value = updateCurrentPage(previewRightRef.value, rightTotalPages.value)
  requestAnimationFrame(() => { previewIsScrolling = false })
}

const handlePreviewRightScroll = () => {
  if (previewIsScrolling) return
  if (!previewLeftRef.value || !previewRightRef.value) return
  previewIsScrolling = true
  previewLeftRef.value.scrollTop = previewRightRef.value.scrollTop
  leftCurrentPage.value = updateCurrentPage(previewLeftRef.value, leftTotalPages.value)
  rightCurrentPage.value = updateCurrentPage(previewRightRef.value, rightTotalPages.value)
  requestAnimationFrame(() => { previewIsScrolling = false })
}
</script>

<template>
  <div class="result-page">
    <div class="file-info-bar">
      <div class="file-info-side">
        <div class="file-icon file-a-icon">
          <RiFileWordLine />
        </div>
        <div class="file-details">
          <div class="file-name">{{ leftFileName }}</div>
          <div class="file-meta">文档 A</div>
        </div>
      </div>
      <div class="compare-icon-wrapper">
        <RiExchange2Line />
      </div>
      <div class="file-info-side right">
        <div class="file-details">
          <div class="file-name">{{ rightFileName }}</div>
          <div class="file-meta">文档 B</div>
        </div>
        <div class="file-icon file-b-icon">
          <RiFileWordLine />
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <div class="mode-switch">
          <button class="mode-btn active">并排对比</button>
          <button class="mode-btn" @click="showPreviewModal = true">叠加对比</button>
        </div>
        <div class="diff-filter">
          <button class="filter-btn active">全部</button>
          <button class="filter-btn"><span class="filter-dot dot-add"></span>新增</button>
          <button class="filter-btn"><span class="filter-dot dot-mod"></span>修改</button>
          <button class="filter-btn"><span class="filter-dot dot-del"></span>删除</button>
        </div>
      </div>
      <div class="toolbar-right">
        <div class="diff-nav">
          <button class="nav-btn" @click="goToPrevDiff">
            <RiArrowLeftSLine />
          </button>
          <span class="nav-count">第 {{ currentPage }} / {{ totalPages }} 处差异</span>
          <button class="nav-btn" @click="goToNextDiff">
            <RiArrowRightSLine />
          </button>
        </div>
        <button class="back-btn" @click="handleBack">
          <RiRestartLine />
          <span>返回</span>
        </button>
        <button class="export-btn" @click="handleExport">导出</button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stats-left">
        <RiExchange2Line class="stats-icon" />
        <span class="stats-desc">共发现 {{ totalFoundCount }} 处差异：</span>
        <span class="stat-item"><span class="filter-dot dot-add"></span>新增({{ countAdded }}处)</span>
        <span class="stat-item"><span class="filter-dot dot-mod"></span>修改({{ countModified }}处)</span>
        <span class="stat-item"><span class="filter-dot dot-del"></span>删除({{ countDeleted }}处)</span>
      </div>
      <div class="stats-right">
        <span class="similarity-label">文档相似度：</span>
        <span class="similarity-value">{{ textSimilarity }}</span>
      </div>
    </div>

    <div class="data-table">
      <div class="table-header">
        <div class="col col-index">序号</div>
        <div class="col col-content" :title="leftFileName || '文件A'">
          <span class="version-badge version-badge-left">v1</span>
          <span class="version-label">原始版本</span>
        </div>
        <div class="col col-position">位置</div>
        <div class="col col-position">位置</div>
        <div class="col col-content" :title="rightFileName || '文件B'">
          <span class="version-badge version-badge-right">v2</span>
          <span class="version-label">修订版本</span>
        </div>
      </div>
      <div class="table-body" v-highlight-tooltip>
        <div v-for="segment in pageSegments" :key="segment.id" class="table-row">
          <div class="col col-index">{{ segment.id }}</div>
          <div class="col col-content clickable" @click="openPreviewForSegment(segment, 'left')" :title="'点击预览上下文'" v-html="sanitizeWithHighlight(segment.leftContent)"></div>
          <div class="col col-position">{{ segment.leftPage }}</div>
          <div class="col col-position">{{ segment.rightPage }}</div>
          <div class="col col-content clickable" @click="openPreviewForSegment(segment, 'right')" :title="'点击预览上下文'" v-html="sanitizeWithHighlight(segment.rightContent)"></div>
        </div>
      </div>
    </div>

    <div v-if="imageDuplicates.length" class="image-duplicate-section">
      <div class="section-header">
        <div class="section-header-left">
          <RiImageLine class="section-header-icon" />
          <h2>图片雷同检测</h2>
        </div>
        <span class="image-count-badge">发现 {{ imageDuplicates.length }} 组雷同图片</span>
      </div>
      <div class="image-duplicate-grid">
        <div v-for="(dup, idx) in imageDuplicates" :key="dup.id" class="image-duplicate-card">
          <div class="image-duplicate-pair">
            <div class="image-duplicate-side">
              <span class="image-side-label">左侧</span>
              <img :src="dup.leftImage" class="image-duplicate-img" />
              <span class="image-name">{{ dup.leftPage }}</span>
            </div>
            <div class="image-duplicate-vs">
              <span class="vs-badge">{{ dup.similarity }}%</span>
            </div>
            <div class="image-duplicate-side">
              <span class="image-side-label">右侧</span>
              <img :src="dup.rightImage" class="image-duplicate-img" />
              <span class="image-name">{{ dup.rightPage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="bottom-pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">
          <RiArrowLeftSLine />
        </button>
        <button v-for="p in pageNumbers" :key="p" class="page-num" :class="{ active: p === currentPage }" @click="goToPage(p)">{{ p }}</button>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">
          <RiArrowRightSLine />
        </button>
      </div>
      <div class="sync-toggle">
        <label class="toggle">
          <input type="checkbox" v-model="syncScroll" />
          <span class="toggle-slider"></span>
        </label>
        <span class="sync-label">同步滚动</span>
      </div>
    </div>

    <div v-if="showAIAnalysis" class="modal-overlay" @click="showAIAnalysis = false">
      <div class="ai-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-header-left">
            <RiSparkling2Fill class="modal-header-icon" />
            <h3>AI智能分析</h3>
          </div>
          <button class="modal-close" @click="showAIAnalysis = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="isLoading" class="modal-loading">
            <RiLoaderLine class="loading-spinner" />
            <p>AI正在分析中，请稍候...</p>
          </div>
          <div v-else class="ai-result" v-html="formatMarkdown(aiModelResponse)"></div>
        </div>
      </div>
    </div>

    <div v-if="showPreviewModal" class="modal-overlay" @click="showPreviewModal = false">
      <div class="preview-modal" @click.stop>
        <div class="modal-header">
          <h3>全文预览 — {{ segments.length }} 处重复片段</h3>
          <button class="modal-close" @click="showPreviewModal = false">×</button>
        </div>
        <div class="preview-panel-headers">
          <div class="preview-panel-header">
            <span class="preview-file-name">{{ leftFileName || '文件A' }}</span>
            <span class="preview-page-info">{{ leftPageDisplay }}</span>
          </div>
          <div class="preview-panel-header right">
            <span class="preview-file-name">{{ rightFileName || '文件B' }}</span>
            <span class="preview-page-info">{{ rightPageDisplay }}</span>
          </div>
        </div>
        <div class="preview-modal-body">
          <div class="preview-panel" ref="previewLeftRef" @scroll="handlePreviewLeftScroll">
            <div class="preview-panel-inner" v-if="leftFileContent">
              <div v-html="sanitizeWithHighlight(previewLeftHtml)"></div>
            </div>
            <div class="preview-empty" v-else>
              <span class="preview-empty-text">左侧文件无内容预览</span>
            </div>
          </div>
          <div class="preview-divider"></div>
          <div class="preview-panel" ref="previewRightRef" @scroll="handlePreviewRightScroll">
            <div class="preview-panel-inner" v-if="rightFileContent">
              <div v-html="sanitizeWithHighlight(previewRightHtml)"></div>
            </div>
            <div class="preview-empty" v-else>
              <span class="preview-empty-text">右侧文件无内容预览</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showContextModal" class="modal-overlay" @click="showContextModal = false">
      <div class="context-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ contextSide === 'left' ? leftFileName : rightFileName }} - 上下文</h3>
          <button class="modal-close" @click="showContextModal = false">×</button>
        </div>
        <div class="context-modal-body">
          <div class="context-segment-info">
            <span class="context-segment-id">片段 #{{ contextSegment?.id }}</span>
            <span class="context-segment-pos">{{ contextSide === 'left' ? contextSegment?.leftPage : contextSegment?.rightPage }}</span>
          </div>
          <pre class="context-pre">{{ contextFullText }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--font-ui);
  color: var(--color-brown-dark);
}

.file-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-icon-bg);
  border-radius: 12px;
  padding: 12px 20px;
}

.file-info-side {
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
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
  line-height: 1.3;
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-switch {
  display: inline-flex;
  background: var(--color-icon-bg);
  padding: 4px;
  border-radius: 10px;
  gap: 0;
}

.mode-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-brown-muted);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn.active {
  background: var(--color-accent-red);
  color: var(--color-white);
  font-weight: 600;
}

.diff-filter {
  display: inline-flex;
  background: var(--color-icon-bg);
  padding: 4px;
  border-radius: 10px;
  gap: 0;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-brown-muted);
  font-size: 12px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn.active {
  background: var(--color-white);
  color: var(--color-brown-dark);
  font-weight: 500;
}

.filter-dot {
  width: 9px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

.dot-add {
  background: var(--color-jade);
}

.dot-mod {
  background: #D4842A;
}

.dot-del {
  background: var(--color-accent-red);
}

.diff-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--color-icon-bg);
  color: var(--color-brown-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s;
}

.nav-btn:hover {
  background: var(--color-tan-light);
  color: var(--color-brown-dark);
}

.nav-count {
  font-size: 13px;
  color: var(--color-brown-dark);
  background: var(--color-icon-bg);
  padding: 4px 12px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent-red);
  color: var(--color-white);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.export-btn:hover {
  background: var(--color-accent-red-dark);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 0.7px solid var(--color-tan-border);
  border-radius: 8px;
  background: var(--color-cream-dark);
  color: var(--color-brown);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.back-btn:hover {
  background: var(--color-cream-darker);
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-upload-bg);
  border-radius: 10px;
  padding: 8px 16px;
}

.stats-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-brown-muted);
}

.stats-icon {
  font-size: 16px;
  color: var(--color-brown-muted);
  flex-shrink: 0;
}

.stats-desc {
  font-size: 13px;
  color: var(--color-brown-muted);
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #5C4A3A;
}

.stats-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.similarity-label {
  font-size: 12px;
  color: var(--color-brown-muted);
}

.similarity-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brown-dark);
}

.compare-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 400px;
  max-height: 600px;
}

.panel {
  display: flex;
  flex-direction: column;
  background: var(--color-white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--color-upload-bg);
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.version-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-white);
  flex-shrink: 0;
}

.version-v1 {
  background: var(--color-accent-red);
}

.version-v2 {
  background: var(--color-blue-accent);
}

.version-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-page {
  font-size: 12px;
  color: var(--color-brown-muted);
  flex-shrink: 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #5C4A3A;
}

.panel-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.panel-text :deep(.text-highlight) {
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 600;
  cursor: pointer;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.panel-text :deep(.text-highlight[data-similarity="100"]),
.panel-text :deep(.text-highlight[data-similarity="1"]) {
  background: var(--color-diff-added);
  color: var(--color-jade);
}

.panel-text :deep(.text-highlight[data-similarity="80"]),
.panel-text :deep(.text-highlight[data-similarity="2"]) {
  background: var(--color-diff-modified);
  color: #D4842A;
}

.panel-text :deep(.text-highlight[data-similarity="0"]),
.panel-text :deep(.text-highlight[data-similarity="3"]) {
  background: var(--color-diff-deleted);
  color: var(--color-accent-red);
}

.panel-text :deep(.doc-paragraph.has-highlight) {
  border-radius: 0 8px 8px 0;
  padding: 8px 12px;
  margin: 0 -12px;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  min-height: 200px;
  color: var(--color-tan-dark);
  font-size: 14px;
}

.panel-empty-icon {
  font-size: 32px;
  color: var(--color-tan-light);
}

/* 数据表格 */
.data-table {
  background: var(--color-white);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: flex;
  background: var(--color-cream-dark);
  border-bottom: 1px solid var(--color-tan-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
}

.table-body::-webkit-scrollbar {
  width: 6px;
}

.table-body::-webkit-scrollbar-track {
  background: transparent;
}

.table-body::-webkit-scrollbar-thumb {
  background: var(--color-tan-dark);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: var(--color-brown-muted);
}

.table-row {
  display: flex;
  border-bottom: 1px solid var(--color-tan-light);
  font-size: 13px;
  line-height: 1.5;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: rgba(var(--rgb-cinnabar), 0.03);
}

.col {
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
}

.col-index {
  width: 60px;
  flex-shrink: 0;
  justify-content: center;
  color: var(--color-brown-muted);
  font-weight: 500;
}

.col-content {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--color-brown);
}

.col-content.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.col-content.clickable:hover {
  color: var(--color-cinnabar);
}

/* 版本标签 */
.col-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  flex-shrink: 0;
}

.version-badge-left {
  background: var(--color-accent-red);
}

.version-badge-right {
  background: var(--color-blue-accent);
}

.version-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-brown-dark);
  white-space: nowrap;
}

.col-position {
  width: 80px;
  flex-shrink: 0;
  justify-content: center;
  color: var(--color-brown-muted);
  font-size: 12px;
}

/* 高亮样式 */
.data-table .col-content .highlighted-text,
.data-table .col-content :deep(.highlighted-text) {
  background: linear-gradient(135deg, rgba(var(--rgb-gold), 0.5) 0%, rgba(var(--rgb-gold), 0.4) 100%);
  color: var(--color-cinnabar);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(var(--rgb-cinnabar), 0.15);
  border-bottom: 2px solid rgba(var(--rgb-cinnabar), 0.3);
}

.data-table .col-content .highlighted-text:hover {
  background: linear-gradient(135deg, rgba(var(--rgb-gold), 0.7) 0%, rgba(var(--rgb-gold), 0.6) 100%);
  box-shadow: 0 2px 6px rgba(var(--rgb-cinnabar), 0.25);
}

.image-duplicate-section {
  background: var(--color-white);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-tan-border);
  background: var(--color-cream-dark);
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-header-left h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
}

.section-header-icon {
  font-size: 18px;
  color: var(--color-cloud-blue);
}

.image-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(var(--rgb-cloud-blue), 0.1);
  color: var(--color-cloud-blue);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.image-duplicate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  padding: 16px 20px;
}

.image-duplicate-card {
  border: 1px solid var(--color-tan-light);
  border-radius: var(--radius-md);
  padding: 12px;
  background: rgba(var(--rgb-parchment), 0.3);
}

.image-duplicate-pair {
  display: flex;
  align-items: center;
  gap: 12px;
}

.image-duplicate-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.image-side-label {
  font-size: 11px;
  color: var(--color-brown-muted);
  font-weight: 500;
}

.image-duplicate-img {
  width: 100%;
  max-height: 100px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-tan-light);
}

.image-name {
  font-size: 11px;
  color: var(--color-brown-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.image-duplicate-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vs-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 4px 8px;
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
}

.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.bottom-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bottom-pagination .page-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--color-icon-bg);
  color: var(--color-brown-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s;
}

.bottom-pagination .page-btn:hover:not(:disabled) {
  background: var(--color-tan-light);
  color: var(--color-brown-dark);
}

.bottom-pagination .page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-num {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: var(--color-brown-muted);
  transition: all 0.15s;
}

.page-num:hover {
  background: var(--color-icon-bg);
}

.page-num.active {
  background: var(--color-accent-red);
  color: var(--color-white);
}

.sync-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-label {
  font-size: 13px;
  color: var(--color-brown-dark);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-tan-dark);
  border-radius: 11px;
  transition: 0.2s;
}

.toggle input:checked + .toggle-slider {
  background: var(--color-accent-red);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 19px;
  left: 2px;
  bottom: 2px;
  background: var(--color-white);
  border-radius: 9px;
  transition: 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(18px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-tan-border);
  background: var(--color-cream);
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.modal-header-icon {
  font-size: 22px;
  color: var(--color-cinnabar);
}

.modal-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: rgba(var(--rgb-parchment), 0.8);
  color: var(--color-brown);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.modal-close:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
}

.loading-spinner {
  font-size: 28px;
  color: var(--color-cinnabar);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-loading p {
  font-size: 14px;
  color: var(--color-brown);
  margin: 0;
}

.ai-result {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-brown-dark);
}

.ai-result h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 16px 0 10px 0;
}

.ai-result h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 14px 0 8px 0;
}

.ai-result li {
  margin: 6px 0;
  padding-left: 16px;
}

.ai-result strong {
  font-weight: 600;
  color: var(--color-brown-dark);
}

.ai-modal {
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  width: 640px;
  max-width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-tan-border);
}

.preview-modal {
  background: var(--color-cream);
  border-radius: var(--radius-md);
  width: calc(100% - 32px);
  max-width: 1100px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-tan-border);
}

.preview-panel-headers {
  display: flex;
  border-bottom: 1px solid var(--color-tan-border);
  background: rgba(var(--rgb-cream-dark), 0.5);
}

.preview-panel-header {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
}

.preview-panel-header:first-child {
  border-right: 1px solid var(--color-tan-border);
}

.preview-panel-header.right {
  flex-direction: row-reverse;
}

.preview-file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-page-info {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--rgb-cinnabar), 0.85);
  background: rgba(var(--rgb-cinnabar), 0.06);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.preview-modal-body {
  display: flex;
  height: calc(90vh - 100px);
  overflow: hidden;
}

.preview-panel {
  flex: 1;
  overflow-y: auto;
  background: var(--color-warm-gray);
}

.preview-panel-inner {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 48px;
  background: var(--color-white);
  box-shadow: var(--shadow-md);
  min-height: 100%;
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-brown-dark);
  font-family: var(--font-body);
}

.preview-panel-inner :deep(.text-highlight) {
  background: linear-gradient(135deg, rgba(var(--rgb-gold), 0.5), rgba(var(--rgb-gold), 0.4)) !important;
  color: var(--color-cinnabar) !important;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 600;
  cursor: pointer;
}

.preview-panel-inner :deep(.doc-paragraph.has-highlight) {
  background: rgba(var(--rgb-gold), 0.06);
  border-left: 3px solid rgba(var(--rgb-gold), 0.5);
  padding-left: 10px;
  margin-left: -13px;
  border-radius: 0 2px 2px 0;
}

.preview-divider {
  width: 4px;
  background: linear-gradient(to bottom, rgba(var(--rgb-cinnabar), 0.3), rgba(var(--rgb-brown-muted), 0.2), rgba(var(--rgb-cinnabar), 0.3));
  flex-shrink: 0;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  color: var(--color-tan-dark);
  font-size: 14px;
}

.context-modal {
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.context-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.context-segment-info {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(var(--rgb-cream-dark), 0.6);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-brown);
}

.context-segment-id {
  font-weight: 600;
  color: var(--color-cinnabar);
}

.context-pre {
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-brown-dark);
  background: rgba(var(--rgb-parchment), 0.3);
  padding: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-tan-light);
  max-height: 40vh;
  overflow-y: auto;
  margin: 0;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .compare-panels {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .stats-left {
    flex-wrap: wrap;
    gap: 8px;
  }

  .image-duplicate-grid {
    grid-template-columns: 1fr;
  }

  .preview-modal-body {
    flex-direction: column;
  }

  .preview-divider {
    width: 100%;
    height: 3px;
  }

  .preview-panel {
    max-height: 50%;
  }

  .preview-panel-inner {
    padding: 24px 20px !important;
  }

  .file-info-bar {
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .bottom-bar {
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
}
</style>

<style>
/* 全局样式：用于 v-html 渲染的预览片段高亮 */
.preview-segment-target {
  background-color: rgba(var(--rgb-gold), 0.12) !important;
  outline: 2px solid rgba(var(--rgb-gold), 0.5) !important;
  outline-offset: 2px !important;
  animation: previewTargetPulse 2s ease-in-out 3 !important;
  border-radius: var(--radius-xs);
}

@keyframes previewTargetPulse {
  0%, 100% { outline-color: rgba(var(--rgb-gold), 0.5); }
  50% { outline-color: rgba(var(--rgb-gold), 0.9); }
}
</style>
