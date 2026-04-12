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
    ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target', 'rel'],
    // 允许的协议
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // 移除注释
    COMMENTS: false
  })
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
