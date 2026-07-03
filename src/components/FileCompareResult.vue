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
import { BorderBeam } from 'vue3-border-beam'

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

// 跟踪哪个面板有焦点
let focusedPanel: 'left' | 'right' | null = null

// 左侧面板获得焦点
const handleLeftFocus = () => {
  focusedPanel = 'left'
}

// 右侧面板获得焦点
const handleRightFocus = () => {
  focusedPanel = 'right'
}

// 滚动同步处理
const handleLeftScroll = () => {
  if (!syncScroll.value || !leftContentRef.value || !rightContentRef.value) return
  
  // 只有当左侧有焦点或者同步滚动开启时才同步
  if (focusedPanel === 'left' || focusedPanel === null) {
    rightContentRef.value.scrollTop = leftContentRef.value.scrollTop
  }
}

const handleRightScroll = () => {
  if (!syncScroll.value || !leftContentRef.value || !rightContentRef.value) return
  
  // 只有当右侧有焦点或者同步滚动开启时才同步
  if (focusedPanel === 'right' || focusedPanel === null) {
    leftContentRef.value.scrollTop = rightContentRef.value.scrollTop
  }
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
  <div class="result-page-container">
    <!-- 页面头部 -->
    <div class="ba-page-header">
      <div>
        <h1 class="ba-page-title">文件对比结果</h1>
        <p class="ba-page-subtitle">显示文档之间的内容差异、相似片段和统计分析</p>
      </div>
      <div class="ba-page-actions">
        <BorderBeam size="sm" color-variant="ocean" theme="dark" :duration="2">
          <button class="ba-btn-primary ba-btn-sm" @click="handleBack" title="返回">
            <RiRestartLine class="ba-btn-icon" />
            <span class="ba-btn-text-mobile-hide">返回</span>
          </button>
        </BorderBeam>
        <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
          <button class="ba-btn-secondary ba-btn-sm" @click="handleExport" title="导出报告">
            <RiSaveLine class="ba-btn-icon" />
            <span>导出</span>
          </button>
        </BorderBeam>
      </div>
    </div>

    <!-- AI分析结果弹窗 -->
    <div v-if="showAIAnalysis" class="ai-modal-overlay" @click="showAIAnalysis = false">
      <div class="ai-modal" @click.stop>
        <div class="ai-modal-header">
          <div class="ai-modal-title">
            <RiSparkling2Fill class="ai-modal-icon" />
            <h3>AI智能分析</h3>
          </div>
          <button class="ai-modal-close" @click="showAIAnalysis = false">×</button>
        </div>
        <div class="ai-modal-body">
          <div v-if="isLoading" class="ai-loading">
            <RiLoaderLine class="loading-spinner" />
            <p>AI正在分析中，请稍候...</p>
          </div>
          <div v-else class="ai-result" v-html="formatMarkdown(aiModelResponse)"></div>
        </div>
      </div>
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
        <div class="list-header-actions">
          <BorderBeam size="sm" color-variant="ocean" theme="dark" :duration="2">
            <button class="ba-btn-secondary ba-btn-sm" @click="showPreviewModal = true" title="全文预览">
              <RiEyeLine class="ba-btn-icon" />
              <span class="ba-btn-text-mobile-hide">预览</span>
            </button>
          </BorderBeam>
          <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
            <button class="ba-btn-primary ba-btn-sm" @click="handleAIAnalysis" :disabled="isLoading" title="AI智能分析">
              <RiSparkling2Fill class="ba-btn-icon" />
              <span>{{ isLoading ? 'AI分析中...' : 'AI分析' }}</span>
            </button>
          </BorderBeam>
          <div class="list-header-stats">
            <div class="ba-stat-badge ba-stat-brand">
              <span class="ba-stat-badge-icon">📊</span>
              <span>共 {{ segments.length }} 处（≥{{ settings.textSimilarityThreshold }}%：{{ countThresholdSimilarity }}处）</span>
            </div>
            <div class="ba-stat-badge ba-stat-success">
              <span class="ba-stat-badge-icon">💯</span>
              <span>100%相同：{{ count100Similarity }}个</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 对比数据表 -->
      <div class="data-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col col-index">序号</div>
          <div class="col col-content" :title="leftFileName || '文件A'">{{ leftFileName || '文件A' }}</div>
          <div class="col col-position">位置</div>
          <div class="col col-position">位置</div>
          <div class="col col-content" :title="rightFileName || '文件B'">{{ rightFileName || '文件B' }}</div>
        </div>

        <!-- 表体 -->
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

    <!-- 图片雷同检测结果 -->
    <div v-if="imageDuplicates.length" class="image-duplicate-section">
      <div class="section-header">
        <div class="title-section">
          <RiImageLine class="title-icon" />
          <h2 class="list-title">图片雷同检测</h2>
        </div>
        <div class="section-header-stats">
          <span class="image-count-badge">发现 {{ imageDuplicates.length }} 组雷同图片</span>
        </div>
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

    <!-- 预览弹窗 -->
    <div v-if="showPreviewModal" class="help-modal-overlay" @click="showPreviewModal = false">
      <div class="preview-modal" @click.stop>
        <div class="help-modal-header">
          <h3>
            全文预览 — {{ segments.length }} 处重复片段
          </h3>
          <button class="help-close-btn" @click="showPreviewModal = false">×</button>
        </div>
        <div class="preview-panel-headers">
          <div class="preview-panel-header">
            <div class="panel-header-top">
              <span class="panel-file-name">{{ leftFileName || '文件A' }}</span>
              <span class="panel-page-info">{{ leftPageDisplay }}</span>
            </div>
            <div class="panel-header-bottom">
              <span class="highlight-hint">🔍 黄色高亮为重复片段</span>
            </div>
          </div>
          <div class="preview-panel-header-sep"></div>
          <div class="preview-panel-header right">
            <div class="panel-header-top">
              <span class="panel-file-name">{{ rightFileName || '文件B' }}</span>
              <span class="panel-page-info">{{ rightPageDisplay }}</span>
            </div>
            <div class="panel-header-bottom">
              <span class="highlight-hint">🔍 黄色高亮为重复片段</span>
            </div>
          </div>
        </div>
        <div class="preview-modal-body">
          <div class="preview-panel" ref="previewLeftRef" @scroll="handlePreviewLeftScroll">
            <div class="preview-panel-inner" v-if="leftFileContent">
              <div class="preview-placeholder" v-if="!leftFileContent">左侧文件无内容</div>
              <div v-html="sanitizeWithHighlight(previewLeftHtml)"></div>
            </div>
            <div class="preview-empty" v-else>
              <div class="empty-icon">📄</div>
              <div class="empty-text">左侧文件无内容预览</div>
            </div>
          </div>
          <div class="preview-divider"></div>
          <div class="preview-panel" ref="previewRightRef" @scroll="handlePreviewRightScroll">
            <div class="preview-panel-inner" v-if="rightFileContent">
              <div v-html="sanitizeWithHighlight(previewRightHtml)"></div>
            </div>
            <div class="preview-empty" v-else>
              <div class="empty-icon">📄</div>
              <div class="empty-text">右侧文件无内容预览</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 上下文查看弹窗 -->
    <div v-if="showContextModal" class="help-modal-overlay" @click="showContextModal = false">
      <div class="context-modal" @click.stop>
        <div class="help-modal-header">
          <h3>{{ contextSide === 'left' ? leftFileName : rightFileName }} - 上下文</h3>
          <button class="help-close-btn" @click="showContextModal = false">×</button>
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
.result-page-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: var(--color-parchment);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
  font-family: var(--font-ui);
}

/* AI分析弹窗 */
.ai-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.ai-modal {
  background-color: var(--color-parchment);
  border-radius: var(--radius-xl);
  width: 700px;
  max-width: 100%;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-tan-border);
}

.ai-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-tan-border);
  background-color: rgba(var(--rgb-cream), 0.5);
}

.ai-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-modal-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
}

.ai-modal-icon {
  font-size: 24px;
  color: var(--color-cinnabar);
}

.ai-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: rgba(var(--rgb-cream), 0.8);
  color: var(--color-brown);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.ai-modal-close:hover {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.ai-modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 0;
}

.loading-spinner {
  font-size: 32px;
  color: var(--color-cinnabar);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ai-loading p {
  font-size: 14px;
  color: var(--color-brown);
  font-family: var(--font-ui);
}

.ai-result {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.ai-result h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 20px 0 12px 0;
  font-family: var(--font-ui);
}

.ai-result h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 16px 0 10px 0;
  font-family: var(--font-ui);
}

.ai-result li {
  margin: 8px 0;
  padding-left: 16px;
  list-style-type: disc;
}

.ai-result strong {
  font-weight: 600;
  color: var(--color-brown-dark);
}

.ai-result em {
  font-style: italic;
  color: var(--color-brown);
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--color-white);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 同步滚动开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch input:checked + .slider {
  background-color: var(--color-cloud-blue);
}

.switch input:checked + .slider:before {
  transform: translateX(-24px);
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-tan-dark);
  transition: 0.3s;
  border-radius: var(--radius-full);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--color-white);
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
}

.switch-label {
  font-size: 13px;
  color: var(--color-brown);
  font-family: var(--font-ui);
  user-select: none;
  cursor: pointer;
}

/* 字号控制 */
.icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.icon-btn:hover:not(:disabled) {
  background-color: var(--color-cream-dark);
  border-color: var(--color-tan-dark);
}

.icon-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
  color: var(--color-brown-muted);
}

.font-size-display {
  font-size: 14px;
  color: var(--color-brown);
  font-family: var(--font-ui);
  min-width: 48px;
  text-align: center;
  padding: 6px 8px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
}

/* 右侧页码信息 */
.page-info {
  font-size: 14px;
  color: var(--color-brown);
  font-family: var(--font-ui);
  white-space: nowrap;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 对比信息栏 */
.word-info-bar {
  background-color: var(--color-white);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.word-file-left,
.word-file-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.word-file-right {
  justify-content: flex-end;
}

.file-title-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-cloud-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(var(--rgb-cloud-blue), 0.3);
}

.title-icon-wrapper.right-icon {
  background: var(--color-cinnabar);
  box-shadow: 0 2px 6px rgba(var(--rgb-cinnabar), 0.3);
}

.title-icon {
  font-size: 18px;
  color: var(--color-white);
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-main {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-sub {
  font-size: 11px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.word-comparison-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.word-file-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: rgba(var(--rgb-cloud-blue), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  font-size: 20px;
  color: var(--color-cloud-blue);
}

.word-file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.file-sub-info {
  font-size: 12px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

/* 对比统计徽章 */
.word-comparison-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-same {
  background-color: rgba(var(--rgb-jade), 0.1);
  color: var(--color-jade-dark);
}

.stat-same .ba-stat-badge-icon {
  color: var(--color-jade);
}

/* Word 文档预览区 */
.word-document-preview {
  background-color: var(--color-white);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 对比容器 */
.comparison-wrapper {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  min-height: 472px;
  max-height: 600px;
  position: relative;
}

/* 差异导航工具栏 */
.diff-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--color-cream-dark);
  border-bottom: 1px solid var(--color-tan-border);
}

.diff-toolbar-spacer {
  flex: 1;
}

.diff-toolbar-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.diff-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  color: var(--color-brown-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-ui);
  transition: all 0.15s;
}

.diff-nav-btn:hover:not(:disabled) {
  background-color: var(--color-cream-dark);
  border-color: var(--color-tan-dark);
}

.diff-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.diff-nav-btn.primary {
  background-color: var(--color-cinnabar);
  border-color: var(--color-cinnabar);
  color: var(--color-white);
}

.diff-nav-btn.primary:hover:not(:disabled) {
  background-color: var(--color-cinnabar-dark);
  border-color: var(--color-cinnabar-dark);
}

.diff-nav-icon {
  font-size: 14px;
}

.diff-separator {
  color: var(--color-tan-dark);
  font-size: 14px;
  padding: 0 4px;
}

/* 文件面板 */
.file-panel {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-white);
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--color-cream-dark);
  border-bottom: 1px solid var(--color-tan-border);
  font-weight: 500;
  color: var(--color-brown);
  font-size: 14px;
  font-family: var(--font-ui);
}

.panel-icon {
  font-size: 16px;
  color: var(--color-brown-muted);
}

/* 悬浮页码指示器 */
.floating-page-indicator {
  position: absolute;
  left: 8px;
  top: 60px;
  background-color: rgba(var(--rgb-white), 0.95);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
  text-align: center;
  z-index: 30;
  pointer-events: none;
  transition: top 0.15s ease;
}

.right-panel .floating-page-indicator {
  left: auto;
  right: 8px;
}

.floating-page-indicator .divider {
  margin: 2px 0;
  opacity: 0.5;
}

/* 文件内容区 */
.file-content {
  flex: 1;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-ink-black);
}

/* 文件行 */
.file-line {
  display: flex;
  align-items: flex-start;
  padding: 0 12px;
  min-height: 24px;
  transition: background-color 0.1s;
}

.file-line:hover {
  background-color: var(--color-cream-dark);
}

/* 行号 */
.line-number {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 20px;
  width: max-content;
  padding: 0 4px;
  font-size: 12px;
  color: var(--color-tan-dark);
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  user-select: none;
  flex-shrink: 0;
  border-right: 1px solid var(--color-tan-border);
  margin-right: 6px;
  text-align: right;
}

/* 行内容 */
.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 2px 0;
}

/* 右侧面板特殊样式 */
.right-content {
  direction: ltr;
}

.right-line {
  flex-direction: row-reverse;
}

.right-line-number {
  border-right: none;
  border-left: 1px solid var(--color-tan-border);
  margin-right: 0;
  margin-left: 8px;
  text-align: left;
}

/* 相同内容行 */
.file-line.line-same {
  background-color: var(--color-diff-green-bg);
}

.file-line.line-same .line-number,
.right-line.line-same .right-line-number {
  color: var(--color-jade);
  border-right-color: rgba(var(--rgb-jade), 0.3);
  border-left-color: rgba(var(--rgb-jade), 0.3);
}

/* 新增内容行 */
.file-line.line-added {
  background-color: rgba(var(--rgb-cloud-blue), 0.08);
}

.file-line.line-added .line-number,
.right-line.line-added .right-line-number {
  color: var(--color-cloud-blue);
  border-right-color: rgba(var(--rgb-cloud-blue), 0.3);
  border-left-color: rgba(var(--rgb-cloud-blue), 0.3);
}

/* 删除内容行 */
.file-line.line-deleted {
  background-color: var(--color-diff-red-bg);
}

.file-line.line-deleted .line-number,
.right-line.line-deleted .right-line-number {
  color: var(--color-cinnabar);
  border-right-color: rgba(var(--rgb-cinnabar), 0.3);
  border-left-color: rgba(var(--rgb-cinnabar), 0.3);
}

.file-line.line-deleted .line-content {
  text-decoration: line-through;
  color: var(--color-tan-dark);
}

/* 片段块样式 (Word View) */
.segment-block {
  margin-bottom: 20px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  background-color: var(--color-white);
  transition: all 0.2s;
}

.segment-block:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(var(--rgb-cloud-blue), 0.3);
}

.segment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: var(--color-cream-dark);
  border-bottom: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.segment-id {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.segment-score {
  font-size: 12px;
  color: var(--color-jade);
  font-weight: bold;
  background-color: rgba(var(--rgb-jade), 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}

.segment-text {
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-ink-black);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-tan-dark);
  font-size: 14px;
}

/* 中间连接区域 */
.center-divider {
  position: relative;
  background-color: var(--color-cream-dark);
  border-left: 1px solid var(--color-tan-border);
  border-right: 1px solid var(--color-tan-border);
}

.vertical-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--color-tan-dark);
  transform: translateX(-50%);
}

.horizontal-connection {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(var(--rgb-tan-dark), 0.3) 20%, 
    rgba(var(--rgb-tan-dark), 0.3) 80%, 
    transparent 100%
  );
  pointer-events: none;
}

/* 对比列表区 */
.comparison-list {
  background-color: var(--color-white);
  border: 0.7px solid var(--color-tan-dark);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
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
  background: rgba(var(--rgb-cream-dark), 0.5);
  border-radius: var(--radius-xs);
}

.table-body::-webkit-scrollbar-thumb {
  background: var(--color-tan-border);
  border-radius: var(--radius-xs);
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: var(--color-tan-dark);
}

/* 列表头部 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.list-header .title-section {
  display: flex;
  align-items: center;
}

.icon-container {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: rgba(var(--rgb-cinnabar), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.title-icon {
  font-size: 20px;
  color: var(--color-cinnabar);
}

.spacer {
  width: 12px;
  flex-shrink: 0;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
  white-space: nowrap;
}

/* 列表头部操作区 */
.list-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* AI 按钮的图标闪烁效果 - 增强共享按钮 */
.list-header-actions .ba-btn-icon {
  transition: transform 0.3s;
}

button:enabled:hover .list-header-actions .ba-btn-primary .ba-btn-icon {
  animation: sparkle-pulse 1.5s ease-in-out infinite;
}

@keyframes sparkle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* 列表头部统计徽章 */
.list-header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Word 预览列表样式 */
.word-list-view {
  width: 100%;
  background-color: var(--color-white);
  border: 0.7px solid var(--color-tan-dark);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.word-list-view .table-header,
.word-list-view .table-row {
  display: grid;
  grid-template-columns: 60px 1fr 100px 90px 100px 1fr;
}

.word-list-view .col-similarity {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-right: 1px solid var(--color-tan-border);
}

.similarity-score {
  background-color: rgba(var(--rgb-jade), 0.1);
  color: var(--color-jade-dark);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* 确保高亮在 Word 预览列表中生效 */
.word-list-view .col-content :deep(.highlighted-text) {
  background-color: rgba(var(--rgb-gold), 0.85) !important;
  color: var(--color-cinnabar) !important;
  padding: 2px 4px !important;
  border-radius: var(--radius-xs) !important;
  font-weight: 700 !important;
  display: inline !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(var(--rgb-gold), 0.5) !important;
}

/* 对比数据表 */
.data-table {
  border: 0.7px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* 表头 */
.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 100px 100px 1fr;
  background-color: var(--color-cream-dark);
}

.table-header .col {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown);
  font-family: var(--font-ui);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-tan-border);
  white-space: nowrap;
}

.table-header .col-content {
  justify-content: flex-start;
  padding-left: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-header .col-position {
  border-right: 1px solid var(--color-tan-border);
}

/* 表体 */
.table-body {
  overflow: visible;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 1fr 100px 100px 1fr;
  border-bottom: 1px solid var(--color-tan-border);
  transition: background-color 0.2s;
  min-height: 44px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: rgba(var(--rgb-cream-dark), 0.5);
}

.table-row .col {
  min-width: 0;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  line-height: 1.5;
  display: flex;
  align-items: stretch;
}

.table-row .col-index {
  justify-content: center;
  align-items: center;
  font-weight: 500;
  color: var(--color-brown-muted);
}

/* 确保高亮在表格内容中正确显示 */
.table-row .col-content {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.5;
  padding: 6px 12px;
  background-color: rgba(var(--rgb-white), 0.9);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-tan-light);
  height: 32px;
  flex: 1;
  display: block;
  position: relative;
  cursor: default;
  box-sizing: border-box;
}

.table-row .col-content :deep(.highlighted-text) {
  background-color: rgba(var(--rgb-gold), 0.9) !important;
  color: var(--color-cinnabar) !important;
  padding: 0 4px !important;
  border-radius: var(--radius-xs) !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: 1.5 !important;
  max-height: 1.5em !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(var(--rgb-gold), 0.6) !important;
  max-width: 100%;
  position: relative;
  cursor: default;
}

.table-row .col-content :deep(.highlighted-text):hover {
  background-color: rgba(var(--rgb-gold), 1) !important;
  box-shadow: 0 0 0 2px rgba(var(--rgb-gold), 0.8) !important;
}

/* 全局高亮样式 - 用于v-html生成的内容 */
.data-table .col-content .highlighted-text {
  background-color: rgba(var(--rgb-gold), 0.9) !important;
  color: var(--color-cinnabar) !important;
  padding: 0 4px !important;
  border-radius: var(--radius-xs) !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: 1.5 !important;
  max-height: 1.5em !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(var(--rgb-gold), 0.6) !important;
  max-width: 100%;
  position: relative;
  cursor: default;
  transition: all 0.2s ease;
}

.data-table .col-content .highlighted-text:hover {
  background-color: rgba(var(--rgb-gold), 1) !important;
  box-shadow: 0 0 0 2px rgba(var(--rgb-gold), 0.8) !important;
}

.table-row .col-position {
  justify-content: center;
  font-size: 12px;
  color: var(--color-brown-muted);
  border-right: 1px solid var(--color-tan-light);
}

.col-content.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.col-content.clickable:hover {
  background-color: rgba(var(--rgb-gold), 0.15);
}

/* 图片雷同检测 */
.image-duplicate-section {
  background-color: rgba(var(--rgb-white), 0.9);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.section-header-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.image-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(var(--rgb-cloud-blue), 0.1);
  color: var(--color-cloud-blue);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-ui);
}

.image-duplicate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
  color: rgba(var(--rgb-brown), 0.6);
  font-weight: 500;
}

.image-duplicate-img {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-tan-light);
}

.image-name {
  font-size: 11px;
  color: rgba(var(--rgb-brown), 0.7);
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
  min-width: 48px;
  padding: 4px 8px;
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-ui);
}

.help-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-tan-border);
  background: var(--color-cream);
}

.help-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.help-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: rgba(var(--rgb-parchment), 0.8);
  color: var(--color-brown);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.help-close-btn:hover {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

/* 通用弹窗遮罩 */
.help-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-modal {
  background: var(--color-cream);
  border-radius: var(--radius-md);
  width: calc(100% - 32px);
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl), 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--color-tan-border);
  animation: modalSlideIn 0.3s ease;
}

.preview-modal-body {
  display: flex;
  height: calc(90vh - 60px);
  overflow: hidden;
}

.preview-panel {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-warm-gray);
  background-image: 
    linear-gradient(90deg, rgba(var(--rgb-brown-muted), 0.03) 0%, transparent 8%, transparent 92%, rgba(var(--rgb-brown-muted), 0.03) 100%);
}

.preview-panel-inner {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 56px;
  background: var(--color-white);
  box-shadow: var(--shadow-md);
  min-height: 100%;
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-brown-dark);
  font-family: var(--font-body);
  letter-spacing: 0.02em;
}

.full-text-content {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 2;
  text-align: justify;
  word-break: break-word;
  white-space: pre-wrap;
  color: var(--color-brown-dark);
}

.doc-paragraph {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-tan-light);
  transition: background-color 0.2s ease;
  position: relative;
}

.doc-paragraph:last-child {
  border-bottom: none;
}

.doc-paragraph.has-highlight {
  background-color: rgba(var(--rgb-gold), 0.08);
  border-left: 3px solid rgba(var(--rgb-gold), 0.6);
  padding-left: 12px;
  margin-left: -15px;
  border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
}

.doc-paragraph.has-highlight::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, rgba(var(--rgb-gold), 0.8), rgba(var(--rgb-gold), 0.6));
  border-radius: 2px;
}

.text-highlight {
  background: linear-gradient(135deg, rgba(var(--rgb-gold), 0.5) 0%, rgba(var(--rgb-gold), 0.4) 100%) !important;
  color: var(--color-cinnabar) !important;
  padding: 2px 4px;
  border-radius: var(--radius-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(var(--rgb-cinnabar), 0.15);
  border-bottom: 2px solid rgba(var(--rgb-cinnabar), 0.3);
}

.text-highlight:hover {
  background: linear-gradient(135deg, rgba(var(--rgb-gold), 0.8) 0%, rgba(var(--rgb-gold), 0.7) 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(var(--rgb-cinnabar), 0.25);
}

.text-highlight::after {
  content: attr(data-similarity);
  font-size: 9px;
  background: rgba(var(--rgb-cinnabar), 0.8);
  color: var(--color-white);
  padding: 1px 4px;
  border-radius: var(--radius-md);
  margin-left: 4px;
  vertical-align: super;
}

.preview-panel-headers {
  display: flex;
  border-bottom: 2px solid rgba(var(--rgb-cinnabar), 0.3);
  background: rgba(var(--rgb-cream-dark), 0.5);
}

.preview-panel-header {
  flex: 1;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(var(--rgb-white), 0.8) 0%, rgba(var(--rgb-cream-dark), 0.3) 100%);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}

.panel-page-info {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--rgb-cinnabar), 0.85);
  background: rgba(var(--rgb-cinnabar), 0.06);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.panel-header-bottom {
  display: flex;
  align-items: center;
}

.highlight-hint {
  font-size: 11px;
  color: rgba(var(--rgb-brown), 0.6);
  font-weight: 400;
}

.header-stat {
  font-size: 11px;
  font-weight: 400;
  color: rgba(var(--rgb-brown), 0.6);
}

.preview-panel-header:first-child {
  border-right: 1px solid var(--color-tan-border);
}

.preview-panel-header.right {
  text-align: right;
  align-items: flex-end;
  border-right: none;
  border-left: 1px solid var(--color-tan-border);
}

.preview-panel-header.right .header-stat {
  text-align: right;
}

.preview-panel-header.right .panel-header-top {
  flex-direction: row-reverse;
}

.preview-panel-header.right .panel-page-info {
  margin-right: 0;
  margin-left: 12px;
}

.preview-panel-header-sep {
  display: none;
}

.preview-divider {
  width: 6px;
  background: linear-gradient(to bottom, 
    rgba(var(--rgb-cinnabar), 0.4) 0%, 
    rgba(var(--rgb-brown-muted), 0.3) 50%, 
    rgba(var(--rgb-cinnabar), 0.4) 100%
  );
  flex-shrink: 0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: rgba(var(--rgb-brown-muted), 0.5);
  gap: 12px;
}

.preview-empty .empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.preview-empty .empty-text {
  font-size: 14px;
  font-family: var(--font-ui);
}

.preview-segment {
  margin-bottom: 24px;
  transition: background-color 0.3s;
  padding: 16px 20px;
  background: rgba(var(--rgb-white), 0.7);
  border-left: 3px solid rgba(var(--rgb-cinnabar), 0.6);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  page-break-inside: avoid;
}

.preview-seg-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-tan-border);
  font-family: var(--font-ui);
}

.preview-segment.right .preview-seg-info {
  flex-direction: row-reverse;
}

.preview-seg-id {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--rgb-cinnabar), 0.9);
  background: rgba(var(--rgb-cinnabar), 0.08);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.preview-seg-page {
  font-size: 11px;
  color: rgba(var(--rgb-brown), 0.7);
}

.preview-seg-content {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.9;
  text-align: justify;
  word-break: break-word;
  white-space: pre-wrap;
  color: var(--color-brown-dark);
}

.preview-segment.right {
  border-left: none;
  border-right: 3px solid rgba(var(--rgb-cinnabar), 0.6);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.preview-seg-content :deep(.highlighted-text) {
  background-color: rgba(var(--rgb-gold), 0.5) !important;
  color: var(--color-cinnabar) !important;
  padding: 1px 3px;
  border-radius: var(--radius-xs);
  font-weight: 500;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.preview-sep {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--rgb-brown-muted), 0.2), transparent);
  margin: 8px 0;
}

.context-modal {
  background: var(--color-cream);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: modalSlideIn 0.3s ease;
}

.context-modal-body {
  padding: 16px 24px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.context-segment-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(var(--rgb-cream-dark), 0.6);
  border-radius: var(--radius-md);
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
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-tan-light);
  max-height: 50vh;
  overflow-y: auto;
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
  color: var(--color-brown);
  font-family: var(--font-ui);
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
  border: 0.7px solid var(--color-tan-dark);
  border-radius: var(--radius-md);
  background-color: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-brown);
  font-family: var(--font-ui);
}

.page-btn {
  color: var(--color-brown);
}

.page-btn:hover:not(:disabled),
.page-number:hover {
  background-color: var(--color-cream-dark);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-number.active {
  background-color: var(--color-cinnabar);
  border-color: var(--color-cinnabar);
  color: var(--color-white);
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .result-page-container {
    padding: 12px;
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

  .list-header-actions {
    width: 100%;
    justify-content: flex-end;
    gap: 6px;
  }

  .list-header-stats {
    width: 100%;
  }

  /* 表格内容容器:横向滚动,内容最小宽减小 */
  .data-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table .table-header,
  .data-table .table-row {
    grid-template-columns: 50px minmax(200px, 1fr) 70px 70px minmax(200px, 1fr);
    min-width: 720px;
  }

  /* Word 列表也允许滚动 */
  .word-list-view {
    overflow-x: auto;
  }

  .word-list-view .table-header,
  .word-list-view .table-row {
    min-width: 720px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  /* 分页按钮最小触摸目标 */
  .page-btn,
  .page-number {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    font-size: 14px;
  }

  .pagination-btn {
    min-height: 44px;
    padding: 8px 12px;
    font-size: 14px;
  }

  .page-ellipsis {
    font-size: 14px;
  }

  /* 上下文弹窗移动端全屏 */
  .context-modal {
    margin: 0;
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .context-modal-body {
    padding: 12px;
  }

  /* 预览模态框容器边距回收 */
  .help-modal-overlay {
    padding: 0;
  }
}

/* 超小屏幕手机优化 (320px-480px) */
@media (max-width: 480px) {
  .result-page-container {
    padding: 10px;
  }

  .comparison-list {
    padding: 12px;
  }

  .list-title {
    font-size: 16px;
  }

  .data-table .table-header,
  .data-table .table-row,
  .word-list-view .table-header,
  .word-list-view .table-row {
    min-width: 560px;
  }

  .page-btn,
  .page-number {
    width: 40px;
    height: 40px;
    font-size: 13px;
  }

  .pagination-btn {
    padding: 8px 10px;
    font-size: 13px;
  }

  .page-ellipsis {
    font-size: 13px;
  }
}

/* 移动端预览面板优化 */
@media (max-width: 768px) {
  .preview-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .preview-modal-body {
    flex-direction: column;
    height: calc(100vh - 120px);
  }

  .preview-panel-headers {
    flex-shrink: 0;
  }

  .preview-panel {
    flex: 1;
    min-height: 0;
    max-height: 50%;
  }

  .preview-panel-header {
    font-size: 12px;
    padding: 10px 16px;
  }

  .preview-divider {
    width: 100%;
    height: 4px;
    flex-shrink: 0;
    background: linear-gradient(to right,
      rgba(var(--rgb-cinnabar), 0.4) 0%,
      rgba(var(--rgb-brown-muted), 0.3) 50%,
      rgba(var(--rgb-cinnabar), 0.4) 100%
    );
  }

  .preview-panel-inner {
    padding: 24px 20px !important;
    max-width: 100% !important;
  }

  .preview-segment {
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .preview-seg-content {
    font-size: 13px !important;
    line-height: 1.8 !important;
  }

  .help-modal-header {
    padding: 12px 16px;
  }

  .help-modal-header h3 {
    font-size: 14px;
  }

  .help-close-btn {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .context-modal {
    margin: 16px;
    max-height: calc(100vh - 32px);
  }
}

@media (max-width: 480px) {
  .preview-panel-inner {
    padding: 16px 14px !important;
  }

  .preview-segment {
    padding: 10px 14px;
  }

  .preview-seg-id {
    font-size: 11px;
    padding: 2px 6px;
  }

  .preview-seg-page {
    font-size: 10px;
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
