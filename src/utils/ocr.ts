/**
 * OCR 图片文字识别模块
 * 使用 Tesseract.js 实现浏览器端 OCR
 */

import Tesseract from 'tesseract.js'

// OCR 配置
export interface OCRConfig {
  language: string        // 识别语言，如 'chi_sim+eng'（中文简体+英文）
  logger?: (info: any) => void  // 进度回调
}

// OCR 结果
export interface OCRResult {
  text: string           // 识别出的文本
  confidence: number     // 置信度 0-100
  lines: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
  words: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
}

// 默认配置
const DEFAULT_CONFIG: OCRConfig = {
  language: 'chi_sim+eng'  // 默认中文简体+英文
}

/**
 * 识别单张图片中的文字
 * @param image 图片 URL、File 或 Blob
 * @param config OCR 配置
 * @returns OCR 识别结果
 */
export async function recognizeImage(
  image: string | File | Blob,
  config: Partial<OCRConfig> = {}
): Promise<OCRResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const result = await Tesseract.recognize(
      image as any,
      finalConfig.language,
      {
        logger: finalConfig.logger
      }
    )

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines: result.data.lines.map((line: any) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: line.bbox
      })),
      words: result.data.words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox
      }))
    }
  } catch (error) {
    console.error('OCR 识别失败:', error)
    throw new Error(`OCR 识别失败: ${(error as Error).message}`)
  }
}

/**
 * 批量识别多张图片
 * @param images 图片数组
 * @param config OCR 配置
 * @param onProgress 进度回调
 * @returns 每张图片的识别结果
 */
export async function recognizeImages(
  images: Array<{ url: string; name: string }>,
  config: Partial<OCRConfig> = {},
  onProgress?: (current: number, total: number, currentImage: string) => void
): Promise<Array<{ name: string; result: OCRResult }>> {
  const results: Array<{ name: string; result: OCRResult }> = []

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    onProgress?.(i + 1, images.length, image.name)

    try {
      const result = await recognizeImage(image.url, config)
      results.push({ name: image.name, result })
    } catch (error) {
      console.warn(`图片 "${image.name}" OCR 失败:`, error)
      // 失败时返回空结果
      results.push({
        name: image.name,
        result: {
          text: '',
          confidence: 0,
          lines: [],
          words: []
        }
      })
    }
  }

  return results
}

/**
 * 从图片中提取文字并返回纯文本
 * @param image 图片 URL
 * @param language 语言
 * @returns 识别出的纯文本
 */
export async function extractTextFromImage(
  image: string | File | Blob,
  language: string = 'chi_sim+eng'
): Promise<string> {
  const result = await recognizeImage(image, { language })
  return result.text
}

/**
 * 对比两张图片中的文字相似度
 * @param image1 图片1
 * @param image2 图片2
 * @param language 语言
 * @returns 相似度 0-100
 */
export async function compareImageText(
  image1: string | File | Blob,
  image2: string | File | Blob,
  language: string = 'chi_sim+eng'
): Promise<{ similarity: number; text1: string; text2: string }> {
  const [text1, text2] = await Promise.all([
    extractTextFromImage(image1, language),
    extractTextFromImage(image2, language)
  ])

  // 使用编辑距离算法计算相似度
  if (!text1 || !text2) {
    return { similarity: 0, text1, text2 }
  }

  const similarity = calculateEditDistanceSimilarity(text1, text2)
  return { similarity, text1, text2 }
}

/**
 * 使用编辑距离算法计算文本相似度
 * 对中文文本效果更好
 */
function calculateEditDistanceSimilarity(text1: string, text2: string): number {
  const len1 = text1.length
  const len2 = text2.length

  if (len1 === 0 && len2 === 0) return 100
  if (len1 === 0 || len2 === 0) return 0

  // 优化：对于长文本，只比较前1000个字符
  const maxLen = 1000
  const t1 = text1.substring(0, maxLen)
  const t2 = text2.substring(0, maxLen)

  // 动态规划计算编辑距离
  const dp: number[][] = Array.from({ length: t1.length + 1 }, () => Array(t2.length + 1).fill(0))

  for (let i = 0; i <= t1.length; i++) {
    dp[i][0] = i
  }
  for (let j = 0; j <= t2.length; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= t1.length; i++) {
    for (let j = 1; j <= t2.length; j++) {
      const cost = t1[i - 1] === t2[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 删除
        dp[i][j - 1] + 1,      // 插入
        dp[i - 1][j - 1] + cost // 替换
      )
    }
  }

  const editDistance = dp[t1.length][t2.length]
  const maxLen2 = Math.max(t1.length, t2.length)
  const similarity = Math.round((1 - editDistance / maxLen2) * 100)
  return Math.max(0, similarity)
}

/**
 * 检查浏览器是否支持 OCR
 */
export function isOCRAvailable(): boolean {
  return typeof Tesseract !== 'undefined'
}

/**
 * 获取支持的语言列表
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'chi_sim', name: '中文简体' },
    { code: 'chi_tra', name: '中文繁体' },
    { code: 'eng', name: '英文' },
    { code: 'jpn', name: '日文' },
    { code: 'kor', name: '韩文' },
    { code: 'fra', name: '法文' },
    { code: 'deu', name: '德文' },
    { code: 'spa', name: '西班牙文' },
    { code: 'rus', name: '俄文' },
    { code: 'ara', name: '阿拉伯文' }
  ]
}
