const WATERMARK_PATTERNS: RegExp[] = [
  // 必须至少包含关键词字符，*?→+? 防止零匹配空串
  /仅供\s*内[部\s]+使[用\s]*/gi,
  /[内\s]+部[资\s]+料[，,\.\s]*注[意\s]*保[密\s]*/gi,
  /[秘\s]?密[★※●]?[级\s]+/gi,
  /绝[对\s]+密[级\s]+/gi,
  /机[器\s]+密[级\s]+/gi,
  /商[业\s]+秘[密\s]+/gi,
  /未经[授\s]+权[，,\.\s]+不[得\s]+转[载\s]*/gi,
  /版权[所\s]+有[，,\.\s]+侵[权\s]+必[究\s]*/gi,
  /[限\s]+制[级\s]+/gi,
  /[声\s]+明[：:][^.。]*[。]/gi,
  /免[责\s]+声[明\s]+/gi,
  /[仅\s]+供\s+内\s+部\s+交\s+流/gi,
  /[参\s]+考\s+资\s+料/gi,
  // 稿件类水印：必须“XX稿”完整成词才删，避免杀掉正文单个“草/稿”字
  /^\s*[（(【\[]?.{0,6}草稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}讨论稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}审议稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}征求意见稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}送审稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}修改稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}初稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}终稿.{0,6}[）)】\]]?\s*$/gim,
  /^\s*[（(【\[]?.{0,6}定稿.{0,6}[）)】\]]?\s*$/gim,
  /[版\s]+本[：:]\s*V?\d+[\.\d]*/gi,
  /第[一二三四五六七八九十\d]+版/gi,
  /[更\s]+新\s+日\s+期[：:]\s*\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?/gi,
  /[修\s]+订\s+记\s+录/gi,
  /[复\s]+制\s+于\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
  /[打\s]+印\s+于\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
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
      result = result.replace(pattern, (m) => (m && m.trim().length >= 4 ? '' : m))
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
