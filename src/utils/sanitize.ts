/**
 * XSS 防护工具
 * 使用 DOMPurify 消毒 HTML，防止 XSS 攻击
 */

import DOMPurify from 'dompurify'

/**
 * 消毒 HTML 字符串，移除危险的脚本和事件处理器
 * @param html 原始 HTML 字符串
 * @returns 安全的 HTML 字符串
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    // 允许的安全标签
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'code', 'pre', 'blockquote', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'mark', 'del', 'ins', 'sub', 'sup'
    ],
    // 允许的安全属性
    ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target', 'rel', 'data-full-text', 'data-segment-id'],
    // 允许的协议
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // 移除注释
    COMMENTS: false
  })
}

/**
 * 为高亮文本添加 data-full-text 属性（用于 hover tooltip）
 * @param html 包含 highlighted-text class 的 HTML
 * @returns 添加了 data-full-text 属性的 HTML
 */
export function addHighlightTooltip(html: string): string {
  if (!html) return ''
  
  // 使用正则表达式为 highlighted-text 添加 data-full-text 属性和 tooltip 类
  return html.replace(
    /<span class="highlighted-text">([\s\S]*?)<\/span>/g,
    (match, content) => {
      // 解码 HTML 实体获取纯文本
      const plainText = content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/<[^>]*>/g, '')
      
      // 转义用于 data 属性
      const escapedText = plainText
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      
      return `<span class="highlighted-text highlight-tooltip-target" data-full-text="${escapedText}">${content}</span>`
    }
  )
}

/**
 * 消毒 HTML 并添加高亮 tooltip
 * @param html 原始 HTML 字符串
 * @returns 安全的 HTML 字符串（带高亮 tooltip）
 */
export function sanitizeWithHighlight(html: string): string {
  const sanitized = sanitizeHTML(html)
  return addHighlightTooltip(sanitized)
}

/**
 * 转义 HTML 特殊字符（用于纯文本显示）
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  if (!text) return ''

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * 将高亮 HTML 转换为 Markdown 格式文本
 * - `<span class="highlighted-text">xxx</span>` → `**xxx**`
 * - 其他 HTML 标签被移除
 * - 处理 HTML 实体解码
 * @param html 带高亮标记的 HTML 字符串
 * @returns Markdown 格式文本
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  // 1. 将高亮 span 替换为 markdown 粗体标记
  let md = html.replace(
    /<span class="highlighted-text">([\s\S]*?)<\/span>/g,
    (_match, content) => {
      const inner = content.replace(/<[^>]*>/g, '')
      const decoded = inner
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
      return `**${decoded}**`
    }
  )

  // 2. 移除剩余所有 HTML 标签
  md = md.replace(/<[^>]*>/g, '')

  // 3. 解码剩余的 HTML 实体
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")

  // 4. 清理多余空白
  md = md.replace(/\n{3,}/g, '\n\n').trim()

  return md
}
