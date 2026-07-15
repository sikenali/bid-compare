<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiExchangeLine,
  RiAddLine,
  RiArrowRightLine,
  RiPercentLine,
  RiImageLine,
  RiListCheck,
  RiFileExcelLine,
  RiCheckDoubleLine,
  RiFilterLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiEditLine,
  RiInformationLine,
  RiDownloadLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useRecentRecords } from '../composables/useRecentRecords'
import { useAIModel } from '../composables/useAIModel'
import { useComparison } from '../composables/useComparison'
import type { ComparisonSettings, SimilarSegment } from '../utils/textAlgorithms'
import { removeCommonClauses } from '../utils/textAlgorithms'
import { htmlToMarkdown } from '../utils/sanitize'
import { storeCompareResult, deleteCompareResult } from '../utils/compareResultStore'
import { removeWatermarks } from '../utils/watermark'
import { computeImageHash, hammingDistance, calculateImageSimilarity, loadImageAsDataUrl } from '../utils/imageCompare'
import type { ImageDuplicate } from '../utils/imageCompare'
import { recognizeImages, extractTextFromImage, isOCRAvailable, getSupportedLanguages } from '../utils/ocr'
import type { OCRResult, OCRConfig } from '../utils/ocr'
import FileUpload from './FileUpload.vue'
import MultiFileUpload from './MultiFileUpload.vue'
import MultiCompareResult from './MultiCompareResult.vue'


const router = useRouter()

// 文件信息类型定义
interface FileInfo {
  file: File | null;
  name: string;
  size: string;
  type: string;
}

// 使用文件解析组合式函数
const { parseFile } = useFileParser()

// 使用设置组合式函数
const { settings } = useSettings()

// 使用对比组合式函数
const {
  isProcessing,
  progress,
  progressMessage,
  canCancel,
  parseError: comparisonParseError,
  runComparison,
  cancelComparison,
  getAbortSignal
} = useComparison()

// 响应式数据
const leftFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });
const rightFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });

// 解析结果
const leftFileContent = ref('')
const rightFileContent = ref('')

// 对比结果
const showResults = ref(false)
const textSimilarity = ref('0%')
const similarSegments = ref(0)

// 标记是否从历史记录恢复（恢复后禁用对比按钮）
const isViewingHistory = ref(false)

// 多文件对比状态
const multiFiles = ref<File[]>([])
const multiFileMode = computed(() => settings.enableMultiFileCompare)
const showMultiResult = ref(false)
const multiSimilarityMatrix = ref<number[][]>([])
const multiDuplicateGroups = ref<any[]>([])
const multiFileUploadRef = ref<InstanceType<typeof MultiFileUpload> | null>(null)

watch(showMultiResult, (val) => {
  if (val) {
    nextTick(() => {
      const el = document.querySelector('.multi-compare-result')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
})

// AI分析相关
const showAIAnalysis = ref(false)
const aiModelResponse = ref('')
const { isLoading, analysisResult, analyzeFileComparison } = useAIModel()

// AI分析处理函数
const handleAIAnalysis = async () => {
  if (!leftFileContent.value || !rightFileContent.value) return
  
  try {
    const result = await analyzeFileComparison(
      settings,
      leftFileContent.value,
      rightFileContent.value,
      textSimilarity.value,
      similarSegmentsList.value
    )
    
    // 格式化AI响应
    if (result.error) {
      aiModelResponse.value = `AI分析失败: ${result.error}`
    } else {
      let response = `## AI分析总结\n${result.summary}\n`
      
      if (result.insights.length > 0) {
        response += `\n## 关键发现\n${result.insights.map(insight => `- ${insight}`).join('\n')}\n`
      }
      
      if (result.suggestions.length > 0) {
        response += `\n## 改进建议\n${result.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}\n`
      }
      
      aiModelResponse.value = response
    }
    
    showAIAnalysis.value = true
  } catch (error) {
    aiModelResponse.value = `AI分析失败: ${(error as Error).message}`
    showAIAnalysis.value = true
  }
}

// 当前显示内容
interface HighlightedContent {
  left: string;
  right: string;
}

const currentContent = ref<HighlightedContent>({ left: '', right: '' })
const currentLeftPage = ref('第1页/共1页')
const currentRightPage = ref('第1页/共1页')
// 雷同片段列表
const similarSegmentsList = ref<SimilarSegment[]>([])

// 组件挂载时不恢复结果，总是显示主界面
// 刷新页面后返回对比界面，不恢复之前的对比结果

// 排序状态
const sortAscending = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)

// 更新总页数
const updateTotalPages = () => {
  totalPages.value = Math.ceil(similarSegmentsList.value.length / pageSize.value)
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value || 1
  }
}

// 计算总页数
const getTotalPages = () => {
  return Math.ceil(similarSegmentsList.value.length / pageSize.value)
}

// 切换到指定页码
const goToPage = (page: number) => {
  const total = getTotalPages()
  if (page >= 1 && page <= total) {
    currentPage.value = page
  }
}

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// 计算中间显示的页码
const getMiddlePages = () => {
  const pages = []
  const total = Math.ceil(similarSegmentsList.value.length / pageSize.value)
  const current = currentPage.value
  
  // 确保至少显示5个页码（当前页前后各2个，或根据情况调整）
  if (current <= 3) {
    // 当前页靠近首页，显示2-5页
    for (let i = 2; i <= 5; i++) {
      if (i < total) {
        pages.push(i)
      }
    }
  } else if (current >= total - 2) {
    // 当前页靠近末页，显示total-4到total-1页
    for (let i = total - 4; i < total; i++) {
      if (i > 1) {
        pages.push(i)
      }
    }
  } else {
    // 当前页在中间，显示current-2到current+2页
    for (let i = current - 2; i <= current + 2; i++) {
      if (i > 1 && i < total) {
        pages.push(i)
      }
    }
  }
  
  return pages
}

// 下一页
const nextPage = () => {
  const total = Math.ceil(similarSegmentsList.value.length / pageSize.value)
  if (currentPage.value < total) {
    currentPage.value++
  }
}

// 排序函数 - 先按相似度排序，再按匹配长度排序
const toggleSort = () => {
  sortAscending.value = !sortAscending.value
  similarSegmentsList.value.sort((a, b) => {
    // 先按相似度排序
    const similarityDiff = sortAscending.value ? a.similarityValue - b.similarityValue : b.similarityValue - a.similarityValue
    if (similarityDiff !== 0) {
      return similarityDiff
    }
    // 如果相似度相同，按匹配内容长度排序
    const matchLength1 = a.leftContent.length
    const matchLength2 = b.leftContent.length
    return sortAscending.value ? matchLength1 - matchLength2 : matchLength2 - matchLength1
  })
  
  // 排序后回到第一页并更新总页数
  currentPage.value = 1
  updateTotalPages()
}

// 监听雷同片段列表和页面大小变化，自动重置分页
watch(
  [similarSegmentsList, pageSize],
  () => {
    updateTotalPages()
    if (currentPage.value > getTotalPages()) {
      currentPage.value = 1
    }
  }
)


// 使用最近记录组合式函数 - 传入fileCompare类型
const {
  addRecentRecord,
} = useRecentRecords('fileCompare')

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};

// 获取文件类型
const getFileType = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    'doc': 'Word文档',
    'docx': 'Word文档',
    'pdf': 'PDF文档',
    'txt': '文本文件',
    'ppt': 'PPT演示',
    'pptx': 'PPT演示',
    'xls': 'Excel表格',
    'xlsx': 'Excel表格'
  };
  return typeMap[ext] || '未知类型';
};

// 文件上传处理
const handleFileUpload = (event: Event, side: 'left' | 'right') => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    // 文件大小限制 100MB
    if (file.size > 100 * 1024 * 1024) {
      alert('文件大小超过 100MB 限制')
      return
    }
    const fileInfo = {
      file: file,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name)
    };

    if (side === 'left') {
      leftFileInfo.value = fileInfo;
    } else {
      rightFileInfo.value = fileInfo;
    }
    
    // 用户重新上传文件，重置历史记录标记
    isViewingHistory.value = false;
  }
};

// 清除文件处理
const handleClearFile = (side: 'left' | 'right') => {
  const emptyFileInfo = {
    file: null,
    name: '',
    size: '',
    type: ''
  };
  
  if (side === 'left') {
    leftFileInfo.value = emptyFileInfo;
  } else {
    rightFileInfo.value = emptyFileInfo;
  }
};

// 拖拽处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
};

const handleDrop = (event: DragEvent, side: 'left' | 'right') => {
  event.preventDefault()
  if (event.dataTransfer && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0]
    const fileInfo = {
      file: file,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name)
    };
    
    if (side === 'left') {
      leftFileInfo.value = fileInfo;
    } else {
      rightFileInfo.value = fileInfo;
    }
  }
};

// 执行对比
const handleCompare = async () => {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) return

  comparisonParseError.value = ''

  try {
    // 显示解析中状态
    isProcessing.value = true
    progressMessage.value = '正在解析文件...'
    progress.value = 0

    // 解析左侧文件
    const leftResult = await parseFile(leftFileInfo.value.file, getAbortSignal())
    if (leftResult.error) throw new Error(leftResult.error)
    leftFileContent.value = leftResult.content

    // 解析右侧文件
    const rightResult = await parseFile(rightFileInfo.value.file, getAbortSignal())
    if (rightResult.error) throw new Error(rightResult.error)
    rightFileContent.value = rightResult.content

    // 自动加载文档中提取的图片
    if (settings.enableImageCompare || settings.enableOCRCompare) {
      if (leftResult.images && leftResult.images.length > 0) {
        leftImages.value = leftResult.images
      }
      if (rightResult.images && rightResult.images.length > 0) {
        rightImages.value = rightResult.images
      }
    }

    // 如果开启 OCR，对文档中的图片进行文字识别
    let ocrTextLeft = ''
    let ocrTextRight = ''
    if (settings.enableOCRCompare && ocrAvailable) {
      if (leftImages.value.length > 0) {
        progressMessage.value = '正在识别左侧图片文字...'
        const leftOcrResults = await runOCR(leftImages.value, 'left')
        ocrTextLeft = leftOcrResults.map(r => r.result.text).join('\n')
      }
      if (rightImages.value.length > 0) {
        progressMessage.value = '正在识别右侧图片文字...'
        const rightOcrResults = await runOCR(rightImages.value, 'right')
        ocrTextRight = rightOcrResults.map(r => r.result.text).join('\n')
      }
    }

        // 应用水印剔除
    let leftContent = leftResult.content
    let rightContent = rightResult.content
    if (settings.removeWatermark) {
      leftContent = removeWatermarks(leftContent)
      rightContent = removeWatermarks(rightContent)
    }

    // 应用相同条款剔除
    if (settings.clauseRemovalEnabled) {
      progressMessage.value = '正在剔除相同条款...'
      ;[leftContent, rightContent] = removeCommonClauses(leftContent, rightContent, settings.clauseRemovalGranularity)
    }

    // 如果开启 OCR，将识别的文字追加到对比内容中
    if (settings.enableOCRCompare && (ocrTextLeft || ocrTextRight)) {
      if (ocrTextLeft) leftContent += '\n\n--- OCR 识别文字 ---\n' + ocrTextLeft
      if (ocrTextRight) rightContent += '\n\n--- OCR 识别文字 ---\n' + ocrTextRight
    }

    // 文件大小警告
    const totalChars = leftContent.length + rightContent.length
    if (totalChars > 800_000) {
      comparisonParseError.value = `文件内容较大（${(totalChars / 10000).toFixed(1)} 万字），对比可能需要较长时间，请耐心等待...`
    }

    // 执行对比（runComparison 会接管 isProcessing 状态）
    const comparisonSettings: ComparisonSettings = {
      minDuplicateWords: settings.minDupChars,
      textSimilarityThreshold: settings.textSimilarityThreshold,
      ignoreCase: settings.ignoreCase,
      ignorePunctuation: settings.ignorePunctuation,
      ignoreWhitespace: settings.ignoreWhitespace,
      ignoreInvisibleChars: settings.ignoreInvisibleChars,
      ngramSize: settings.ngramSize,
      paragraphCount: settings.paragraphCount
    }

    const result = await runComparison(
      leftContent,
      rightContent,
      comparisonSettings,
      leftResult.pageMap,
      rightResult.pageMap
    )

    // 执行图片对比
    let imageDuplicates: ImageDuplicate[] = []
    if (settings.enableImageCompare && leftImages.value.length > 0 && rightImages.value.length > 0) {
      imageDuplicates = await runImageComparison()
    }

    // 保存对比结果到模块级存储（含原始内容用于上下文查看）
    const compareResult = {
      segments: result.segments,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      textSimilarity: `${result.similarity}%`,
      similarSegmentsCount: result.segments.length,
      leftTotalPages: leftResult.pageMap?.totalPages || 1,
      rightTotalPages: rightResult.pageMap?.totalPages || 1,
      leftFileContent: leftContent,
      rightFileContent: rightContent,
      imageDuplicates
    }

    // 使用模块级存储替代 sessionStorage + window 全局变量
    const resultId = storeCompareResult(compareResult)

    // 保存记录
    addRecentRecord({
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
      similarity: `${result.similarity}%`,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarSegments: result.segments
    })

    // 跳转到结果页面，传递存储 ID 和时间戳
    router.push({ path: '/file-compare-result', query: { resultId, t: Date.now() } })
  } catch (error) {
    isProcessing.value = false
    comparisonParseError.value = (error as Error).message
  }
}

// 图片对比
const leftImages = ref<{ url: string; name: string }[]>([])
const rightImages = ref<{ url: string; name: string }[]>([])

const handleLeftImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const f of input.files) {
    const url = URL.createObjectURL(f)
    leftImages.value.push({ url, name: f.name })
  }
  input.value = ''
}

const handleRightImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const f of input.files) {
    const url = URL.createObjectURL(f)
    rightImages.value.push({ url, name: f.name })
  }
  input.value = ''
}

const removeLeftImage = (idx: number) => {
  URL.revokeObjectURL(leftImages.value[idx].url)
  leftImages.value.splice(idx, 1)
}

const removeRightImage = (idx: number) => {
  URL.revokeObjectURL(rightImages.value[idx].url)
  rightImages.value.splice(idx, 1)
}

const imageDuplicateResults = ref<ImageDuplicate[]>([])

const runImageComparison = async (): Promise<ImageDuplicate[]> => {
  if (!settings.enableImageCompare) return []
  if (leftImages.value.length === 0 || rightImages.value.length === 0) return []

  progressMessage.value = '正在进行图片对比...'
  const duplicates: ImageDuplicate[] = []
  let idCounter = 0

  const computeAll = async (images: { url: string; name: string }[]) => {
    const results: { url: string; hash: string; name: string; index: number }[] = []
    for (let i = 0; i < images.length; i++) {
      const data = await loadImageAsDataUrl(images[i].url)
      if (data) {
        const hash = computeImageHash(data)
        results.push({ url: images[i].url, hash, name: images[i].name, index: i })
      }
    }
    return results
  }

  const leftHashes = await computeAll(leftImages.value)
  const rightHashes = await computeAll(rightImages.value)

  for (const lh of leftHashes) {
    for (const rh of rightHashes) {
      const sim = calculateImageSimilarity(lh.hash, rh.hash)
      if (sim >= settings.imageSimilarityThreshold) {
        duplicates.push({
          id: ++idCounter,
          leftImage: lh.url,
          rightImage: rh.url,
          similarity: sim,
          leftPage: lh.name,
          rightPage: rh.name,
          leftIndex: lh.index,
          rightIndex: rh.index,
        })
      }
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity)
  return duplicates
}

// ========== OCR 图片文字识别 ==========
const ocrAvailable = isOCRAvailable()
const ocrConfig = computed<OCRConfig>(() => ({
  language: settings.ocrLanguage
}))
const ocrProgress = ref(0)
const ocrProgressMessage = ref('')
const isOCRProcessing = ref(false)
const ocrResults = ref<Array<{ name: string; result: OCRResult }>>([])
const showOCRResult = ref(false)
const ocrCompareResult = ref<{
  leftText: string
  rightText: string
  similarity: number
} | null>(null)

// 执行 OCR 识别
const runOCR = async (images: { url: string; name: string }[], side: 'left' | 'right') => {
  if (!ocrAvailable || images.length === 0) return []

  isOCRProcessing.value = true
  ocrProgress.value = 0
  ocrProgressMessage.value = `正在识别${side === 'left' ? '左侧' : '右侧'}图片文字...`

  try {
    const results = await recognizeImages(
      images,
      ocrConfig.value,
      (current, total, currentImage) => {
        ocrProgress.value = current / total
        ocrProgressMessage.value = `正在识别: ${currentImage} (${current}/${total})`
      }
    )

    return results
  } catch (error) {
    return []
  } finally {
    isOCRProcessing.value = false
    ocrProgress.value = 0
    ocrProgressMessage.value = ''
  }
}

// OCR 文字对比
const runOCRComparison = async () => {
  if (leftImages.value.length === 0 || rightImages.value.length === 0) return

  isOCRProcessing.value = true
  ocrProgressMessage.value = '正在进行图片文字识别...'

  try {
    // 识别左侧图片
    ocrProgressMessage.value = '正在识别左侧图片文字...'
    const leftResults = await runOCR(leftImages.value, 'left')
    
    // 识别右侧图片
    ocrProgressMessage.value = '正在识别右侧图片文字...'
    const rightResults = await runOCR(rightImages.value, 'right')

    // 合并文本
    const leftText = leftResults.map(r => r.result.text).join('\n')
    const rightText = rightResults.map(r => r.result.text).join('\n')

    // 使用编辑距离算法计算相似度
    let similarity = 0
    if (leftText && rightText) {
      similarity = calculateEditDistanceSimilarity(leftText, rightText)
    }

    ocrCompareResult.value = {
      leftText,
      rightText,
      similarity
    }

    ocrResults.value = [...leftResults, ...rightResults]
    showOCRResult.value = true
  } catch (error) {
    // OCR 对比失败
  } finally {
    isOCRProcessing.value = false
    ocrProgress.value = 0
    ocrProgressMessage.value = ''
  }
}

// 编辑距离相似度计算函数
const calculateEditDistanceSimilarity = (text1: string, text2: string): number => {
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
  const similarityResult = Math.round((1 - editDistance / maxLen2) * 100)
  return Math.max(0, similarityResult)
}

// 获取支持的语言列表
const supportedLanguages = getSupportedLanguages()

// ========== 多文件对比 ==========
const handleMultiFileCompare = async () => {
  if (multiFiles.value.length < 2) {
    comparisonParseError.value = '请至少上传2个文件'
    return
  }

  isProcessing.value = true
  progressMessage.value = '正在解析文件...'
  showMultiResult.value = false

  try {
    // 解析所有文件
    const parseResults = []
    for (let i = 0; i < multiFiles.value.length; i++) {
      progressMessage.value = `正在解析 ${multiFiles.value[i].name}...`
      progress.value = (i + 1) / multiFiles.value.length * 0.3
      const result = await parseFile(multiFiles.value[i], getAbortSignal())
      parseResults.push(result)
    }

    // 构建相似度矩阵
    const fileCount = multiFiles.value.length
    const matrix: number[][] = Array(fileCount).fill(null).map(() => Array(fileCount).fill(0))
    const allGroups: any[] = []

    // 两两对比
    for (let i = 0; i < fileCount; i++) {
      for (let j = i + 1; j < fileCount; j++) {
        progressMessage.value = `正在对比 ${multiFiles.value[i].name} 与 ${multiFiles.value[j].name}...`
        progress.value = 0.3 + ((i * fileCount + j) / (fileCount * (fileCount - 1) / 2)) * 0.7

        const comparisonSettings: ComparisonSettings = {
          minDuplicateWords: settings.minDupChars,
          textSimilarityThreshold: settings.textSimilarityThreshold,
          ignoreCase: settings.ignoreCase,
          ignorePunctuation: settings.ignorePunctuation,
          ignoreWhitespace: settings.ignoreWhitespace,
          ignoreInvisibleChars: settings.ignoreInvisibleChars,
          ngramSize: settings.ngramSize,
          paragraphCount: settings.paragraphCount
        }

        const result = await runComparison(
          parseResults[i].content,
          parseResults[j].content,
          comparisonSettings,
          parseResults[i].pageMap,
          parseResults[j].pageMap
        )

        matrix[i][j] = result.similarity
        matrix[j][i] = result.similarity

        // 每个文件对作为一个独立分组
        allGroups.push({
          leftFileName: multiFiles.value[i].name,
          rightFileName: multiFiles.value[j].name,
          items: result.segments.map(seg => ({
            leftFileName: multiFiles.value[i].name,
            rightFileName: multiFiles.value[j].name,
            leftContent: seg.leftContent,
            rightContent: seg.rightContent,
            leftPage: seg.leftPage,
            rightPage: seg.rightPage,
            similarity: seg.similarityValue
          }))
        })
      }
    }

    multiSimilarityMatrix.value = matrix
    multiDuplicateGroups.value = allGroups
    showMultiResult.value = true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      comparisonParseError.value = (error as Error).message
    }
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

const closeMultiResult = () => {
  showMultiResult.value = false
}

// 取消对比
const handleCancel = () => {
  cancelComparison()
  if (!sessionStorage.getItem('compareResult')) {
    comparisonParseError.value = '已取消对比'
  }
}

// 导出对比报告
const handleExportReport = async () => {
  const leftName = leftFileInfo.value.name.replace(/\.[^/.]+$/, '') || '文件A';
  const rightName = rightFileInfo.value.name.replace(/\.[^/.]+$/, '') || '文件B';
  const fileName = `${leftName}_vs_${rightName}_文件对比报告`;

  if (settings.exportFormat === 'markdown') {
    // 导出 Markdown 格式
    const markdown = generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // 导出 Word 格式
    const doc = generateWordReport();
    const blob = await Packer.toBlob(doc);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// 生成 Markdown 报告
const generateMarkdownReport = (): string => {
  let md = '# 文件对比报告\n\n';
  
  // 元数据
  md += `> **生成时间**：${new Date().toLocaleString()}  \n`;
  md += `> **左侧文件**：${leftFileInfo.value.name}  \n`;
  md += `> **右侧文件**：${rightFileInfo.value.name}  \n\n`;
  
  md += '---\n\n';
  
  // 相似度统计
  md += '## 一、相似度统计\n\n';
  md += '| 指标 | 数值 |\n';
  md += '|------|------|\n';
  md += `| 文本重复率 | ${textSimilarity.value} |\n`;
  md += `| 雷同片段数 | ${similarSegmentsList.value.length}处 |\n\n`;
  
  md += '---\n\n';
  
  // 详细对比结果
  md += '## 二、雷同片段详情\n\n';
  
  similarSegmentsList.value.forEach((segment, index) => {
    const leftClean = htmlToMarkdown(segment.leftContent || '');
    const rightClean = htmlToMarkdown(segment.rightContent || '');
    
    md += `### 第 ${index + 1} 段\n\n`;
    md += `| 项目 | 内容 |\n`;
    md += `|------|------|\n`;
    md += `| 相似度 | ${segment.similarity} |\n`;
    md += `| 左侧位置 | ${segment.leftPage || '-'} |\n`;
    md += `| 右侧位置 | ${segment.rightPage || '-'} |\n\n`;
    md += `**左侧内容：**\n\n`;
    md += leftClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
    md += `**右侧内容：**\n\n`;
    md += rightClean.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
    md += '---\n\n';
  });
  
  md += `*报告由 Bid Assistant 生成于 ${new Date().toLocaleString()}*\n`;
  
  return md;
};

// 生成Word报告内容
const generateWordReport = () => {
  // 创建文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // 添加标题
          new Paragraph({
            children: [
              new TextRun({
                text: '文件对比报告',
                bold: true,
                size: 24,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 200,
            }
          }),
          
          // 添加相似度统计
          new Paragraph({
            children: [
              new TextRun({
                text: '相似度统计：',
                bold: true,
                size: 20,
              })
            ],
            spacing: {
              after: 100,
            }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `文本重复率：${textSimilarity.value}`,
                size: 16,
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '图片相似度：暂不支持',
                size: 16,
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `雷同片段：${similarSegments.value}处`,
                size: 16,
              })
            ],
            spacing: {
              after: 200,
            }
          }),
          
          // 添加文件信息
          new Paragraph({
            children: [
              new TextRun({
                text: '文件信息：',
                bold: true,
                size: 20,
              })
            ],
            spacing: {
              after: 100,
            }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `左侧文件：${leftFileInfo.value.name}`,
                size: 16,
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `右侧文件：${rightFileInfo.value.name}`,
                size: 16,
              })
            ],
            spacing: {
              after: 200,
            }
          }),
          
          // 添加雷同片段详情表格
          new Paragraph({
            children: [
              new TextRun({
                text: '雷同片段详情：',
                bold: true,
                size: 20,
              })
            ],
            spacing: {
              after: 100,
            }
          }),
          
          // 创建表格
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // 表格标题行
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: '序号', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '左侧文件内容', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '页码', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '相似度', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '页码', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '右侧文件内容', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                ],
              }),
              // 表格数据行
              ...similarSegmentsList.value.map((segment, index) => {
                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: segment.leftContent.replace(/<[^>]*>/g, '') })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: segment.leftPage, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: segment.similarity, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: segment.rightPage, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: segment.rightContent.replace(/<[^>]*>/g, '') })]
                    }),
                  ],
                });
              }),
            ],
          }),
        ],
      }
    ],
  });
  
  return doc;
};
</script>

<template>
  <div class="file-compare-page">
    <!-- 文件信息条 -->
    <div class="file-info-bar" v-if="false">
      <div class="file-info-side">
        <RiAddLine class="file-info-icon" />
        <div class="file-info-text">
          <span class="file-info-label">文件 A</span>
          <span class="file-info-name">{{ leftFileInfo.name || '未选择文件' }}</span>
        </div>
      </div>
      <div class="file-info-divider" :class="{ 'processing': isProcessing }">
        <RiExchangeLine class="divider-icon" :class="{ 'rotating': isProcessing }" />
        <span v-if="isProcessing" class="divider-text">对比中...</span>
      </div>
      <div class="file-info-side right">
        <RiAddLine class="file-info-icon" />
        <div class="file-info-text">
          <span class="file-info-label">文件 B</span>
          <span class="file-info-name">{{ rightFileInfo.name || '未选择文件' }}</span>
        </div>
      </div>
    </div>

    <!-- 上传区域（单文件模式） -->
    <div v-if="!multiFileMode && !showResults && !showMultiResult" class="upload-section">
      <FileUpload
        side="left"
        :file-info="leftFileInfo"
        label="上传文件 A"
        accepted-formats=".pdf,.docx,.doc,.xlsx,.txt"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />
      <div class="upload-divider">
        <RiArrowRightLine class="upload-divider-icon" />
      </div>
      <FileUpload
        side="right"
        :file-info="rightFileInfo"
        label="上传文件 B"
        accepted-formats=".pdf,.docx,.doc,.xlsx,.txt"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />
    </div>

    <div class="compare-action-section">
      <button
        class="compare-btn"
        :disabled="!leftFileInfo.file || !rightFileInfo.file || isProcessing"
        @click="handleCompare"
      >
        <RiExchangeLine class="compare-btn-icon" :class="{ rotating: isProcessing }" />
        <span>{{ isProcessing ? '对比中...' : '开始对比' }}</span>
      </button>
    </div>

    <!-- 处理中遮罩 -->
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <div class="processing-spinner"></div>
        <p class="processing-text">{{ progressMessage || '正在处理中...' }}</p>
        <p v-if="progress > 0" class="processing-percent">{{ Math.round(progress * 100) }}%</p>
        <button class="cancel-btn-overlay" @click="handleCancel">取消</button>
      </div>
    </div>

    <!-- 进度显示（单文件模式） -->
    <div v-if="!multiFileMode && !showResults && !showMultiResult && isProcessing" class="progress-section">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
      </div>
      <span class="progress-label">{{ progressMessage }} {{ Math.round(progress * 100) }}%</span>
    </div>

    <!-- 多文件上传区域 -->
    <template v-if="multiFileMode && !showResults && !showMultiResult">
      <MultiFileUpload
        ref="multiFileUploadRef"
        :max-count="settings.maxMultiFileCount"
        @update:files="multiFiles = $event"
        @compare="handleMultiFileCompare"
      />
      <div v-if="isProcessing" class="progress-section">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
        </div>
        <span class="progress-label">{{ progressMessage }} {{ Math.round(progress * 100) }}%</span>
      </div>
    </template>

    <!-- 多文件对比结果 -->
    <MultiCompareResult
      v-if="showMultiResult"
      :file-names="multiFiles.map(f => f.name)"
      :similarity-matrix="multiSimilarityMatrix"
      :duplicate-groups="multiDuplicateGroups"
      @close="closeMultiResult"
    />

    <!-- OCR 结果弹窗 -->
    <div v-if="showOCRResult" class="help-modal-overlay" @click="showOCRResult = false">
      <div class="ocr-result-modal" @click.stop>
        <div class="help-modal-header">
          <h3>图片文字识别结果</h3>
          <button class="help-close-btn" @click="showOCRResult = false">×</button>
        </div>
        <div class="ocr-result-body">
          <div class="ocr-compare-summary" v-if="ocrCompareResult">
            <div class="ocr-similarity-badge">
              <span class="ocr-similarity-label">文字相似度</span>
              <span class="ocr-similarity-value" :class="{ 'high': ocrCompareResult.similarity >= 75 }">
                {{ ocrCompareResult.similarity }}%
              </span>
            </div>
          </div>
          <div class="ocr-text-compare">
            <div class="ocr-text-column">
              <div class="ocr-column-header">左侧识别文字</div>
              <pre class="ocr-text-content">{{ ocrCompareResult?.leftText || '无识别结果' }}</pre>
            </div>
            <div class="ocr-text-column">
              <div class="ocr-column-header">右侧识别文字</div>
              <pre class="ocr-text-content">{{ ocrCompareResult?.rightText || '无识别结果' }}</pre>
            </div>
          </div>
          <div class="ocr-detail-section" v-if="ocrResults.length > 0">
            <div class="ocr-detail-header">识别详情</div>
            <div class="ocr-detail-list">
              <div v-for="(item, idx) in ocrResults" :key="idx" class="ocr-detail-item">
                <div class="ocr-detail-name">{{ item.name }}</div>
                <div class="ocr-detail-confidence">
                  置信度: <span :class="{ 'high': item.result.confidence >= 80 }">{{ item.result.confidence.toFixed(1) }}%</span>
                </div>
                <div class="ocr-detail-text">{{ item.result.text.substring(0, 200) }}{{ item.result.text.length > 200 ? '...' : '' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="comparisonParseError" class="error-message">
      {{ comparisonParseError }}
    </div>
  </div>
</template>

<style scoped>
.file-compare-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 文件信息条 */
.file-info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-upload-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
}

.file-info-side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-info-side.right {
  justify-content: flex-end;
}

.file-info-icon {
  font-size: 20px;
  color: var(--color-cinnabar);
  flex-shrink: 0;
}

.file-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-info-side.right .file-info-text {
  text-align: right;
  align-items: flex-end;
}

.file-info-label {
  font-size: 11px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.file-info-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.file-info-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  flex-direction: column;
  gap: 2px;
  width: auto;
  height: auto;
}

.file-info-divider.processing {
  gap: 4px;
}

.divider-text {
  font-size: 10px;
  color: var(--color-cinnabar);
  font-family: var(--font-ui);
  font-weight: 500;
  white-space: nowrap;
}

.divider-icon {
  font-size: 20px;
  color: var(--color-cinnabar);
  transition: transform 0.3s ease;
}

.divider-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 上传区域 */
.upload-section {
  display: flex;
  gap: 16px;
  align-items: stretch;
  position: relative;
  flex-wrap: wrap;
}

/* 上传分隔线 */
.upload-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 4px;
}

.upload-divider-icon {
  font-size: 24px;
  color: var(--color-cinnabar);
  opacity: 0.6;
}

/* 操作按钮区域 */
.compare-action-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.compare-btn {
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-cinnabar);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  box-shadow: var(--shadow-cinnabar);
  transition: all 0.3s ease;
}

.compare-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-cinnabar);
}

.compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.compare-btn-icon {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.compare-btn-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.history-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-cream-dark);
  color: var(--color-brown);
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-ui);
  transition: all 0.2s;
  flex-shrink: 0;
}

.history-btn:hover {
  background: var(--color-cream-darker);
  color: var(--color-cinnabar);
  border-color: var(--color-cinnabar);
}

.history-btn-icon {
  font-size: 16px;
}

/* 进度条 */
.progress-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--color-cream-darker);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-cinnabar);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 13px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
  text-align: center;
}

/* 错误提示 */
.error-message {
  color: var(--color-cinnabar);
  font-size: 14px;
  text-align: center;
  padding: 12px 16px;
  background: rgba(var(--rgb-cinnabar), 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.2);
  font-family: var(--font-ui);
}

/* 处理中遮罩 */
.processing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--rgb-parchment), 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--radius-lg);
}

.processing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
}

.processing-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(var(--rgb-tan-dark), 0.3);
  border-top-color: rgba(var(--rgb-cinnabar), 1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.processing-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin: 0;
}

.processing-percent {
  font-size: 14px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
  margin: 0;
}

.cancel-btn-overlay {
  padding: 8px 24px;
  background: transparent;
  border: 1px solid var(--color-cinnabar);
  color: var(--color-cinnabar);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-ui);
  transition: all 0.2s;
}

.cancel-btn-overlay:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
}

/* 历史记录弹窗 */
.help-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.history-modal {
  background: white;
  border-radius: var(--radius-xl);
  width: min(600px, 90vw);
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.help-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  background: rgba(var(--rgb-cream), 0.9);
}

.help-modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
}

.help-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  color: var(--color-brown-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.help-close-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
}

.history-modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-brown-muted);
  font-size: 14px;
  font-family: var(--font-ui);
}

/* OCR 结果弹窗 */
.ocr-result-modal {
  background: white;
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: modalSlideIn 0.3s ease;
}

.ocr-result-body {
  padding: 16px 24px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.ocr-compare-summary {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.ocr-similarity-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 32px;
  background: rgba(var(--rgb-parchment), 0.8);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.ocr-similarity-label {
  font-size: 13px;
  color: var(--color-brown);
  margin-bottom: 4px;
}

.ocr-similarity-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.ocr-similarity-value.high {
  color: var(--color-cinnabar);
}

.ocr-text-compare {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.ocr-text-column {
  flex: 1;
  min-width: 0;
}

.ocr-column-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.ocr-text-content {
  padding: 12px;
  background: rgba(var(--rgb-parchment), 0.3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.1);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-brown-dark);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  font-family: var(--font-ui);
}

.ocr-detail-section {
  border-top: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  padding-top: 16px;
}

.ocr-detail-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: 12px;
}

.ocr-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocr-detail-item {
  padding: 10px 12px;
  background: rgba(var(--rgb-parchment), 0.3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.1);
}

.ocr-detail-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin-bottom: 4px;
}

.ocr-detail-confidence {
  font-size: 11px;
  color: var(--color-brown);
  margin-bottom: 4px;
}

.ocr-detail-confidence .high {
  color: var(--color-jade);
}

.ocr-detail-text {
  font-size: 12px;
  color: var(--color-brown-dark);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .file-compare-page {
    gap: 12px;
  }

  .file-info-bar {
    padding: 10px 12px;
    gap: 8px;
  }

  .file-info-name {
    max-width: 120px;
    font-size: 13px;
  }

  .upload-section {
    flex-direction: column;
    gap: 12px;
  }

  .compare-action-section {
    align-self: center;
  }

  .history-btn {
    align-self: center;
  }

  .help-modal-overlay {
    padding: 0;
  }

  .history-modal,
  .ocr-result-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .help-modal-header {
    padding: 12px 16px;
  }

  .history-modal-body {
    padding: 16px;
  }

  .ocr-result-body {
    padding: 12px 16px;
  }

  .ocr-text-compare {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .file-info-name {
    max-width: 80px;
    font-size: 12px;
  }
}
</style>