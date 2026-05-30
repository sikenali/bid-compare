<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiExchangeLine,
  RiFileWordLine,
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
  RiHistoryLine,
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
import { storeCompareResult, deleteCompareResult } from '../utils/compareResultStore'
import { computeImageHash, hammingDistance, calculateImageSimilarity, loadImageAsDataUrl } from '../utils/imageCompare'
import type { ImageDuplicate } from '../utils/imageCompare'
import { recognizeImages, extractTextFromImage, isOCRAvailable, getSupportedLanguages } from '../utils/ocr'
import type { OCRResult, OCRConfig } from '../utils/ocr'
import FileUpload from './FileUpload.vue'
import RecentRecords from './RecentRecords.vue'
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
const multiDuplicates = ref<any[]>([])
const multiFileUploadRef = ref<InstanceType<typeof MultiFileUpload> | null>(null)

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
  showRecentRecords,
  recentRecords,
  addRecentRecord,
  clearAllRecords,
  deleteRecord
} = useRecentRecords('fileCompare')

// 历史记录弹窗
const showHistory = ref(false)

const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

// 当记录为空时自动关闭弹窗
watch(
  () => recentRecords.length,
  (newLen) => {
    if (newLen === 0 && showHistory.value) {
      showHistory.value = false
    }
  }
)

// 查看历史对比记录
const viewHistoricalRecord = (record: any) => {
  // 将历史记录数据存储到模块级存储中
  const compareResult = {
    segments: record.similarSegments || [],
    leftFileName: record.leftFileName,
    rightFileName: record.rightFileName,
    textSimilarity: record.similarity,
    similarSegmentsCount: record.similarSegments ? record.similarSegments.length : 0,
    leftTotalPages: 1,
    rightTotalPages: 1
  }

  // 存储到模块级存储
  const resultId = storeCompareResult(compareResult)

  // 跳转到结果页面，传递存储 ID 和时间戳
  router.push({ path: '/file-compare-result', query: { resultId, t: Date.now() } })
  
  // 关闭历史记录弹窗
  showHistory.value = false
}

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
    // 文件大小限制 50MB
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小超过 50MB 限制')
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
      ignoreWhitespace: settings.ignoreWhitespace
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
    console.error('OCR 识别失败:', error)
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
    console.error('OCR 对比失败:', error)
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
    const allDuplicates: any[] = []

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
          ignoreWhitespace: settings.ignoreWhitespace
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

        // 收集重复片段
        result.segments.forEach(seg => {
          allDuplicates.push({
            leftFileName: multiFiles.value[i].name,
            rightFileName: multiFiles.value[j].name,
            leftContent: seg.leftContent,
            rightContent: seg.rightContent,
            similarity: seg.similarityValue
          })
        })
      }
    }

    multiSimilarityMatrix.value = matrix
    multiDuplicates.value = allDuplicates
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
  let markdown = '# 文件对比报告\n\n';
  
  // 添加相似度统计
  markdown += '## 相似度统计\n\n';
  markdown += `- 文本重复率：${textSimilarity.value}\n`;
  markdown += `- 相似片段数：${similarSegmentsList.value.length}\n\n`;
  
  // 添加文件信息
  markdown += '## 文件信息\n\n';
  markdown += `- 左侧文件：${leftFileInfo.value.name}\n`;
  markdown += `- 右侧文件：${rightFileInfo.value.name}\n\n`;
  
  // 添加详细对比结果
  markdown += '## 详细对比结果\n\n';
  similarSegmentsList.value.forEach((segment, index) => {
    markdown += `### 片段 ${index + 1}\n\n`;
    markdown += `- 相似度：${segment.similarity}\n`;
    markdown += `- 左侧页码：${segment.leftPage}\n`;
    markdown += `- 右侧页码：${segment.rightPage}\n\n`;
    
    // 清理 HTML 标签
    const leftClean = segment.leftContent.replace(/<[^>]*>/g, '');
    const rightClean = segment.rightContent.replace(/<[^>]*>/g, '');
    
    markdown += '**左侧内容：**\n\n';
    markdown += leftClean + '\n\n';
    markdown += '**右侧内容：**\n\n';
    markdown += rightClean + '\n\n';
    markdown += '---\n\n';
  });
  
  return markdown;
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
  <div class="file-compare-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">文件对比</h1>
          <p class="page-subtitle">精准识别两个版本文档之间的内容差异、相似片段和结构变更</p>
        </div>
        <div class="header-actions">
          <button v-if="recentRecords.length > 0" class="icon-btn-wrapper" @click="toggleHistory">
            <RiHistoryLine class="icon-btn-svg" />
            <span class="icon-btn-tooltip">历史记录</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 历史记录弹窗 -->
    <div v-if="showHistory" class="help-modal-overlay" @click="toggleHistory">
      <div class="history-modal" @click.stop>
        <div class="help-modal-header">
          <h3>历史记录</h3>
          <button class="help-close-btn" @click="toggleHistory">×</button>
        </div>
        <div class="history-modal-body">
          <RecentRecords
            v-if="recentRecords.length > 0"
            :recent-records="recentRecords"
            :on-clear-all="clearAllRecords"
            :on-view-record="(record) => { viewHistoricalRecord(record); toggleHistory(); }"
            :on-delete-record="deleteRecord"
            :on-close="toggleHistory"
          />
          <div v-else class="empty-history">
            <p>暂无历史记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件上传区域（单文件模式） -->
    <div v-if="!multiFileMode && !showResults && !showMultiResult" class="upload-section" :class="{ 'processing': isProcessing }">
      <!-- 左侧文件上传 -->
      <FileUpload
        side="left"
        :file-info="leftFileInfo"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />

      <!-- 右侧文件上传 -->
      <FileUpload
        side="right"
        :file-info="rightFileInfo"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />

      <!-- 处理中遮罩 -->
      <div v-if="isProcessing" class="processing-overlay">
        <div class="processing-content">
          <div class="processing-spinner"></div>
          <p class="processing-text">{{ progressMessage || '正在处理中...' }}</p>
          <p v-if="progress > 0" class="processing-percent">{{ Math.round(progress * 100) }}%</p>
          <button class="cancel-btn-overlay" @click="handleCancel">取消</button>
        </div>
      </div>
    </div>

    <!-- 对比按钮区域（单文件模式） -->
    <div v-if="!multiFileMode && !showResults && !showMultiResult" class="compare-action-area">
      <button class="compare-main-btn" @click="handleCompare" :disabled="isProcessing || isViewingHistory" :class="{ 'processing': isProcessing }" :title="isViewingHistory ? '请重新上传文件后再进行对比' : '一键对比'">
        <RiExchangeLine class="compare-icon" :class="{ 'rotating': isProcessing }" />
        <span class="btn-text">{{ isViewingHistory ? '请重新上传文件' : '一键对比' }}</span>
      </button>
      <!-- 进度显示 -->
      <div v-if="isProcessing" class="progress-display">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
        </div>
        <span class="progress-text">{{ progressMessage || '正在处理中...' }} {{ Math.round(progress * 100) }}%</span>
      </div>
    </div>

    <!-- 多文件上传区域（多文件模式） -->
    <template v-if="multiFileMode && !showResults && !showMultiResult">
      <MultiFileUpload 
        ref="multiFileUploadRef"
        :max-count="settings.maxMultiFileCount"
        @update:files="multiFiles = $event"
      />
      
      <div class="compare-action-area">
        <button class="compare-main-btn" 
                @click="handleMultiFileCompare" 
                :disabled="isProcessing || multiFiles.length < 2"
                :class="{ 'processing': isProcessing }">
          <RiExchangeLine class="compare-icon" :class="{ 'rotating': isProcessing }" />
          <span class="btn-text">多文件对比</span>
        </button>
        <!-- 进度显示 -->
        <div v-if="isProcessing" class="progress-display">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
          </div>
          <span class="progress-text">{{ progressMessage || '正在处理中...' }} {{ Math.round(progress * 100) }}%</span>
        </div>
      </div>
    </template>

    <!-- 多文件对比结果 -->
    <MultiCompareResult 
      v-if="showMultiResult"
      :file-names="multiFiles.map(f => f.name)"
      :similarity-matrix="multiSimilarityMatrix"
      :duplicates="multiDuplicates"
      @close="closeMultiResult"
    />

    <!-- 图片上传区域 -->
    <div class="image-upload-section" v-if="settings.enableImageCompare">
      <div class="image-section-header">
        <RiImageLine class="image-section-icon" />
        <span>图片查重</span>
        <span class="image-section-hint">上传文档中的图片进行雷同检测</span>
      </div>
      <div class="image-upload-columns">
        <div class="image-column">
          <div class="image-column-label">左侧图片</div>
          <label class="image-upload-btn">
            <RiImageLine />
            <span>添加图片</span>
            <input type="file" accept="image/*" multiple @change="handleLeftImageUpload" />
          </label>
          <div class="image-preview-list">
            <div v-for="(img, idx) in leftImages" :key="idx" class="image-preview-item">
              <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
              <button class="image-preview-remove" @click="removeLeftImage(idx)">×</button>
            </div>
          </div>
        </div>
        <div class="image-column">
          <div class="image-column-label">右侧图片</div>
          <label class="image-upload-btn">
            <RiImageLine />
            <span>添加图片</span>
            <input type="file" accept="image/*" multiple @change="handleRightImageUpload" />
          </label>
          <div class="image-preview-list">
            <div v-for="(img, idx) in rightImages" :key="idx" class="image-preview-item">
              <img :src="img.url" :alt="img.name" class="image-preview-thumb" />
              <button class="image-preview-remove" @click="removeRightImage(idx)">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR 图片文字识别区域 -->
    <div class="ocr-section" v-if="ocrAvailable && settings.enableOCRCompare && leftImages.length > 0 && rightImages.length > 0">
      <div class="ocr-section-header">
        <RiImageLine class="ocr-section-icon" />
        <span>图片文字识别</span>
        <span class="ocr-section-hint">识别图片中的文字并对比</span>
      </div>
      <div class="ocr-actions">
        <button 
          class="ocr-compare-btn" 
          @click="runOCRComparison" 
          :disabled="isOCRProcessing"
        >
          <RiExchangeLine class="ocr-btn-icon" />
          <span>{{ isOCRProcessing ? '识别中...' : '图片文字识别对比' }}</span>
        </button>
      </div>
      <!-- OCR 进度显示 -->
      <div v-if="isOCRProcessing" class="ocr-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${Math.round(ocrProgress * 100)}%` }"></div>
        </div>
        <span class="progress-text">{{ ocrProgressMessage }} {{ Math.round(ocrProgress * 100) }}%</span>
      </div>
    </div>

    <!-- OCR 结果弹窗 -->
    <div v-if="showOCRResult" class="help-modal-overlay" @click="showOCRResult = false">
      <div class="ocr-result-modal" @click.stop>
        <div class="help-modal-header">
          <h3>图片文字识别结果</h3>
          <button class="help-close-btn" @click="showOCRResult = false">×</button>
        </div>
        <div class="ocr-result-body">
          <!-- 相似度统计 -->
          <div class="ocr-compare-summary" v-if="ocrCompareResult">
            <div class="ocr-similarity-badge">
              <span class="ocr-similarity-label">文字相似度</span>
              <span class="ocr-similarity-value" :class="{ 'high': ocrCompareResult.similarity >= 75 }">
                {{ ocrCompareResult.similarity }}%
              </span>
            </div>
          </div>

          <!-- 文字内容对比 -->
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

          <!-- 识别详情 -->
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

    <!-- 解析错误显示 -->
    <div v-if="comparisonParseError" class="error-message">
      {{ comparisonParseError }}
    </div>
  </div>
</template>

<style scoped>
/* 基础样式 - 国潮古风 */
.file-compare-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: rgba(248, 244, 233, 1);
  gap: 12px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面标题区 */
.page-header {
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 4px 0;
  font-family: SourceHanSans-Bold;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(101, 70, 40, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-back-btn {
  height: 40px;
  padding: 0 20px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(139, 0, 0, 1);
  border: 1px solid rgba(139, 0, 0, 0.3);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  transition: all 0.3s ease;
}

.header-back-btn:hover {
  background-color: rgba(139, 0, 0, 0.05);
  border-color: rgba(139, 0, 0, 1);
}

.header-export-btn {
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.header-export-btn:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

/* 图标按钮容器 */
.icon-btn-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: rgba(139, 0, 0, 1);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-btn-wrapper:hover {
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
  background: rgba(165, 0, 0, 1);
}

.icon-btn-wrapper:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.3);
}

.icon-btn-svg {
  font-size: 20px;
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 1);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* Tooltip 样式 */
.icon-btn-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(44, 24, 16, 0.9);
  color: white;
  font-size: 11px;
  font-family: SourceHanSans-Regular;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 100;
}

.icon-btn-wrapper:hover .icon-btn-tooltip {
  opacity: 1;
}

.history-modal {
  background-color: rgba(255, 255, 255, 1);
  border-radius: 12px;
  width: min(600px, 90vw);
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.history-modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
  color: rgba(166, 124, 82, 1);
  font-size: 14px;
  font-family: SourceHanSans-Regular;
}

.decorative-line {
  width: 100%;
  height: 3px;
  margin-top: 24px;
  background: linear-gradient(90deg, rgba(216,191,156,1) 0%, rgba(230,215,191,1) 50%, rgba(216,191,156,1) 100%);
  border-radius: 2px;
}

/* 文件上传区域 */
.upload-section {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}

/* 对比按钮区域 */
.compare-action-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  gap: 16px;
  width: 100%;
  max-width: 1094px; /* 547px * 2 = 两个上传区域的宽度 */
  margin: 0 auto;
}

/* 对比按钮 */
.compare-main-btn {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.35);
  overflow: hidden;
}

.compare-main-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0) 0%, 
    rgba(255, 255, 255, 0.3) 50%, 
    rgba(255, 255, 255, 0) 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.compare-main-btn:hover:not(:disabled)::before {
  transform: translateX(100%);
}

.compare-main-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

.compare-main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.compare-main-btn.processing {
  background: linear-gradient(90deg, 
    rgba(139, 0, 0, 1) 0%, 
    rgba(196, 30, 58, 0.8) 50%, 
    rgba(139, 0, 0, 1) 100%);
  background-size: 200% 100%;
  animation: gradient-shift 2s ease infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.btn-text {
  position: relative;
  z-index: 1;
}

.compare-icon {
  font-size: 24px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.compare-icon.rotating {
  animation: rotate 1s linear infinite;
}

/* 进度显示 */
.progress-display {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background-color: rgba(216, 191, 156, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  text-align: center;
}

/* 功能说明区 */
.features-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 24px;
}

.feature-cards {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.feature-card {
  width: 360px;
  height: 196px;
  padding: 24px;
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: all 0.3s ease;
}

.feature-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.card-icon .icon {
  font-size: 24px;
}

/* 各卡片图标颜色 */
.card-icon.accuracy {
  background-color: rgba(254, 243, 199, 1);
}

.card-icon.accuracy .icon {
  color: rgba(217, 119, 6, 1);
}

.card-icon.highlight {
  background-color: rgba(219, 234, 254, 1);
}

.card-icon.highlight .icon {
  color: rgba(37, 99, 235, 1);
}

.card-icon.export {
  background-color: rgba(252, 231, 243, 1);
}

.card-icon.export .icon {
  color: rgba(219, 39, 119, 1);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0 0 12px 0;
}

.card-desc {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
  line-height: 1.2;
}

/* 使用说明区 */
.instructions-section {
  display: flex;
  justify-content: center;
}

.instructions-content {
  width: 1078px;
  max-width: 100%;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 0.7px solid rgba(216, 191, 156, 0.5);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.instructions-icon {
  font-size: 36px;
  color: rgba(139, 0, 0, 1);
  flex-shrink: 0;
}

.instructions-text {
  flex: 1;
}

.instructions-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0 0 12px 0;
}

.instruction-item {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 0 0 8px 0;
  line-height: 1.6;
}

/* 最近对比记录 */
.recent-records {
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(166, 124, 82, 0.2);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  padding: 20px;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.records-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.view-all .clear-all-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.2);
}

.view-all .clear-all-btn:hover {
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  transform: translateY(-1px);
}

.select-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.select-btn:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(248, 244, 233, 0.5);
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  transition: all 0.3s ease;
}

.record-item:hover {
  background-color: rgba(248, 244, 233, 0.8);
  border-color: rgba(166, 124, 82, 0.3);
}

.record-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-icon {
  font-size: 16px;
  color: rgba(166, 124, 82, 1);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-filename {
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Regular;
}

.record-timestamp {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.record-actions {
  display: flex;
  gap: 8px;
}

.record-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: rgba(166, 124, 82, 1);
  font-size: 14px;
}

.record-action-btn:hover {
  background-color: rgba(139, 0, 0, 1);
  color: white;
  border-color: rgba(139, 0, 0, 1);
}

.error-message {
  color: rgba(139, 0, 0, 1);
  font-size: 14px;
  text-align: center;
  margin: 16px 0;
  padding: 12px;
  background-color: rgba(139, 0, 0, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(139, 0, 0, 0.2);
  font-family: SourceHanSans-Regular;
}

/* 对比结果 */
.results-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

/* 文件信息栏 */
.file-info-bar {
  background: rgba(248, 244, 233, 0.5);
  border: 1px solid rgba(166, 124, 82, 0.2);
  border-radius: 8px;
  padding: 16px 20px;
}

.file-info-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin-bottom: 12px;
}

.file-paths {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-path-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 10px 14px;
  font-family: SourceHanSans-Regular;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.file-icon {
  color: rgba(139, 0, 0, 1);
  font-size: 16px;
}

.file-path-divider {
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider-icon {
  color: rgba(166, 124, 82, 1);
  font-size: 16px;
}

/* 结果统计 */
.result-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* 统计信息卡片 */
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  flex: 1;
  min-width: 200px;
}

.stat-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-container.text-similarity {
  background-color: rgba(139, 0, 0, 0.1);
}

.stat-icon-container.image-similarity {
  background-color: rgba(166, 124, 82, 0.2);
}

.stat-icon-container.similar-segments {
  background-color: rgba(34, 139, 34, 0.1);
}

.stat-icon {
  font-size: 18px;
}

.stat-icon-container.text-similarity .stat-icon {
  color: rgba(139, 0, 0, 1);
}

.stat-icon-container.image-similarity .stat-icon {
  color: rgba(166, 124, 82, 1);
}

.stat-icon-container.similar-segments .stat-icon {
  color: rgba(34, 139, 34, 1);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  font-family: SourceHanSans-Bold;
}

.text-similarity-value {
  color: rgba(139, 0, 0, 1);
}

.image-similarity-value {
  color: rgba(166, 124, 82, 1);
}

.similar-segments-value {
  color: rgba(34, 139, 34, 1);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn.small {
  padding: 8px 16px;
  font-size: 13px;
}

.export-btn {
  background-color: rgba(139, 0, 0, 1);
  color: white;
}

.export-btn .btn-icon {
  color: white;
  font-size: 16px;
}

.export-btn:hover {
  background-color: rgba(120, 0, 0, 1);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.issue-tracking-btn {
  background-color: rgba(166, 124, 82, 1);
  color: white;
}

.issue-tracking-btn .btn-icon {
  color: white;
  font-size: 16px;
}

.issue-tracking-btn:hover {
  background-color: rgba(145, 108, 70, 1);
  box-shadow: 0 4px 12px rgba(166, 124, 82, 0.3);
}

/* 雷同片段列表 */
.segment-details-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.segment-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 表格容器 */
.table-container {
  padding: 0;
  background-color: rgba(255, 255, 255, 0.9);
  overflow-y: auto;
  max-height: 500px;
}

/* 表格 */
.similarity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table-header {
  text-align: center;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  border-bottom: 2px solid rgba(166, 124, 82, 0.3);
  background-color: rgba(248, 244, 233, 0.8);
}

.table-header.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.table-header.sortable:hover {
  background-color: rgba(248, 244, 233, 1);
}

.sort-icon {
  display: inline-block;
  margin-left: 4px;
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
}

.table-header.sortable:hover .sort-icon {
  color: rgba(139, 0, 0, 1);
}

.table-row {
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: rgba(248, 244, 233, 0.3);
}

.table-cell {
  padding: 14px 16px;
  font-size: 13px;
  font-family: SourceHanSans-Regular;
  color: rgba(44, 24, 16, 1);
  vertical-align: top;
  line-height: 1.6;
}

.table-cell.index {
  font-weight: 500;
  color: rgba(166, 124, 82, 1);
  text-align: center;
  background-color: rgba(248, 244, 233, 0.5);
  white-space: nowrap;
  width: 60px;
}

.table-cell.file-content {
  overflow: hidden;
  background-color: rgba(248, 244, 233, 0.3);
}

.file-content-inner {
  max-height: none;
  overflow: visible;
  display: block;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  position: relative;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.table-cell.page {
  text-align: center;
  background-color: rgba(248, 244, 233, 0.5);
  font-family: SourceHanSans-Medium;
  white-space: nowrap;
  color: rgba(166, 124, 82, 1);
}

.page-number {
  font-size: 12px;
  font-family: SourceHanSans-Regular;
}

.table-cell.similarity {
  text-align: center;
  background-color: rgba(248, 244, 233, 0.5);
  white-space: nowrap;
}

/* 相似度标签 */
.similarity-label {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  white-space: nowrap;
  min-width: 60px;
  text-align: center;
}

.similarity-label.high {
  background-color: rgba(139, 0, 0, 0.1);
  color: rgba(139, 0, 0, 1);
}

.similarity-label.medium {
  background-color: rgba(166, 124, 82, 0.2);
  color: rgba(166, 124, 82, 1);
}

.similarity-label.low {
  background-color: rgba(34, 139, 34, 0.1);
  color: rgba(34, 139, 34, 1);
}

/* 分页控件 */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-top: 1px solid rgba(166, 124, 82, 0.2);
}

.pagination-info {
  font-size: 13px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: SourceHanSans-Regular;
}

.pagination-btn:hover:not(:disabled) {
  background-color: rgba(139, 0, 0, 0.1);
  border-color: rgba(139, 0, 0, 1);
  color: rgba(139, 0, 0, 1);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  min-width: 40px;
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  color: rgba(44, 24, 16, 1);
  font-size: 14px;
  font-family: SourceHanSans-Regular;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  background-color: rgba(139, 0, 0, 0.1);
  border-color: rgba(139, 0, 0, 1);
  color: rgba(139, 0, 0, 1);
}

.page-btn.active {
  background-color: rgba(139, 0, 0, 1);
  border-color: rgba(139, 0, 0, 1);
  color: #FFFFFF;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-ellipsis {
  color: rgba(166, 124, 82, 1);
  font-size: 13px;
  margin: 0 4px;
}

/* 全局高亮样式 - 国潮古风 */
.highlighted-text {
  background-color: rgba(255, 215, 0, 0.85) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: inherit !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.5) !important;
}

/* file-content-inner中的高亮文本 */
.file-content-inner .highlighted-text {
  background-color: rgba(255, 215, 0, 0.9) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-weight: 700 !important;
  display: inline !important;
  line-height: inherit !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.6) !important;
}

.file-content-inner {
  color: rgba(44, 24, 16, 1);
}

/* 匹配分隔符样式 */
.match-separator {
  text-align: center;
  color: rgba(166, 124, 82, 1);
  font-style: italic;
  margin: 8px 0;
  font-size: 14px;
}

.content-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

/* 辅助文本 */
.auxiliary-text {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(166, 124, 82, 0.5);
  border-radius: 3px;
}

/* 历史记录弹窗 - 使用统一样式 */
.help-modal-overlay,
.history-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.help-modal,
.history-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 70vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(44, 24, 16, 0.3);
  animation: modalSlideIn 0.3s ease;
}

/* 图片上传区域 */
.image-upload-section {
  padding: 16px 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.image-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.image-section-icon {
  font-size: 18px;
  color: rgba(46, 89, 132, 1);
}

.image-section-hint {
  font-size: 12px;
  font-weight: 400;
  color: rgba(101, 70, 40, 0.6);
}

.image-upload-columns {
  display: flex;
  gap: 16px;
}

.image-column {
  flex: 1;
  min-width: 0;
}

.image-column-label {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.8);
  margin-bottom: 8px;
}

.image-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px dashed rgba(166, 124, 82, 0.4);
  border-radius: 6px;
  background: rgba(248, 244, 233, 0.3);
  cursor: pointer;
  font-size: 13px;
  color: rgba(101, 70, 40, 0.8);
  transition: all 0.2s;
}

.image-upload-btn:hover {
  border-color: rgba(166, 124, 82, 0.7);
  background: rgba(248, 244, 233, 0.6);
}

.image-upload-btn input[type="file"] {
  display: none;
}

.image-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.image-preview-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.image-preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.85);
  color: white;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview-item:hover .image-preview-remove {
  opacity: 1;
}

/* ========== OCR 图片文字识别样式 ========== */
.ocr-section {
  padding: 16px 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.ocr-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.ocr-section-icon {
  font-size: 18px;
  color: rgba(46, 89, 132, 1);
}

.ocr-section-hint {
  font-size: 12px;
  font-weight: 400;
  color: rgba(101, 70, 40, 0.6);
}

.ocr-config {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ocr-lang-label {
  font-size: 13px;
  color: rgba(101, 70, 40, 0.8);
}

.ocr-lang-select {
  padding: 6px 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background: white;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  cursor: pointer;
}

.ocr-lang-select:focus {
  outline: none;
  border-color: rgba(46, 89, 132, 0.5);
}

.ocr-actions {
  display: flex;
  gap: 12px;
}

.ocr-compare-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(46, 89, 132, 0.9), rgba(46, 89, 132, 1));
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(46, 89, 132, 0.3);
}

.ocr-compare-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 89, 132, 0.4);
}

.ocr-compare-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ocr-btn-icon {
  font-size: 16px;
}

.ocr-progress {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* OCR 结果弹窗 */
.ocr-result-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(44, 24, 16, 0.3);
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
  background: linear-gradient(135deg, rgba(248, 244, 233, 0.8), rgba(245, 238, 226, 0.6));
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.ocr-similarity-label {
  font-size: 13px;
  color: rgba(101, 70, 40, 0.8);
  margin-bottom: 4px;
}

.ocr-similarity-value {
  font-size: 28px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
}

.ocr-similarity-value.high {
  color: rgba(196, 30, 58, 1);
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
  color: rgba(44, 24, 16, 1);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.ocr-text-content {
  padding: 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.1);
  font-size: 13px;
  line-height: 1.6;
  color: rgba(44, 24, 16, 0.9);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Microsoft YaHei', sans-serif;
}

.ocr-detail-section {
  border-top: 1px solid rgba(166, 124, 82, 0.2);
  padding-top: 16px;
}

.ocr-detail-header {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 12px;
}

.ocr-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocr-detail-item {
  padding: 10px 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.1);
}

.ocr-detail-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 4px;
}

.ocr-detail-confidence {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
  margin-bottom: 4px;
}

.ocr-detail-confidence .high {
  color: rgba(46, 125, 50, 1);
}

.ocr-detail-text {
  font-size: 12px;
  color: rgba(44, 24, 16, 0.8);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.help-modal-header,
.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
  background-color: rgba(255, 255, 255, 0.9);
}

.help-modal-header h3,
.history-modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.help-close-btn,
.history-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  font-size: 20px;
  color: rgba(107, 79, 52, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.help-close-btn:hover,
.history-close-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
  color: rgba(139, 0, 0, 1);
}

.help-modal-body,
.history-modal-body {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.help-feature-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
}

.help-feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-radius: 12px;
  border: 0.7px solid rgba(216, 191, 156, 0.3);
  transition: all 0.3s ease;
}

.help-feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.help-feature-card .card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.help-feature-card .card-icon .icon {
  font-size: 24px;
}

.help-feature-card .card-icon.accuracy {
  background-color: rgba(254, 243, 199, 1);
}

.help-feature-card .card-icon.accuracy .icon {
  color: rgba(217, 119, 6, 1);
}

.help-feature-card .card-icon.highlight {
  background-color: rgba(219, 234, 254, 1);
}

.help-feature-card .card-icon.highlight .icon {
  color: rgba(37, 99, 235, 1);
}

.help-feature-card .card-icon.export {
  background-color: rgba(252, 231, 243, 1);
}

.help-feature-card .card-icon.export .icon {
  color: rgba(219, 39, 119, 1);
}

.help-feature-card .card-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0 0 8px 0;
}

.help-feature-card .card-desc {
  font-size: 13px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
  line-height: 1.4;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(166, 124, 82, 0.8);
}

/* 处理中遮罩 */
.upload-section.processing {
  position: relative;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(248, 244, 233, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 12px;
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
  border: 4px solid rgba(216, 191, 156, 0.3);
  border-top-color: rgba(139, 0, 0, 1);
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
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  margin: 0;
}

.processing-percent {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
}

.cancel-btn-overlay {
  padding: 8px 24px;
  background-color: transparent;
  border: 1px solid rgba(139, 0, 0, 1);
  color: rgba(139, 0, 0, 1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.2s;
}

.cancel-btn-overlay:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

/* 进度条 */
.progress-container {
  width: 100%;
  padding: 20px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: rgba(245, 238, 226, 1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Medium;
  white-space: nowrap;
  min-width: 120px;
}

.cancel-btn {
  padding: 8px 20px;
  background-color: transparent;
  border: 1px solid rgba(139, 0, 0, 1);
  color: rgba(139, 0, 0, 1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .upload-section {
    flex-direction: column;
    gap: 12px;
    padding: 0 12px;
  }

  .compare-action-area {
    padding: 0;
    gap: 12px;
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .compare-btn-wrapper {
    order: 3;
    width: 100%;
    margin: 8px 0;
  }

  .compare-main-btn {
    width: 100%;
    max-width: none;
    height: 44px;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .compare-icon {
    font-size: 20px;
  }

  .btn-text {
    font-size: 14px;
  }

  .progress-display {
    width: 100%;
    flex-direction: column;
    gap: 6px;
  }

  .progress-bar-bg {
    height: 16px;
  }

  .progress-text {
    font-size: 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-subtitle {
    font-size: 12px;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .content-display {
    flex-direction: column;
  }

  .content-box {
    width: 100%;
  }

  .pagination {
    flex-wrap: wrap;
    gap: 8px;
  }

  .result-stats {
    flex-direction: column;
    gap: 10px;
  }

  .stat-card {
    width: 100%;
  }

  .table-container {
    overflow-x: auto;
  }

  .feature-cards {
    flex-direction: column;
    gap: 12px;
  }

  .feature-card {
    width: 100%;
    height: auto;
  }

  .page-header {
    display: none;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 0;
  }

  /* 雷同片段详情区域移动端优化 */
  .segment-details-section {
    margin: 0 -16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .section-header {
    padding: 12px 16px;
    flex-wrap: wrap;
  }

  .segment-title {
    font-size: 14px;
  }

  .section-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* 表格移动端优化 */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-height: none;
  }

  .similarity-table {
    min-width: 700px;
    font-size: 12px;
  }

  .table-header {
    padding: 10px 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  .table-row {
    font-size: 12px;
  }

  .table-cell {
    padding: 10px 12px;
  }

  .table-cell.file-content {
    min-width: 150px;
  }

  .file-content-inner {
    padding: 8px;
    font-size: 12px;
  }

  /* 分页容器移动端优化 */
  .pagination-container {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
    align-items: stretch;
  }

  .pagination-info {
    text-align: center;
    font-size: 12px;
    order: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    order: 2;
  }

  .pagination-btn {
    padding: 6px 10px;
    font-size: 12px;
    min-height: 36px;
  }

  .page-numbers {
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-btn {
    width: 44px;
    height: 44px;
    font-size: 14px;
    min-width: 44px;
    min-height: 44px;
  }

  .page-ellipsis {
    font-size: 14px;
  }

  /* 模态框移动端适配 */
  .help-modal,
  .history-modal {
    width: calc(100% - 32px);
    max-width: 600px;
    max-height: 85vh;
    margin: 16px;
  }

  .help-close-btn {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }

  /* 使用说明区移动端适配 */
  .instructions-content {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .instructions-icon {
    font-size: 28px;
  }

  .instructions-title {
    font-size: 15px;
  }

  .instructions-text {
    font-size: 13px;
  }
}

/* 超小屏幕手机优化 (320px-480px) */
@media (max-width: 480px) {
  .page-btn {
    width: 44px;
    height: 44px;
    font-size: 13px;
  }

  .pagination-btn {
    padding: 8px 12px;
    font-size: 13px;
    min-height: 44px;
  }

  .help-modal,
  .history-modal {
    width: calc(100% - 16px);
    margin: 8px;
  }

  .similarity-table {
    font-size: 11px;
  }

  .table-header,
  .table-row {
    font-size: 11px;
  }

  .table-cell {
    padding: 8px 10px;
  }
}
</style>