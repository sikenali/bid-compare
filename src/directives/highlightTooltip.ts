/**
 * 高亮文本 Tooltip 指令
 * 使用事件委托处理动态添加的 .highlight-tooltip-target 元素
 */

let currentTooltip: HTMLElement | null = null

function handleMouseEnter(e: MouseEvent) {
  const target = e.target as HTMLElement
  const el = target.closest('.highlight-tooltip-target') as HTMLElement
  if (!el) return

  const fullText = el.getAttribute('data-full-text')
  if (!fullText) return

  // 移除现有的 tooltip
  if (currentTooltip) {
    currentTooltip.remove()
  }

  // 创建 tooltip 元素
  const tooltip = document.createElement('div')
  tooltip.className = 'highlight-tooltip'
  tooltip.textContent = fullText
  tooltip.style.cssText = `
    position: fixed;
    background-color: rgba(44, 24, 16, 0.95);
    color: rgba(255, 255, 255, 1);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    white-space: normal;
    word-break: break-word;
    max-width: 450px;
    max-height: 250px;
    overflow-y: auto;
    line-height: 1.6;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 9999;
    font-family: SourceHanSans-Regular, sans-serif;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
  `

  document.body.appendChild(tooltip)
  currentTooltip = tooltip

  // 计算位置
  const rect = el.getBoundingClientRect()
  
  // 先获取 tooltip 的大致宽度（设置后）
  requestAnimationFrame(() => {
    const tooltipRect = tooltip.getBoundingClientRect()
    
    let top = rect.top - tooltipRect.height - 8
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)

    // 确保不超出屏幕边界
    if (top < 8) {
      top = rect.bottom + 8
    }
    if (left < 8) {
      left = 8
    }
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8
    }

    tooltip.style.top = `${top + window.scrollY}px`
    tooltip.style.left = `${left}px`

    // 显示动画
    tooltip.style.opacity = '1'
  })
}

function handleMouseLeave(e: MouseEvent) {
  const target = e.target as HTMLElement
  const el = target.closest('.highlight-tooltip-target')
  if (!el) return

  if (currentTooltip) {
    currentTooltip.style.opacity = '0'
    const tooltipToRemove = currentTooltip
    setTimeout(() => {
      tooltipToRemove.remove()
      if (currentTooltip === tooltipToRemove) {
        currentTooltip = null
      }
    }, 150)
  }
}

export const vHighlightTooltip = {
  mounted(el: HTMLElement) {
    // 使用事件委托，在父元素上监听 mouseenter/mouseleave
    el.addEventListener('mouseover', handleMouseEnter, true)
    el.addEventListener('mouseout', handleMouseLeave, true)
  },
  unmounted(el: HTMLElement) {
    el.removeEventListener('mouseover', handleMouseEnter, true)
    el.removeEventListener('mouseout', handleMouseLeave, true)
    if (currentTooltip && currentTooltip.isConnected) {
      currentTooltip.remove()
      currentTooltip = null
    }
  }
}
