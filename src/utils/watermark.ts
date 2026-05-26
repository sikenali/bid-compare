const WATERMARK_PATTERNS: RegExp[] = [
  /仅供\s*内[部\s]*使[用\s]*/gi,
  /[内\s]*部[资\s]*料[，,\.\s]*注[意\s]*保[密\s]*/gi,
  /[秘\s]?密[★※●]?[级\s]*/gi,
  /绝[对\s]*?[密\s]*?[级\s]*?/gi,
  /机[器\s]*?[密\s]*?[级\s]*?/gi,
  /商[业\s]*?[秘\s]*?[密\s]*?/gi,
  /未经[授\s]*?[权\s]*?[，,\.\s]*不[得\s]*?[转\s]*?[载\s]*?/gi,
  /版权[所\s]*?[有\s]*?[，,\.\s]*?侵[权\s]*?[必\s]*?[究\s]*?/gi,
  /[限\s]*?[制\s]*?[级\s]*?/gi,
  /[声\s]*?[明\s]*?：.*?[。.]/gi,
  /免[责\s]*?[声\s]*?[明\s]*?/gi,
  /[仅\s]*?[供\s]*?[内\s]*?[部\s]*?[交\s]*?[流\s]*?/gi,
  /[参\s]*?[考\s]*?[资\s]*?[料\s]*?/gi,
  /[草\s]*?[稿\s]*?/gi,
  /[讨\s]*?[论\s]*?[稿\s]*?/gi,
  /[审\s]*?[议\s]*?[稿\s]*?/gi,
  /[征\s]*?[求\s]*?[意\s]*?[见\s]*?[稿\s]*?/gi,
  /[送\s]*?[审\s]*?[稿\s]*?/gi,
  /[修\s]*?[改\s]*?[稿\s]*?/gi,
  /[初\s]*?[稿\s]*?/gi,
  /[终\s]*?[稿\s]*?/gi,
  /[定\s]*?[稿\s]*?/gi,
  /[版\s]*?[本\s]*?[：:]\s*V?\d+[\.\d]*/gi,
  /第[一二三四五六七八九十\d]+\s*版/gi,
  /[更\s]*?[新\s]*?[日\s]*?[期\s]*?[：:]\s*\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?/gi,
  /[修\s]*?[订\s]*?[记\s]*?[录\s]*?/gi,
  /[复\s]*?[制\s]*?[于\s]*?\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
  /[打\s]*?[印\s]*?[于\s]*?\d{4}[-/]\d{1,2}[-/]\d{1,2}/gi,
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
    result = result.replace(pattern, '')
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
