const WATERMARK_PATTERNS: RegExp[] = [
  // 连续关键词：必须出现完整关键词，\s* 允许零或多个空格
  /仅供\s*内[部\s]*使[用\s]*/gi,
  /[内\s]*部[资\s]*料[，,\.\s]*注[意\s]*保[密\s]*/gi,
  /[秘\s]?密[★※●]?[级\s]*/gi,
  /绝[对\s]*密[级\s]*/gi,
  /机[器\s]*密[级\s]*/gi,
  /商[业\s]*秘[密\s]*/gi,
  /未经\s*(许\s*可|授\s*权)\s*,?\s*不\s*得\s*(复\s*制|转\s*载)/gi,
  /版权\s*(所\s*有)\s*,?\s*侵\s*权\s*(必\s*究)/gi,
  /[限\s]*制[级\s]*/gi,
  /[声\s]*明[：:][^.。]*[。]/gi,
  /免[责\s]*声[明\s]*/gi,
  /仅供\s*内\s*部\s*交\s*流/gi,
  /仅供参考/gi,
  /参考资料/gi,
  // 稿件类水印：整行独立出现才删除，避免段落中误杀
  // 必须是以"XX稿"结尾的行（前后可能有括号/空格）
  /^\s*[（(【]?\s*(草稿|讨论稿|审议稿|征求意见稿|送审稿|修改稿|初稿|终稿|定稿)\s*[）)】]?\s*$/gim,
  /[版\s]*本[：:]\s*V?\d+[\.\d]*/gi,
  /第[一二三四五六七八九十0-9]+版/gi,
  /[更\s]*新\s*日\s*期[：:]\s*\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?/gi,
  /[修\s]*订\s*稿/gi,
  /[修\s]*订\s*记\s*录/gi,
  /[复\s]*制\s*于\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
  /[打\s]*印\s*于\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
  /CREATED\s+BY\s+.*?$/gim,
  /PRINTED\s+ON\s+.*?$/gim,
  /COPIED\s+ON\s+.*?$/gim,
  /CONFIDENTIAL/gi,
  /PROPRIETARY/gi,
  /DO NOT COPY/gi,
  /ALL RIGHTS RESERVED/gi,
  // 连续的纯数字行（超过8位数字 - 可能是页码或流水号）
  /^\s*\d{8,}\s*$/gm,
  // 单个重复字符组成的行（如 ====, ----, ****）
  /^[=\-*_~#]{10,}\s*$/gm,
  // 仅含空白或特殊符号的行
  /^\s*[•·●○◦▪▸▹►▻▷▶◆◇◦☐☑☒✗✘✙]+[\s•·●○◦▪▸▹►▻▷▶◆◇◦☐☑☒✗✘✙]*\s*$/gm,
  /^[\s•·●○◦▪▸▹►▻▷▶◆◇◦☐☑☒✗✘✙]+$/gm,
  /^[\s┌┐└┘├┤┬┴┼─│┃╔╗╚╝╠╣╦╩╬═║╒╓╕╖╘╙╛╜╟╠╢╣╤╥╧╨╪╫]+$/gm,
]

export function removeWatermarks(text: string): string {
  if (!text) return ''
  let result = text
  for (const pattern of WATERMARK_PATTERNS) {
    // 误杀兜底：单次匹配长度 <4 的不删（符号行类白名单除外）
    const isSymbolLine = pattern.source.startsWith('^\\s*[') || pattern.source.startsWith('^[');
    if (isSymbolLine) {
      result = result.replace(pattern, '')
    } else {
      result = result.replace(pattern, (m) => (m && m.trim().length >= 3 ? '' : m))
    }
  }
  result = result.replace(/\n{3,}/g, '\n\n')
  result = result.trim()
  return result
}

export function getWatermarkPatterns(): RegExp[] {
  return WATERMARK_PATTERNS
}

export function addCustomWatermarkPattern(pattern: RegExp): void {
  WATERMARK_PATTERNS.push(pattern)
}
