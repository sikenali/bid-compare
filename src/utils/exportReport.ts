import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType, VerticalAlign, TableLayoutType } from 'docx'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import type { SimilarSegment } from '../utils/textAlgorithms'
import { htmlToMarkdown } from './sanitize'

// 颜色常量
const COLORS = {
  primary: 'C0392B',      // 主色调（朱红）
  primaryLight: 'E74C3C', // 浅红
  accent: 'F39C12',       // 强调色（橙）
  text: '333333',         // 正文
  textLight: '666666',    // 浅色文字
  textMuted: '999999',    // 弱化文字
  border: 'E0D5C1',       // 边框
  borderLight: 'F0E6D2',  // 浅边框
  bgHeader: 'F5EEE2',     // 表头背景
  bgRowEven: 'FAF7F2',    // 偶数行背景
  bgRowOdd: 'FFFFFF',     // 奇数行背景
  highlight: 'FFF3CD',    // 高亮背景
  success: '27AE60',      // 成功色
  warning: 'F39C12',      // 警告色
}

// 字体常量
const FONTS = {
  title: 'Microsoft YaHei',
  body: 'Microsoft YaHei',
  mono: 'Consolas',
}

// 页面设置
const PAGE = {
  margin: 72,  // 1 inch = 72 points
  width: 850,  // A4 width in points
  height: 1100, // A4 height in points
}

export interface ExportOptions {
  includeHighlight?: boolean
  includeCharts?: boolean
  exportFormat?: 'word' | 'pdf' | 'md'
}

export interface ExportData {
  leftFileName: string
  rightFileName: string
  textSimilarity: string
  similarSegmentsCount: number
  segments: SimilarSegment[]
  visibleSegments: SimilarSegment[]
  clauseRemovedCount?: number
}

/**
 * 生成 Word 报告
 */
export function generateWordReport(data: ExportData, options: ExportOptions = {}): Document {
  const { includeHighlight = true, includeCharts = false } = options
  const { leftFileName, rightFileName, textSimilarity, similarSegmentsCount, segments, visibleSegments, clauseRemovedCount } = data

  const children: any[] = []

  // 封面标题
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '文件对比报告', bold: true, size: 40, font: FONTS.title, color: COLORS.primary })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'File Comparison Report', size: 24, font: FONTS.title, color: COLORS.textMuted, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    })
  )

  // 基本信息表格
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '报告生成时间', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleString('zh-CN'), size: 20, font: FONTS.body, color: COLORS.text })], alignment: AlignmentType.CENTER })],
            width: { size: 70, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '左侧文件', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: leftFileName || '-', size: 20, font: FONTS.body, color: COLORS.text })], alignment: AlignmentType.CENTER })],
            width: { size: 70, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '右侧文件', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rightFileName || '-', size: 20, font: FONTS.body, color: COLORS.text })], alignment: AlignmentType.CENTER })],
            width: { size: 70, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      })
    ]
  })

  children.push(
    new Paragraph({
      children: [new TextRun({ text: '一、基本信息', bold: true, size: 28, font: FONTS.title, color: COLORS.primary })],
      spacing: { before: 400, after: 200 }
    }),
    infoTable
  )

  // 统计信息
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '二、相似度统计', bold: true, size: 28, font: FONTS.title, color: COLORS.primary })],
      spacing: { before: 400, after: 200 }
    }),
    createStatCard('文本重复率', textSimilarity, COLORS.primary),
    createStatCard('雷同片段数', `${similarSegmentsCount} 处`, COLORS.accent),
    clauseRemovedCount ? createStatCard('已剔除相同条款', `${clauseRemovedCount} 条`, COLORS.success) : null
  ).filter(Boolean)

  // 统计表格（如果开启）
  if (includeCharts) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '三、详细统计', bold: true, size: 28, font: FONTS.title, color: COLORS.primary })],
        spacing: { before: 400, after: 200 }
      }),
      createStatTable(leftFileName, rightFileName, textSimilarity, similarSegmentsCount)
    )
  }

  // 雷同片段详情
  const detailSection = includeCharts ? '四' : '三'
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${detailSection}、雷同片段详情`, bold: true, size: 28, font: FONTS.title, color: COLORS.primary })],
      spacing: { before: 400, after: 200 }
    })
  )

  // 详情表格
  const detailRows: any[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '序号', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
          shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
          width: { size: 8, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '原始版本', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
          shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
          width: { size: 34, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '页码', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
          shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '修订版本', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
          shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
          width: { size: 34, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '页码', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
          shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER
        })
      ]
    })
  ]

  // 添加数据行
  visibleSegments.forEach((segment, index) => {
    const rowBg = index % 2 === 0 ? COLORS.bgRowEven : COLORS.bgRowOdd
    const leftRuns = includeHighlight 
      ? parseHighlightedContent(segment.leftContent)
      : [new TextRun({ text: segment.leftContent.replace(/<[^>]*>/g, ''), size: 18, font: FONTS.body, color: COLORS.text })]
    const rightRuns = includeHighlight 
      ? parseHighlightedContent(segment.rightContent)
      : [new TextRun({ text: segment.rightContent.replace(/<[^>]*>/g, ''), size: 18, font: FONTS.body, color: COLORS.text })]

    detailRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.id.toString(), size: 18, font: FONTS.body, color: COLORS.textMuted })], alignment: AlignmentType.CENTER })],
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            width: { size: 8, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: leftRuns })],
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            width: { size: 34, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.leftPage, size: 16, font: FONTS.mono, color: COLORS.textMuted })], alignment: AlignmentType.CENTER })],
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: rightRuns })],
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            width: { size: 34, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: segment.rightPage, size: 16, font: FONTS.mono, color: COLORS.textMuted })], alignment: AlignmentType.CENTER })],
            shading: { fill: rowBg, type: ShadingType.CLEAR },
            width: { size: 12, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      })
    )
  })

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      },
      rows: detailRows
    })
  )

  // 页脚
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `报告由 文比猩 生成于 ${new Date().toLocaleString('zh-CN')}`, size: 16, font: FONTS.body, color: COLORS.textMuted, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 }
    })
  )

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: PAGE.margin,
            right: PAGE.margin,
            bottom: PAGE.margin,
            left: PAGE.margin,
          }
        }
      },
      children
    }]
  })
}

/**
 * 生成 Markdown 报告
 */
export function generateMarkdownReport(data: ExportData, options: ExportOptions = {}): string {
  const { leftFileName, rightFileName, textSimilarity, similarSegmentsCount, segments, visibleSegments, clauseRemovedCount } = data
  
  let md = ''

  // 报告标题
  md += '# 文件对比报告\n\n'
  md += `> **文比猩 文件对比工具**\n`
  md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`

  md += '---\n\n'

  // 基本信息
  md += '## 一、基本信息\n\n'
  md += `| 项目 | 内容 |\n`
  md += `|------|------|\n`
  md += `| 左侧文件 | ${leftFileName || '-'} |\n`
  md += `| 右侧文件 | ${rightFileName || '-'} |\n\n`

  // 统计信息
  md += '## 二、相似度统计\n\n'
  md += `| 指标 | 数值 |\n`
  md += `|------|------|\n`
  md += `| 文本重复率 | **${textSimilarity}** |\n`
  md += `| 雷同片段 | **${similarSegmentsCount} 处** |\n`
  if (clauseRemovedCount) {
    md += `| 已剔除相同条款 | ${clauseRemovedCount} 条 |\n`
  }
  md += `\n---\n\n`

  // 雷同片段总览
  md += '## 三、雷同片段总览\n\n'
  md += `| 序号 | 原始版本（摘要） | 页码 | 修订版本（摘要） | 页码 |\n`
  md += `|------|------------------|------|------------------|------|\n`

  for (const segment of visibleSegments) {
    const leftBrief = htmlToMarkdown(segment.leftContent || '').replace(/…/g, '').substring(0, 50).replace(/\s+/g, ' ').trim()
    const rightBrief = htmlToMarkdown(segment.rightContent || '').replace(/…/g, '').substring(0, 50).replace(/\s+/g, ' ').trim()

    md += `| ${segment.id} | ${leftBrief || '-'} | ${segment.leftPage || '-'} | ${rightBrief || '-'} | ${segment.rightPage || '-'} |\n`
  }

  md += `\n---\n\n`

  // 详细对比
  md += '## 四、雷同片段详情\n\n'

  for (const segment of visibleSegments) {
    const leftClean = htmlToMarkdown(segment.leftContent || '')
    const rightClean = htmlToMarkdown(segment.rightContent || '')

    md += `### 第 ${segment.id} 段\n\n`
    md += `| 项目 | 内容 |\n`
    md += `|------|------|\n`
    md += `| 原始版本页码 | ${segment.leftPage || '-'} |\n`
    md += `| 修订版本页码 | ${segment.rightPage || '-'} |\n\n`
    md += `**原始版本：**\n\n`
    md += leftClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
    md += `**修订版本：**\n\n`
    md += rightClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
    md += '---\n\n'
  }

  md += `*报告由 文比猩 生成于 ${new Date().toLocaleString('zh-CN')}*\n`

  return md
}

/**
 * 生成 PDF 报告（使用 html2canvas + jsPDF）
 */
export async function generatePdfReport(elementId: string, data: ExportData, options: ExportOptions = {}): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('导出元素未找到')
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF'
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const imgWidth = 190
  const pageHeight = 297
  const pageWidth = 210
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  const leftName = (data.leftFileName || 'file1').replace(/\.[^/.]+$/, '')
  const rightName = (data.rightFileName || 'file2').replace(/\.[^/.]+$/, '')
  const fileName = `${leftName}vs${rightName}-文件对比报告.pdf`
  
  pdf.save(fileName)
}

/**
 * 解析高亮 HTML，返回带高亮标记的 TextRun 数组
 */
function parseHighlightedContent(htmlContent: string): any[] {
  let content = htmlContent.replace(/^…/, '').replace(/…$/, '')

  const runs: any[] = []
  const highlightRegex = /<span class="highlighted-text">([\s\S]*?)<\/span>/g
  let lastIndex = 0
  let match

  while ((match = highlightRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const plainText = content.substring(lastIndex, match.index)
      const decodedText = plainText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      runs.push(new TextRun({ text: decodedText, size: 18, font: FONTS.body, color: COLORS.text }))
    }
    runs.push(new TextRun({ 
      text: match[1], 
      size: 18, 
      font: FONTS.body, 
      color: COLORS.primary,
      bold: true,
      shading: { fill: COLORS.highlight, type: ShadingType.CLEAR }
    }))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    const plainText = content.substring(lastIndex)
    const decodedText = plainText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    runs.push(new TextRun({ text: decodedText, size: 18, font: FONTS.body, color: COLORS.text }))
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '', size: 18, font: FONTS.body, color: COLORS.text })]
}

/**
 * 创建统计卡片
 */
function createStatCard(title: string, value: string, color: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${title}：`, size: 22, font: FONTS.body, color: COLORS.textLight }),
      new TextRun({ text: value, size: 24, font: FONTS.title, color, bold: true })
    ],
    spacing: { after: 100 }
  })
}

/**
 * 创建统计表格
 */
function createStatTable(leftFileName: string, rightFileName: string, textSimilarity: string, similarSegmentsCount: number): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '统计项', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: leftFileName || '-', size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: rightFileName || '-', size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            shading: { fill: COLORS.bgHeader, type: ShadingType.CLEAR },
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '文本重复率', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: textSimilarity, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: textSimilarity, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '雷同片段数', bold: true, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${similarSegmentsCount} 处`, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${similarSegmentsCount} 处`, size: 20, font: FONTS.body })], alignment: AlignmentType.CENTER })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      })
    ]
  })
}

/**
 * 下载文件
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}