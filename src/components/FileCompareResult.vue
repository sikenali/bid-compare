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
  RiImageLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
import { useSettings } from '../composables/useSettings'
import { useAIModel } from '../composables/useAIModel'
import { getCompareResult, deleteCompareResult } from '../utils/compareResultStore'
import { sanitizeHTML, sanitizeWithHighlight } from '../utils/sanitize'
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

// 图片雷同结果
const imageDuplicates = ref<any[]>([])

// 上下文查看
const showContextModal = ref(false)
const contextSegment = ref<SimilarSegment | null>(null)
const contextSide = ref<'left' | 'right'>('left')
const contextFullText = ref('')

// AI分析相关
const showAIAnalysis = ref(false)
const aiModelResponse = ref('')

// 文件真实页数
const leftTotalPages = ref(1)
const rightTotalPages = ref(1)

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
        sessionStorage.removeItem('compareResult') // 读取后清理
      } catch (e) {
        console.error('解析 sessionStorage 失败', e)
      }
    }
  }

  if (resultData) {
    segments.value = resultData.segments || []
    // 确保文件名正确显示
    leftFileName.value = resultData.leftFileName && resultData.leftFileName !== '' ? resultData.leftFileName : '左侧文件'
    rightFileName.value = resultData.rightFileName && resultData.rightFileName !== '' ? resultData.rightFileName : '右侧文件'
    textSimilarity.value = resultData.textSimilarity || '0%'
    similarSegmentsCount.value = resultData.similarSegmentsCount || segments.value.length

    // 读取真实页数
    leftTotalPages.value = resultData.leftTotalPages || 1
    rightTotalPages.value = resultData.rightTotalPages || 1

    // 加载原始文本内容（用于上下文查看）
    leftFileContent.value = resultData.leftFileContent || ''
    rightFileContent.value = resultData.rightFileContent || ''

    // 加载图片雷同结果
    imageDuplicates.value = resultData.imageDuplicates || []

    // 调试日志
    console.log('加载对比结果:', {
      leftFileName: leftFileName.value,
      rightFileName: rightFileName.value,
      segmentCount: segments.value.length,
      fromStore: !!resultId
    })
  } else {
    console.warn('未找到对比结果数据')
  }
}

// 解析文件内容为行数据 (已移除，不再使用全文本解析)
// const parseFileLines = (leftContent: string, rightContent: string, segments: SimilarSegment[]) => {
//   // ... (code removed)
// }

// 在组件挂载时初始化数据
onMounted(() => {
  console.log('FileCompareResult - onMounted')
  initData()
})

// 如果组件被 keep-alive 缓存，激活时重新加载数据
onActivated(() => {
  console.log('FileCompareResult - onActivated')
  initData()
})

// 监听路由查询参数变化，重新加载数据
watch(() => route.query.t, () => {
  console.log('FileCompareResult - route.query.t changed')
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
    console.error('导出报告失败:', error)
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
  const includeHighlight = settings.includeHighlight
  let md = ''

  // 报告标题
  md += '# 文件对比报告\n\n'

  // 统计信息
  md += '## 一、相似度统计\n\n'
  md += `- **文本重复率**：${textSimilarity.value}\n`
  md += `- **雷同片段**：${similarSegmentsCount.value}处\n\n`

  // 文件信息（如果开启图表）
  if (settings.includeCharts) {
    md += '## 二、文件信息\n\n'
    md += '| 项目 | 左侧文件 | 右侧文件 |\n'
    md += '|------|----------|----------|\n'
    md += `| 文件名 | ${leftFileName.value || '-'} | ${rightFileName.value || '-'} |\n`
    md += `| 文本重复率 | ${textSimilarity.value} | ${textSimilarity.value} |\n`
    md += `| 雷同片段数 | ${similarSegmentsCount.value}处 | ${similarSegmentsCount.value}处 |\n\n`
  }

  // 雷同片段详情
  const sectionNum = settings.includeCharts ? '三' : '二'
  md += `## ${sectionNum}、雷同片段详情\n\n`
  md += '| 序号 | 左侧文件 | 位置 | 右侧文件 | 位置 |\n'
  md += '|------|----------|------|----------|------|\n'

  for (const segment of segments.value) {
    const leftContent = includeHighlight
      ? (segment.leftContent || '').replace(/<[^>]*>/g, '').replace(/…/g, '').substring(0, 50) + '...'
      : (segment.leftContent || '').replace(/<[^>]*>/g, '').substring(0, 50) + '...'
    const rightContent = includeHighlight
      ? (segment.rightContent || '').replace(/<[^>]*>/g, '').replace(/…/g, '').substring(0, 50) + '...'
      : (segment.rightContent || '').replace(/<[^>]*>/g, '').substring(0, 50) + '...'

    md += `| ${segment.id} | ${leftContent} | ${segment.leftPage || '-'} | ${rightContent} | ${segment.rightPage || '-'} |\n`
  }

  md += '\n---\n\n'
  md += `*报告生成时间：${new Date().toLocaleString()}*\n`

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
  segments.value.forEach(segment => {
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

// 滚动到指定页码对应的内容位置 (已简化，适配片段模式)
const scrollToPage = (page: number) => {
  // 在片段模式下，暂时禁用复杂的滚动定位，仅保留页码状态
  // 如果需要精确定位到某个片段，可以在此扩展逻辑
  console.log('切换到页码:', page)
}

// 是否有上一处差异
const hasPrevDiff = computed(() => {
  return segments.value.length > 0
})

// 是否有下一处差异
const hasNextDiff = computed(() => {
  return segments.value.length > 0
})

// 计算100%相似度的片段数量
const count100Similarity = computed(() => {
  return segments.value.filter(s => s.similarityValue >= 100).length
})

// 计算达到相似度阈值的片段数量
const countThresholdSimilarity = computed(() => {
  const threshold = settings.textSimilarityThreshold || 75
  return segments.value.filter(s => s.similarityValue >= threshold).length
})

// 上一处差异
const goToPrevDiff = () => {
  // TODO: 实现跳转到上一处差异的逻辑
  console.log('上一处差异')
}

// 下一处差异
const goToNextDiff = () => {
  // TODO: 实现跳转到下一处差异的逻辑
  console.log('下一处差异')
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
</script>

<template>
  <div class="result-page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">文件对比结果</h1>
          <p class="page-subtitle">显示文档之间的内容差异、相似片段和统计分析</p>
        </div>
        <div class="header-actions">
          <BorderBeam size="sm" color-variant="ocean" theme="dark" :duration="2">
            <button class="back-btn" @click="handleBack">
              <RiRestartLine class="back-icon" />
              <span class="back-text">返回</span>
            </button>
          </BorderBeam>
          <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
            <button class="export-btn" @click="handleExport">
              <RiSaveLine class="export-icon" />
              <span>导出</span>
            </button>
          </BorderBeam>
        </div>
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
          <BorderBeam size="sm" color-variant="sunset" theme="dark" :duration="2">
            <button class="ai-btn" @click="handleAIAnalysis" :disabled="isLoading">
              <RiSparkling2Fill class="ai-icon" />
              <span>{{ isLoading ? 'AI分析中...' : 'AI分析' }}</span>
            </button>
          </BorderBeam>
          <div class="list-header-stats">
            <div class="stat-badge stat-badge-100">
              <span class="stat-badge-icon">💯</span>
              <span>100%相同：{{ count100Similarity }}个</span>
            </div>
            <div class="stat-badge stat-badge-threshold">
              <span class="stat-badge-icon">🎯</span>
              <span>≥{{ settings.textSimilarityThreshold }}%：{{ countThresholdSimilarity }}个</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 对比数据表 -->
      <div class="data-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col col-index">序号</div>
          <div class="col col-content">{{ leftFileName || '文件A' }}</div>
          <div class="col col-position">位置</div>
          <div class="col col-position">位置</div>
          <div class="col col-content">{{ rightFileName || '文件B' }}</div>
        </div>

        <!-- 表体 -->
        <div class="table-body" v-highlight-tooltip>
          <div v-for="segment in pageSegments" :key="segment.id" class="table-row">
            <div class="col col-index">{{ segment.id }}</div>
            <div class="col col-content clickable" @click="viewContext(segment, 'left')" :title="'点击查看' + leftFileName + '上下文'" v-html="sanitizeWithHighlight(segment.leftContent)"></div>
            <div class="col col-position">{{ segment.leftPage }}</div>
            <div class="col col-position">{{ segment.rightPage }}</div>
            <div class="col col-content clickable" @click="viewContext(segment, 'right')" :title="'点击查看' + rightFileName + '上下文'" v-html="sanitizeWithHighlight(segment.rightContent)"></div>
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
  color: rgba(101, 70, 40, 1);
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

.back-btn:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

.back-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 1);
}

.back-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 1);
  font-family: SourceHanSans-SemiBold;
}

/* 导出按钮 */
.export-btn {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  background-color: rgba(46, 89, 132, 1);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(46, 89, 132, 0.3);
}

.export-btn:hover {
  background-color: rgba(40, 78, 115, 1);
  box-shadow: 0 6px 16px rgba(46, 89, 132, 0.4);
  transform: translateY(-2px);
}

.export-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 1);
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
}

.ai-modal {
  background-color: rgba(248, 244, 233, 1);
  border-radius: 12px;
  width: 700px;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.ai-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
  background-color: rgba(255, 255, 255, 0.5);
}

.ai-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-modal-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.ai-modal-icon {
  font-size: 24px;
  color: rgba(139, 0, 0, 1);
}

.ai-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.8);
  color: rgba(107, 79, 52, 1);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.ai-modal-close:hover {
  background-color: rgba(139, 0, 0, 0.1);
  color: rgba(139, 0, 0, 1);
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
  color: rgba(139, 0, 0, 1);
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
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
}

.ai-result {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Regular;
}

.ai-result h2 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 20px 0 12px 0;
  font-family: SourceHanSans-SemiBold;
}

.ai-result h3 {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 16px 0 10px 0;
  font-family: SourceHanSans-SemiBold;
}

.ai-result li {
  margin: 8px 0;
  padding-left: 16px;
  list-style-type: disc;
}

.ai-result strong {
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.ai-result em {
  font-style: italic;
  color: rgba(107, 79, 52, 1);
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: rgba(255, 255, 255, 1);
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  background-color: rgba(37, 99, 235, 1);
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
  background-color: rgba(148, 163, 184, 1);
  transition: 0.3s;
  border-radius: 9999px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.switch-label {
  font-size: 13px;
  color: rgba(51, 65, 85, 1);
  font-family: SourceHanSans-Medium, sans-serif;
  user-select: none;
  cursor: pointer;
}

/* 字号控制 */
.icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.icon-btn:hover:not(:disabled) {
  background-color: rgba(248, 250, 252, 1);
  border-color: rgba(203, 213, 225, 1);
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
  color: rgba(71, 85, 105, 1);
}

.font-size-display {
  font-size: 14px;
  color: rgba(51, 65, 85, 1);
  font-family: SourceHanSans-Regular, sans-serif;
  min-width: 48px;
  text-align: center;
  padding: 6px 8px;
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 1);
}

/* 右侧页码信息 */
.page-info {
  font-size: 14px;
  color: rgba(51, 65, 85, 1);
  font-family: SourceHanSans-Medium, sans-serif;
  white-space: nowrap;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 对比信息栏 */
.word-info-bar {
  background-color: rgba(255, 255, 255, 1);
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 1) 0%, rgba(29, 78, 216, 1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

.title-icon-wrapper.right-icon {
  background: linear-gradient(135deg, rgba(249, 115, 22, 1) 0%, rgba(234, 88, 12, 1) 100%);
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);
}

.title-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 1);
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-main {
  font-size: 14px;
  font-weight: 600;
  color: rgba(15, 23, 42, 1);
  font-family: SourceHanSans-SemiBold, sans-serif;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-sub {
  font-size: 11px;
  color: rgba(100, 116, 139, 1);
  font-family: SourceHanSans-Regular, sans-serif;
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
  border-radius: 8px;
  background-color: rgba(219, 234, 254, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  font-size: 20px;
  color: rgba(37, 99, 235, 1);
}

.word-file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(15, 23, 42, 1);
  font-family: SourceHanSans-SemiBold, sans-serif;
}

.file-sub-info {
  font-size: 12px;
  color: rgba(100, 116, 139, 1);
  font-family: SourceHanSans-Regular, sans-serif;
}

/* 对比统计徽章 */
.word-comparison-stats {
  display: flex;
  align-items: center;
  gap: 12px;
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

.stat-same {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgba(22, 101, 52, 1);
}

.stat-same .stat-badge-icon {
  color: rgba(34, 197, 94, 1);
}

/* Word 文档预览区 */
.word-document-preview {
  background-color: rgba(255, 255, 255, 1);
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
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
  background-color: rgba(248, 250, 252, 1);
  border-bottom: 1px solid rgba(226, 232, 240, 1);
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
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(71, 85, 105, 1);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: SourceHanSans-Medium, sans-serif;
  transition: all 0.15s;
}

.diff-nav-btn:hover:not(:disabled) {
  background-color: rgba(248, 250, 252, 1);
  border-color: rgba(203, 213, 225, 1);
}

.diff-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.diff-nav-btn.primary {
  background-color: rgba(59, 130, 246, 1);
  border-color: rgba(59, 130, 246, 1);
  color: rgba(255, 255, 255, 1);
}

.diff-nav-btn.primary:hover:not(:disabled) {
  background-color: rgba(29, 78, 216, 1);
  border-color: rgba(29, 78, 216, 1);
}

.diff-nav-icon {
  font-size: 14px;
}

.diff-separator {
  color: rgba(148, 163, 184, 1);
  font-size: 14px;
  padding: 0 4px;
}

/* 文件面板 */
.file-panel {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: rgba(255, 255, 255, 1);
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(248, 250, 252, 1);
  border-bottom: 1px solid rgba(226, 232, 240, 1);
  font-weight: 500;
  color: rgba(55, 65, 81, 1);
  font-size: 14px;
  font-family: SourceHanSans-Medium, sans-serif;
}

.panel-icon {
  font-size: 16px;
  color: rgba(100, 116, 139, 1);
}

/* 悬浮页码指示器 */
.floating-page-indicator {
  position: absolute;
  left: 8px;
  top: 60px;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 6px 10px;
  font-size: 12px;
  color: rgba(100, 116, 139, 1);
  font-family: SourceHanSans-Medium, sans-serif;
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
  color: rgba(31, 41, 55, 1);
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
  background-color: rgba(248, 250, 252, 1);
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
  color: rgba(148, 163, 184, 1);
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  user-select: none;
  flex-shrink: 0;
  border-right: 1px solid rgba(226, 232, 240, 1);
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
  border-left: 1px solid rgba(226, 232, 240, 1);
  margin-right: 0;
  margin-left: 8px;
  text-align: left;
}

/* 相同内容行 */
.file-line.line-same {
  background-color: rgba(34, 197, 94, 0.05);
}

.file-line.line-same .line-number,
.right-line.line-same .right-line-number {
  color: rgba(34, 197, 94, 1);
  border-right-color: rgba(34, 197, 94, 0.3);
  border-left-color: rgba(34, 197, 94, 0.3);
}

/* 新增内容行 */
.file-line.line-added {
  background-color: rgba(59, 130, 246, 0.08);
}

.file-line.line-added .line-number,
.right-line.line-added .right-line-number {
  color: rgba(59, 130, 246, 1);
  border-right-color: rgba(59, 130, 246, 0.3);
  border-left-color: rgba(59, 130, 246, 0.3);
}

/* 删除内容行 */
.file-line.line-deleted {
  background-color: rgba(239, 68, 68, 0.08);
}

.file-line.line-deleted .line-number,
.right-line.line-deleted .right-line-number {
  color: rgba(239, 68, 68, 1);
  border-right-color: rgba(239, 68, 68, 0.3);
  border-left-color: rgba(239, 68, 68, 0.3);
}

.file-line.line-deleted .line-content {
  text-decoration: line-through;
  color: rgba(148, 163, 184, 1);
}

/* 片段块样式 (Word View) */
.segment-block {
  margin-bottom: 20px;
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 1);
  transition: all 0.2s;
}

.segment-block:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: rgba(59, 130, 246, 0.3);
}

.segment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: rgba(248, 250, 252, 1);
  border-bottom: 1px solid rgba(226, 232, 240, 1);
  border-radius: 8px 8px 0 0;
}

.segment-id {
  font-size: 12px;
  font-weight: 600;
  color: rgba(71, 85, 105, 1);
  font-family: SourceHanSans-SemiBold, sans-serif;
}

.segment-score {
  font-size: 12px;
  color: rgba(34, 197, 94, 1);
  font-weight: bold;
  background-color: rgba(34, 197, 94, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.segment-text {
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(31, 41, 55, 1);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(148, 163, 184, 1);
  font-size: 14px;
}

/* 中间连接区域 */
.center-divider {
  position: relative;
  background-color: rgba(248, 250, 252, 1);
  border-left: 1px solid rgba(226, 232, 240, 1);
  border-right: 1px solid rgba(226, 232, 240, 1);
}

.vertical-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: rgba(203, 213, 225, 1);
  transform: translateX(-50%);
}

.horizontal-connection {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(148, 163, 184, 0.3) 20%, 
    rgba(148, 163, 184, 0.3) 80%, 
    transparent 100%
  );
  pointer-events: none;
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

/* 列表头部操作区 */
.list-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* AI分析按钮 */
.list-header-actions .ai-btn {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  font-family: SourceHanSans-SemiBold;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.3);
  white-space: nowrap;
}

.list-header-actions .ai-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.4);
  transform: translateY(-1px);
}

.list-header-actions .ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.list-header-actions .ai-icon {
  font-size: 16px;
  color: rgba(255, 255, 255, 1);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.list-header-actions .ai-btn:hover:not(:disabled) .ai-icon {
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

.stat-badge-100 {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgba(22, 101, 52, 1);
}

.stat-badge-100 .stat-badge-icon {
  color: rgba(34, 197, 94, 1);
}

.stat-badge-threshold {
  background-color: rgba(59, 130, 246, 0.1);
  color: rgba(30, 64, 175, 1);
}

.stat-badge-threshold .stat-badge-icon {
  color: rgba(59, 130, 246, 1);
}

/* Word 预览列表样式 */
.word-list-view {
  width: 100%;
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
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
  border-right: 1px solid rgba(230, 215, 191, 0.5);
}

.similarity-score {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgba(22, 101, 52, 1);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* 确保高亮在 Word 预览列表中生效 */
.word-list-view .col-content :deep(.highlighted-text) {
  background-color: rgba(255, 215, 0, 0.85) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 700 !important;
  display: inline !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.5) !important;
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
  grid-template-columns: 60px 1fr 100px 100px 1fr;
  background-color: rgba(245, 238, 226, 1);
}

.table-header .col {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-SemiBold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(230, 215, 191, 1);
  white-space: nowrap;
}

.table-header .col-content {
  justify-content: flex-start;
  padding-left: 16px;
}

.table-header .col-position {
  border-right: 1px solid rgba(230, 215, 191, 1);
}

/* 表体 */
.table-body {
  overflow: visible;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 1fr 100px 100px 1fr;
  border-bottom: 1px solid rgba(230, 215, 191, 0.5);
  transition: background-color 0.2s;
  min-height: 44px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: rgba(245, 238, 226, 0.5);
}

.table-row .col {
  padding: 8px 12px;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Regular;
  line-height: 1.5;
  /* 确保 grid item 能正确包含子元素 */
  display: flex;
  align-items: stretch;
}

.table-row .col-index {
  justify-content: center;
  align-items: center;
  font-weight: 500;
  color: rgba(166, 124, 82, 1);
}

/* 确保高亮在表格内容中正确显示 */
.table-row .col-content {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.5;
  padding: 6px 12px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  min-height: 32px;
  max-height: 32px;
  /* 使用 flex: 1 填充可用空间 */
  flex: 1;
  display: block;
  position: relative;
  cursor: default;
}

.table-row .col-content :deep(.highlighted-text) {
  background-color: rgba(255, 215, 0, 0.9) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 0 4px !important;
  border-radius: 3px !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: 1.5 !important;
  max-height: 1.5em !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.6) !important;
  /* 截断过长的高亮文本 */
  max-width: 100%;
  position: relative;
  cursor: default;
}

.table-row .col-content :deep(.highlighted-text):hover {
  background-color: rgba(255, 215, 0, 1) !important;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.8) !important;
}

/* 全局高亮样式 - 用于v-html生成的内容 */
.data-table .col-content .highlighted-text {
  background-color: rgba(255, 215, 0, 0.9) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 0 4px !important;
  border-radius: 3px !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: 1.5 !important;
  max-height: 1.5em !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.6) !important;
  max-width: 100%;
  position: relative;
  cursor: default;
  transition: all 0.2s ease;
}

.data-table .col-content .highlighted-text:hover {
  background-color: rgba(255, 215, 0, 1) !important;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.8) !important;
}

.table-row .col-position {
  justify-content: center;
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  border-right: 1px solid rgba(230, 215, 191, 0.3);
}

.col-content.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.col-content.clickable:hover {
  background-color: rgba(255, 215, 0, 0.15);
}

/* 图片雷同检测 */
.image-duplicate-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
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
  background: rgba(46, 89, 132, 0.1);
  color: rgba(46, 89, 132, 1);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
}

.image-duplicate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 16px 20px;
}

.image-duplicate-card {
  border: 1px solid rgba(166, 124, 82, 0.15);
  border-radius: 8px;
  padding: 12px;
  background: rgba(248, 244, 233, 0.3);
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
  color: rgba(101, 70, 40, 0.6);
  font-weight: 500;
}

.image-duplicate-img {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid rgba(166, 124, 82, 0.1);
}

.image-name {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
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
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  font-family: SourceHanSans-Bold;
}

.context-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(44, 24, 16, 0.3);
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
  background: rgba(245, 238, 226, 0.6);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(101, 70, 40, 1);
}

.context-segment-id {
  font-weight: 600;
  color: rgba(196, 30, 58, 1);
}

.context-pre {
  font-family: 'Microsoft YaHei', 'SourceHanSans', monospace;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  color: rgba(44, 24, 16, 1);
  background: rgba(248, 244, 233, 0.3);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.1);
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
    -webkit-overflow-scrolling: touch;
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

  /* 分页按钮最小触摸目标 */
  .page-btn {
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
}

/* 超小屏幕手机优化 (320px-480px) */
@media (max-width: 480px) {
  .result-page-container {
    padding: 12px;
  }

  .comparison-list {
    padding: 12px;
  }

  .table-header,
  .table-row {
    font-size: 11px;
  }

  .page-btn {
    width: 44px;
    height: 44px;
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
</style>
