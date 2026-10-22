import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign,
  HeadingLevel, LevelFormat, convertInchesToTwip, PageNumber, PageBreak
} from 'docx'
import { jsPDF } from 'jspdf'
import type { SimilarSegment } from '../utils/textAlgorithms'
import { htmlToMarkdown } from './sanitize'

// ─── 品牌色 ────────────────────────────────────────────────────────────────
const C = {
  red:       'C0392B',   // 朱红主色
  redSoft:   'FBE9E7',   // 浅红背景
  gold:      'D4A030',   // 鎏金强调
  goldSoft:  'FFF8E1',   // 浅金背景
  jade:      '4E9B7A',   // 玉绿
  jadeSoft:  'E8F5E9',   // 浅绿背景
  ink:       '1F1D1A',   // 墨黑
  gray:      '6E6A60',   // 次要文本
  muted:     '8A8578',   // 弱化文本
  border:    'E0D5C1',   // 边框
  rowEven:   'FAF7F2',   // 偶数行
  rowOdd:    'FFFFFF',   // 奇数行
  headerBg:  'F5EEE2',   // 表头背景
  highlight: 'FFF3CD',   // 高亮底色
}

// ─── 字体 ──────────────────────────────────────────────────────────────────
const F = {
  title: 'Microsoft YaHei',
  body:  'Microsoft YaHei',
  mono:  'Source Han Sans SC',
}

// ─── 页面尺寸（A4 点，1pt = 1/72in）────────────────────────────────────────
const W = 1191   // A4 width in points
const H = 1684   // A4 height in points
const M = 72     // margin 1 inch

// ─── 公共 ──────────────────────────────────────────────────────────────────
const fmtDate = () => new Date().toLocaleString('zh-CN', { hour12: false })

function h2(title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 28, font: F.title, color: C.red })],
    spacing: { before: 360, after: 180 },
    heading: HeadingLevel.HEADING_2,
  })
}

function h3(title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 24, font: F.title, color: C.ink })],
    spacing: { before: 240, after: 120 },
    heading: HeadingLevel.HEADING_3,
  })
}

function p(text: string, opts: { color?: string; bold?: boolean; size?: number; align?: AlignmentType; italics?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      color: opts.color || C.ink,
      bold: opts.bold || false,
      size: opts.size || 22,
      italics: opts.italics || false,
      font: F.body,
    })],
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { after: 120 },
  })
}

function brk(): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 100, after: 100 } })
}

function sep(): Paragraph {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border } },
    spacing: { before: 80, after: 80 },
  })
}

/** 带水印章段落（灰色斜体） */
function watermarkLine(): Paragraph {
  return p('文比星 · 内部对比报告', { color: C.muted, italics: true, size: 18, align: AlignmentType.CENTER })
}

function makeCell(label: string, value: string, labelBg = C.headerBg): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: value, size: 20, font: F.body, color: C.ink })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { fill: labelBg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 70, type: WidthType.PERCENTAGE },
  })
}

function labelCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 20, font: F.body })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { fill: C.headerBg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 30, type: WidthType.PERCENTAGE },
  })
}

function tableBorders() {
  const s = { style: BorderStyle.SINGLE, size: 4, color: C.border } as const
  return {
    top: s, bottom: s, left: s, right: s,
    insideHorizontal: s, insideVertical: { style: BorderStyle.NONE },
  }
}

/** 解析高亮 HTML → TextRun[] */
function hlRuns(html: string): TextRun[] {
  const content = (html || '').replace(/^…/, '').replace(/…$/, '')
  const runs: TextRun[] = []
  const re = /<span class="highlighted-text">([\s\S]*?)<\/span>/g
  let last = 0, m
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      const t = content.slice(last, m.index)
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&quot;/g,'"').replace(/&#039;/g,"'")
      runs.push(new TextRun({ text: t, size: 20, font: F.body, color: C.ink }))
    }
    runs.push(new TextRun({
      text: m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
               .replace(/&quot;/g,'"').replace(/&#039;/g,"'"),
      size: 20, font: F.body, color: C.red, bold: true,
      shading: { fill: C.highlight, type: ShadingType.CLEAR },
    }))
    last = m.index + m[0].length
  }
  if (last < content.length) {
    const t = content.slice(last)
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#039;/g,"'")
    runs.push(new TextRun({ text: t, size: 20, font: F.body, color: C.ink }))
  }
  return runs.length ? runs : [new TextRun({ text: '', size: 20 })]
}

// ──────────────────────────────────────────────────────────────────────────
// ExportData / ExportOptions
// ──────────────────────────────────────────────────────────────────────────
export interface ExportOptions {
  includeHighlight?: boolean
  includeCharts?: boolean
  exportFormat?: 'word' | 'pdf' | 'md'
  watermark?: boolean
}

export interface ExportData {
  leftFileName:  string
  rightFileName: string
  textSimilarity: string
  similarSegmentsCount: number
  segments: SimilarSegment[]
  visibleSegments: SimilarSegment[]
  clauseRemovedCount?: number
  leftTotalPages?: number
  rightTotalPages?: number
}

// ──────────────────────────────────────────────────────────────────────────
// Word 报告
// ──────────────────────────────────────────────────────────────────────────
export function generateWordReport(data: ExportData, opts: ExportOptions = {}): Document {
  const { includeHighlight = true, includeCharts = false, watermark = true } = opts
  const { leftFileName, rightFileName, textSimilarity, similarSegmentsCount, visibleSegments, clauseRemovedCount, leftTotalPages, rightTotalPages } = data
  const children: any[] = []
  const now = fmtDate()

  // ── 封面 ──────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [], spacing: { before: 600 } }))
  children.push(p('文比星', { color: C.red, bold: true, size: 44, align: AlignmentType.CENTER }))
  children.push(p('文件对比报告', { color: C.red, bold: true, size: 56, align: AlignmentType.CENTER }))
  children.push(p('Bid Comparison Report', { color: C.muted, size: 24, align: AlignmentType.CENTER, italics: true }))
  children.push(brk())
  if (watermark) children.push(watermarkLine())
  children.push(brk())

  // ── 一、基本信息 ─────────────────────────────────────────────────────
  children.push(h2('一、基本信息'))
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: [
      new TableRow({ children: [labelCell('报告生成时间'), makeCell(now)] }),
      new TableRow({ children: [labelCell('左侧文件'), makeCell(leftFileName || '-')] }),
      new TableRow({ children: [labelCell('右侧文件'), makeCell(rightFileName || '-')] }),
      leftTotalPages  && new TableRow({ children: [labelCell('左侧页数'), makeCell(String(leftTotalPages))] }),
      rightTotalPages && new TableRow({ children: [labelCell('右侧页数'), makeCell(String(rightTotalPages))] }),
    ].filter(Boolean),
  }))

  // ── 二、相似度统计 ───────────────────────────────────────────────────
  children.push(h2('二、相似度统计'))
  const statItems: any[] = [
    p(`文本重复率：${textSimilarity}`, { bold: true, size: 24, color: C.red }),
    p(`雷同片段：${similarSegmentsCount} 处`, { size: 24, color: C.gold }),
  ]
  if (clauseRemovedCount) {
    statItems.push(p(`已剔除相同条款：${clauseRemovedCount} 条`, { size: 24, color: C.jade }))
  }
  statItems.forEach(item => children.push(item))

  // ── 三、详细统计（可选）──────────────────────────────────────────────
  const detailNum = includeCharts ? '四' : '三'
  if (includeCharts) {
    children.push(h2('三、详细统计'))
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({ children: [
          labelCell('统计项'),
          makeCell(leftFileName || '-'),
          makeCell(rightFileName || '-'),
        ]}),
        new TableRow({ children: [
          labelCell('文本重复率'),
          makeCell(textSimilarity),
          makeCell(textSimilarity),
        ]}),
        new TableRow({ children: [
          labelCell('雷同片段数'),
          makeCell(`${similarSegmentsCount} 处`),
          makeCell(`${similarSegmentsCount} 处`),
        ]}),
      ],
    }))
  }

  // ── 雷同片段详情 ────────────────────────────────────────────────────
  children.push(h2(`${detailNum}、雷同片段详情`))

  // 表头
  const hdrRow = new TableRow({
    children: [
      cellHdr('序号', 7),
      cellHdr('原始版本', 34),
      cellHdr('页码', 10),
      cellHdr('相似度', 9),
      cellHdr('修订版本', 34),
      cellHdr('页码', 6),
    ],
  })

  const rows = [hdrRow]
  visibleSegments.forEach((seg, i) => {
    const bg = i % 2 === 0 ? C.rowEven : C.rowOdd
    const simColor = seg.similarityValue >= 95 ? C.jade : seg.similarityValue >= 80 ? C.gold : C.red
    rows.push(new TableRow({
      children: [
        cellBody(String(seg.id), bg, { center: true, muted: true }),
        cellBody(null, bg, { highlight: true, src: seg.leftContent }),
        cellBody(seg.leftPage || '-', bg, { center: true, muted: true }),
        cellBody(`${seg.similarityValue}%`, bg, { center: true, color: simColor, bold: true }),
        cellBody(null, bg, { highlight: true, src: seg.rightContent }),
        cellBody(seg.rightPage || '-', bg, { center: true, muted: true }),
      ],
    }))
  })

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows,
  }))

  // ── 页脚 ────────────────────────────────────────────────────────────
  children.push(brk())
  children.push(p(`报告由 文比星 生成于 ${now}`, { color: C.muted, size: 16, align: AlignmentType.CENTER, italics: true }))

  return new Document({
    styles: {
      default: { document: { run: { font: F.body, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: F.title, color: C.red },
          paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: F.title, color: C.ink },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: W, height: H },
          margin: { top: M, right: M, bottom: M, left: M },
        },
      },
      headers: {
        default: new Paragraph({
          children: [
            new TextRun({ text: '文比星  文件对比报告', size: 16, color: C.muted, font: F.body }),
            new TextRun({ text: '  ·  ', size: 16, color: C.muted }),
            new TextRun({ text: '第 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.muted }),
            new TextRun({ text: ' 页', size: 16, color: C.muted }),
          ],
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
        }),
      },
      footers: {
        default: new Paragraph({
          children: [
            new TextRun({ text: '本报告由 文比星 自动生成  ·  ', size: 16, color: C.muted }),
            new TextRun({ text: '第 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.muted }),
            new TextRun({ text: ' 页 / 共 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: C.muted }),
            new TextRun({ text: ' 页', size: 16, color: C.muted }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
        }),
      },
      children,
    }],
  })
}

// ──────────────────────────────────────────────────────────────────────────
// 辅助：表格单元格
// ──────────────────────────────────────────────────────────────────────────
function cellHdr(text: string, w: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 20, font: F.body, color: C.ink })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { fill: C.headerBg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: w, type: WidthType.PERCENTAGE },
  })
}

function cellBody(
  rawText: string | null,
  bg: string,
  opts: { center?: boolean; muted?: boolean; color?: string; bold?: boolean; highlight?: boolean; src?: string } = {}
): TableCell {
  let children: any
  if (opts.highlight && opts.src) {
    children = [new Paragraph({ children: hlRuns(opts.src), spacing: { after: 0 } })]
  } else {
    const txt = rawText || ''
    children = [new Paragraph({
      children: [new TextRun({
        text: txt,
        size: 20,
        font: F.body,
        color: opts.muted ? C.muted : (opts.color || C.ink),
        bold: opts.bold || false,
      })],
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0 },
    })]
  }
  return new TableCell({
    children,
    shading: { fill: bg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 34, type: WidthType.PERCENTAGE },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Markdown 报告
// ──────────────────────────────────────────────────────────────────────────
export function generateMarkdownReport(data: ExportData, _opts: ExportOptions = {}): string {
  const { leftFileName, rightFileName, textSimilarity, similarSegmentsCount, visibleSegments, clauseRemovedCount } = data
  const lines: string[] = []
  const add = (s = '') => lines.push(s)

  add('# 文件对比报告')
  add('')
  add(`> **文比星** 文件对比工具  ·  ${fmtDate()}`)
  add('')
  add('---')
  add('')

  // 基本信息
  add('## 一、基本信息')
  add('')
  add('| 项目 | 内容 |')
  add('|------|------|')
  add(`| 左侧文件 | ${leftFileName || '-'} |`)
  add(`| 右侧文件 | ${rightFileName || '-'} |`)
  add(`| 生成时间 | ${fmtDate()} |`)
  add('')

  // 统计
  add('## 二、相似度统计')
  add('')
  add('| 指标 | 数值 |')
  add('|------|------|')
  add(`| 文本重复率 | **${textSimilarity}** |`)
  add(`| 雷同片段 | **${similarSegmentsCount} 处** |`)
  if (clauseRemovedCount) add(`| 已剔除相同条款 | ${clauseRemovedCount} 条 |`)
  add('')
  add('---')
  add('')

  // 片段总览
  add('## 三、雷同片段总览')
  add('')
  add('| # | 原始版本（摘要） | 页码 | 相似度 | 修订版本（摘要） | 页码 |')
  add('|:-:|------------------|------|:------:|------------------|------|')
  for (const s of visibleSegments) {
    const lb = (s.leftContent || '').replace(/<[^>]+>/g, '').replace(/…/g, '').slice(0, 40).trim()
    const rb = (s.rightContent || '').replace(/<[^>]+>/g, '').replace(/…/g, '').slice(0, 40).trim()
    add(`| ${s.id} | ${lb || '-'} | ${s.leftPage || '-'} | ${s.similarityValue}% | ${rb || '-'} | ${s.rightPage || '-'} |`)
  }
  add('')
  add('---')
  add('')

  // 详情
  add('## 四、雷同片段详情')
  add('')
  for (const s of visibleSegments) {
    const lc = htmlToMarkdown(s.leftContent || '').replace(/\n{3,}/g, '\n\n').trim()
    const rc = htmlToMarkdown(s.rightContent || '').replace(/\n{3,}/g, '\n\n').trim()
    add(`### ${s.id}. 相似度 ${s.similarityValue}%  ·  ${s.leftPage || '-'} ↔ ${s.rightPage || '-'}`)
    add('')
    add('**左侧原文：**')
    add('')
    add(lc || '-')
    add('')
    add('**修订版本：**')
    add('')
    add(rc || '-')
    add('')
    add('---')
    add('')
  }

  add('*报告由 **文比星** 自动生成于 ' + fmtDate() + '*')
  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────
// PDF 报告（原生 jsPDF，不依赖 html2canvas）
// ──────────────────────────────────────────────────────────────────────────
export async function generatePdfReport(data: ExportData, opts: ExportOptions = {}): Promise<Blob> {
  const { includeHighlight = true, includeCharts = false } = opts
  const { leftFileName, rightFileName, textSimilarity, similarSegmentsCount, visibleSegments, clauseRemovedCount } = data
  const now = fmtDate()

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()   // 210
  const ph = pdf.internal.pageSize.getHeight()   // 297
  const margin = 15
  const cw = pw - 2 * margin                       // 内容宽 180mm
  let y = margin

  const pageBottom = ph - margin
  const sectionGap = 8
  const lineH = 5.5

  // ── 辅助 ────────────────────────────────────────────────────────────
  const addPageIfNeed = (needH: number) => {
    if (y + needH > pageBottom) { pdf.addPage(); y = margin }
  }
  const drawLine = () => {
    addPageIfNeed(2)
    pdf.setDrawColor(0xE0, 0xD5, 0xC1)
    pdf.line(margin, y, pw - margin, y)
    y += 4
  }
  const drawSectionTitle = (text: string) => {
    addPageIfNeed(lineH * 2)
    pdf.setTextColor(0xC0, 0x39, 0x2B)
    pdf.setFontSize(14)
    pdf.setFont('helvetica')
    pdf.text(text, margin, y)
    y += lineH * 1.8
  }
  const drawRow = (labels: [string, string][], wPcts: number[]) => {
    addPageIfNeed(lineH * 1.5)
    const colW = cw * wPcts.reduce((a, b) => a + b, 0) / 100
    let x = margin
    labels.forEach(([label, val], i) => {
      const bw = cw * wPcts[i] / 100
      pdf.setDrawColor(0xE0, 0xD5, 0xC1)
      pdf.rect(x, y, bw, lineH * 1.2)
      pdf.setFontSize(9)
      pdf.setTextColor(0x33, 0x33, 0x33)
      pdf.text(val, x + 2, y + lineH * 0.75, { align: 'center' })
      x += bw
    })
    y += lineH * 1.3
  }
  const drawDetailRow = (idx: number, seg: SimilarSegment) => {
    addPageIfNeed(lineH * 5)
    const bg = idx % 2 === 0 ? [0xFA, 0xF7, 0xF2] : [0xFF, 0xFF, 0xFF]
    pdf.setFillColor(...bg)
    const rw = cw
    pdf.rect(margin, y, rw, lineH * 4.2, 'F')
    pdf.setFontSize(8)
    pdf.setTextColor(0x33, 0x33, 0x33)
    // 序号
    pdf.text(String(seg.id), margin + 2, y + lineH * 0.6)
    // 左内容（截断长文本）
    const leftText = (seg.leftContent || '').replace(/<[^>]+>/g, '').slice(0, 60)
    pdf.setFont('helvetica')
    pdf.text(leftText, margin + 12, y + lineH * 0.6, { maxWidth: rw * 0.4 })
    // 页码
    pdf.setFontSize(7)
    pdf.setTextColor(0x8A, 0x85, 0x78)
    pdf.text(seg.leftPage || '-', margin + 12, y + lineH * 1.5, { maxWidth: rw * 0.15 })
    // 相似度
    const simColor = seg.similarityValue >= 95 ? [0x4E, 0x9B, 0x7A] : seg.similarityValue >= 80 ? [0xD4, 0xA0, 0x30] : [0xC0, 0x39, 0x2B]
    pdf.setTextColor(...simColor)
    pdf.setFontSize(8)
    pdf.text(`${seg.similarityValue}%`, margin + 12 + rw * 0.42, y + lineH * 0.6, { align: 'center' })
    // 右内容
    pdf.setTextColor(0x33, 0x33, 0x33)
    const rightText = (seg.rightContent || '').replace(/<[^>]+>/g, '').slice(0, 60)
    pdf.text(rightText, margin + 12 + rw * 0.52, y + lineH * 0.6, { maxWidth: rw * 0.35 })
    pdf.setFontSize(7)
    pdf.setTextColor(0x8A, 0x85, 0x78)
    pdf.text(seg.rightPage || '-', margin + 12 + rw * 0.52, y + lineH * 1.5, { maxWidth: rw * 0.15 })
    y += lineH * 4.4
  }

  // ── 封面 ────────────────────────────────────────────────────────────
  pdf.setTextColor(0xC0, 0x39, 0x2B)
  pdf.setFontSize(22)
  pdf.setFont('helvetica')
  pdf.text('文件对比报告', pw / 2, ph / 2 - 30, { align: 'center' })
  pdf.setFontSize(11)
  pdf.setTextColor(0x8A, 0x85, 0x78)
  pdf.text(`文比星  ·  ${now}`, pw / 2, ph / 2, { align: 'center' })
  pdf.text('Bid Comparison Report', pw / 2, ph / 2 + 12, { align: 'center' })

  // ── 一、基本信息 ────────────────────────────────────────────────────
  pdf.addPage()
  y = margin
  drawSectionTitle('一、基本信息')
  drawRow([
    ['报告生成时间', now],
    ['左侧文件', leftFileName || '-'],
    ['右侧文件', rightFileName || '-'],
  ], [35, 65])

  // ── 二、相似度统计 ──────────────────────────────────────────────────
  drawSectionTitle('二、相似度统计')
  addPageIfNeed(lineH * 3)
  pdf.setFontSize(11)
  pdf.setTextColor(0xC0, 0x39, 0x2B)
  pdf.text(`文本重复率：${textSimilarity}`, margin, y)
  y += lineH
  pdf.setTextColor(0xD4, 0xA0, 0x30)
  pdf.text(`雷同片段：${similarSegmentsCount} 处`, margin, y)
  y += lineH
  if (clauseRemovedCount) {
    pdf.setTextColor(0x4E, 0x9B, 0x7A)
    pdf.text(`已剔除相同条款：${clauseRemovedCount} 条`, margin, y)
    y += lineH
  }

  // ── 三、雷同片段详情 ────────────────────────────────────────────────
  drawSectionTitle('三、雷同片段详情')
  // 表头
  addPageIfNeed(lineH * 1.5)
  pdf.setFillColor(0xF5, 0xEE, 0xE2)
  pdf.rect(margin, y, cw, lineH * 1.2, 'F')
  pdf.setFontSize(8)
  pdf.setTextColor(0x1F, 0x1D, 0x1A)
  pdf.text('#', margin + 2, y + lineH * 0.7)
  pdf.text('原始版本', margin + 14, y + lineH * 0.7)
  pdf.text('页码', margin + 70, y + lineH * 0.7, { align: 'center' })
  pdf.text('相似度', margin + 85, y + lineH * 0.7, { align: 'center' })
  pdf.text('修订版本', margin + 105, y + lineH * 0.7)
  pdf.text('页码', margin + cw - 12, y + lineH * 0.7, { align: 'center' })
  y += lineH * 1.3

  visibleSegments.forEach((seg, i) => drawDetailRow(i, seg))

  // ── 页脚 ────────────────────────────────────────────────────────────
  addPageIfNeed(lineH * 2)
  pdf.setTextColor(0x8A, 0x85, 0x78)
  pdf.setFontSize(8)
  pdf.text(`报告由 文比星 生成于 ${now}`, pw / 2, y, { align: 'center' })

  return pdf.output('blob')
}

// ──────────────────────────────────────────────────────────────────────────
// 属性检查导出
// ──────────────────────────────────────────────────────────────────────────
export interface PropertyDetail {
  name: string
  leftValue: string
  rightValue: string
  status: 'match' | 'mismatch' | 'warning'
}

export interface PropertyExportData {
  leftFileName: string
  rightFileName: string
  matchCount: number
  mismatchCount: number
  warningCount: number
  propertyDetails: PropertyDetail[]
  similarity?: string
}

/** 状态色 */
const propStatusColor = (s: PropertyDetail['status']) =>
  s === 'match' ? C.jade : s === 'mismatch' ? C.red : C.gold

const propStatusLabel = (s: PropertyDetail['status']) =>
  s === 'match' ? '匹配' : s === 'mismatch' ? '不匹配' : '存疑'

export function generatePropertyWordReport(data: PropertyExportData): Document {
  const { leftFileName, rightFileName, matchCount, mismatchCount, warningCount, propertyDetails } = data
  const now = fmtDate()
  const children: any[] = []

  // ── 封面 ──
  children.push(new Paragraph({ children: [], spacing: { before: 400 } }))
  children.push(p('文比星', { color: C.red, bold: true, size: 40, align: AlignmentType.CENTER }))
  children.push(p('属性对比报告', { color: C.red, bold: true, size: 52, align: AlignmentType.CENTER }))
  children.push(p('Property Check Report', { color: C.muted, size: 22, align: AlignmentType.CENTER, italics: true }))
  children.push(brk())
  if (data.warningCount > 0 || data.mismatchCount > 0) children.push(watermarkLine())
  children.push(brk())

  // ── 一、统计概览 ──
  children.push(h2('一、统计概览'))
  children.push(
    p(`匹配属性：${matchCount} 项`, { size: 24, color: C.jade }),
    p(`不匹配属性：${mismatchCount} 项`, { size: 24, color: C.red }),
    data.warningCount ? p(`存疑属性：${warningCount} 项`, { size: 24, color: C.gold }) : null,
    data.similarity ? p(`文本相似度：${data.similarity}`, { size: 24, color: C.gray }) : null,
  ).filter(Boolean)
  children.push(brk())

  // ── 二、文件信息 ──
  children.push(h2('二、文件信息'))
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: [
      new TableRow({ children: [labelCell('左侧文件'), makeCell(leftFileName || '-')] }),
      new TableRow({ children: [labelCell('右侧文件'), makeCell(rightFileName || '-')] }),
      new TableRow({ children: [labelCell('生成时间'), makeCell(now)] }),
    ],
  }))
  children.push(brk())

  // ── 三、属性详情 ──
  children.push(h2('三、属性对比详情'))
  const hdr = new TableRow({
    children: [
      cellHdr('序号', 7),
      cellHdr('属性字段', 23),
      cellHdr('原始版本', 25),
      cellHdr('修订版本', 25),
      cellHdr('对比结果', 20),
    ],
  })
  const detailRows: any[] = [hdr]
  propertyDetails.forEach((prop, i) => {
    const bg = i % 2 === 0 ? C.rowEven : C.rowOdd
    const statusColor = propStatusColor(prop.status)
    detailRows.push(new TableRow({
      children: [
        cellBody(String(i + 1), bg, { center: true, muted: true }),
        cellBody(prop.name, bg, { bold: true }),
        cellBody(prop.leftValue, bg),
        cellBody(prop.rightValue, bg),
        cellBody(propStatusLabel(prop.status), bg, { color: statusColor, bold: true, center: true }),
      ],
    }))
  })
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: detailRows,
  }))

  // ── 页脚 ──
  children.push(brk())
  children.push(p(`报告由 文比星 生成于 ${now}`, { color: C.muted, size: 16, align: AlignmentType.CENTER, italics: true }))

  return new Document({
    styles: {
      default: { document: { run: { font: F.body, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: F.title, color: C.red },
          paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: W, height: H }, margin: { top: M, right: M, bottom: M, left: M } },
      },
      headers: {
        default: new Paragraph({
          children: [
            new TextRun({ text: '文比星  ·  属性对比报告', size: 16, color: C.muted, font: F.body }),
            new TextRun({ text: '  ·  ', size: 16, color: C.muted }),
            new TextRun({ text: '第 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.muted }),
            new TextRun({ text: ' 页', size: 16, color: C.muted }),
          ],
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
        }),
      },
      footers: {
        default: new Paragraph({
          children: [
            new TextRun({ text: '本报告由 文比星 自动生成  ·  ', size: 16, color: C.muted }),
            new TextRun({ text: '第 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.muted }),
            new TextRun({ text: ' 页 / 共 ', size: 16, color: C.muted }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: C.muted }),
            new TextRun({ text: ' 页', size: 16, color: C.muted }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
        }),
      },
      children,
    }],
  })
}

export async function generatePropertyPdfReport(data: PropertyExportData): Promise<Blob> {
  const { leftFileName, rightFileName, matchCount, mismatchCount, warningCount, propertyDetails, similarity } = data
  const now = fmtDate()
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 15
  const cw = pw - 2 * margin
  let y = margin
  const lineH = 5.5
  const pageBottom = ph - margin

  const addPageIfNeed = (needH: number) => { if (y + needH > pageBottom) { pdf.addPage(); y = margin } }
  const drawSectionTitle = (text: string) => {
    addPageIfNeed(lineH * 2)
    pdf.setTextColor(0xC0, 0x39, 0x2B)
    pdf.setFontSize(14)
    pdf.setFont('helvetica')
    pdf.text(text, margin, y); y += lineH * 1.8
  }
  const drawRow = (vals: string[], widths: number[]) => {
    addPageIfNeed(lineH * 1.5)
    let x = margin
    vals.forEach((v, i) => {
      const bw = cw * widths[i] / 100
      pdf.setDrawColor(0xE0, 0xD5, 0xC1)
      pdf.rect(x, y, bw, lineH * 1.2)
      pdf.setFontSize(8)
      pdf.setTextColor(0x33, 0x33, 0x33)
      pdf.text(v, x + 2, y + lineH * 0.7, { maxWidth: bw - 4 })
      x += bw
    })
    y += lineH * 1.3
  }
  const drawDetailRow = (idx: number, prop: PropertyDetail) => {
    addPageIfNeed(lineH * 2)
    const bg = idx % 2 === 0 ? [0xFA, 0xF7, 0xF2] : [0xFF, 0xFF, 0xFF]
    pdf.setFillColor(...bg)
    pdf.rect(margin, y, cw, lineH * 1.8, 'F')
    pdf.setFontSize(9)
    pdf.setTextColor(0x33, 0x33, 0x33)
    pdf.text(String(idx + 1), margin + 3, y + lineH * 0.6)
    pdf.text(prop.name, margin + 14, y + lineH * 0.6, { maxWidth: cw * 0.23 })
    pdf.text(prop.leftValue, margin + 14 + cw * 0.24, y + lineH * 0.6, { maxWidth: cw * 0.24 })
    pdf.text(prop.rightValue, margin + 14 + cw * 0.49, y + lineH * 0.6, { maxWidth: cw * 0.24 })
    const sc = propStatusColor(prop.status)
    pdf.setTextColor(sc)
    pdf.text(propStatusLabel(prop.status), margin + cw - 20, y + lineH * 0.6, { align: 'right' })
    y += lineH * 2
  }

  // 封面
  pdf.setTextColor(0xC0, 0x39, 0x2B)
  pdf.setFontSize(22)
  pdf.setFont('helvetica')
  pdf.text('属性对比报告', pw / 2, ph / 2 - 20, { align: 'center' })
  pdf.setFontSize(11)
  pdf.setTextColor(0x8A, 0x85, 0x78)
  pdf.text(`文比星  ·  ${now}`, pw / 2, ph / 2 + 6, { align: 'center' })

  // 第一页后继续
  pdf.addPage()
  y = margin

  drawSectionTitle('一、统计概览')
  drawRow([`匹配：${matchCount} 项`, `不匹配：${mismatchCount} 项`, warningCount ? `存疑：${warningCount} 项` : '', similarity ? `相似度：${similarity}` : ''].filter(Boolean), [33, 33, 33, 33])
  y += 4
  drawSectionTitle('二、文件信息')
  drawRow([leftFileName || '-', rightFileName || '-', now], [33, 33, 33])
  y += 4
  drawSectionTitle('三、属性对比详情')

  // 表头
  addPageIfNeed(lineH * 1.5)
  pdf.setFillColor(0xF5, 0xEE, 0xE2)
  pdf.rect(margin, y, cw, lineH * 1.2, 'F')
  pdf.setFontSize(8)
  pdf.setTextColor(0x1F, 0x1D, 0x1A)
  pdf.text('#', margin + 3, y + lineH * 0.6)
  pdf.text('属性字段', margin + 16, y + lineH * 0.6)
  pdf.text('原始版本', margin + cw * 0.25, y + lineH * 0.6, { align: 'center' })
  pdf.text('修订版本', margin + cw * 0.50, y + lineH * 0.6, { align: 'center' })
  pdf.text('结果', margin + cw - 16, y + lineH * 0.6, { align: 'right' })
  y += lineH * 1.3

  propertyDetails.forEach((prop, i) => drawDetailRow(i, prop))

  addPageIfNeed(lineH * 2)
  pdf.setTextColor(0x8A, 0x85, 0x78)
  pdf.setFontSize(8)
  pdf.text(`报告由 文比星 生成于 ${now}`, pw / 2, y, { align: 'center' })

  return pdf.output('blob')
}

// ──────────────────────────────────────────────────────────────────────────
// 下载帮助
// ──────────────────────────────────────────────────────────────────────────
export function downloadBlob(blob: Blob, fileName: string): void {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
