export interface SensitiveWordMatch {
  word: string
  index: number
  endIndex: number
  line: number
  context: string
}

export interface SensitiveSearchResult {
  matches: SensitiveWordMatch[]
  totalCount: number
  wordsFound: string[]
}

const DEFAULT_SENSITIVE_WORDS: string[] = [
  '围标', '串标', '陪标', '挂靠', '转包', '违法分包',
  '行贿', '受贿', '回扣', '好处费',
  '暗箱操作', '内定', '萝卜坑', '量身定做',
  '虚假投标', '伪造资质', '提供虚假',
  '泄露标底', '透题', '提前获取',
  '利益输送', '利益交换',
  '关联交易', '利益冲突',
  '私下承诺', '私下协议',
]

export function getDefaultSensitiveWords(): string[] {
  return [...DEFAULT_SENSITIVE_WORDS]
}

export function searchSensitiveWords(
  text: string,
  words: string[],
  contextLength: number = 20
): SensitiveSearchResult {
  if (!text || !words.length) {
    return { matches: [], totalCount: 0, wordsFound: [] }
  }

  const lines = text.split('\n')
  const matches: SensitiveWordMatch[] = []
  const wordsFoundSet = new Set<string>()

  for (const word of words) {
    if (!word.trim()) continue
    let searchFrom = 0
    while (searchFrom < text.length) {
      const idx = text.indexOf(word, searchFrom)
      if (idx === -1) break

      wordsFoundSet.add(word)

      const lineNum = getLineNumber(lines, idx)
      const contextStart = Math.max(0, idx - contextLength)
      const contextEnd = Math.min(text.length, idx + word.length + contextLength)
      let context = text.substring(contextStart, contextEnd).replace(/\n/g, ' ')
      if (contextStart > 0) context = '...' + context
      if (contextEnd < text.length) context = context + '...'

      matches.push({
        word,
        index: idx,
        endIndex: idx + word.length,
        line: lineNum + 1,
        context,
      })

      searchFrom = idx + word.length
    }
  }

  matches.sort((a, b) => a.index - b.index)

  return {
    matches,
    totalCount: matches.length,
    wordsFound: [...wordsFoundSet],
  }
}

function getLineNumber(lines: string[], charIndex: number): number {
  let accumulated = 0
  for (let i = 0; i < lines.length; i++) {
    accumulated += lines[i].length + 1
    if (accumulated > charIndex) return i
  }
  return lines.length - 1
}

export function loadSensitiveWords(): string[] {
  try {
    const saved = localStorage.getItem('sensitiveWords')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_SENSITIVE_WORDS
}

export function saveSensitiveWords(words: string[]): void {
  localStorage.setItem('sensitiveWords', JSON.stringify(words))
}
