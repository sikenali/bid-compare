<script setup lang="ts">
import { ref } from 'vue'
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
  RiBrainLine,
  RiQuestionLine,
  RiSearchLine,
  RiEditLine,
  RiInformationLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useRecentRecords } from '../composables/useRecentRecords'
import { useAIModel } from '../composables/useAIModel'
import FileUpload from './FileUpload.vue'
import RecentRecords from './RecentRecords.vue'

// 文件信息类型定义
interface FileInfo {
  file: File | null;
  name: string;
  size: string;
  type: string;
}

// 雷同片段类型定义
interface SimilarSegment {
  id: number;
  similarity: string;
  similarityValue: number;
  leftContent: string;
  rightContent: string;
  leftPage: string;
  rightPage: string;
  level: 'high' | 'medium' | 'low';
}

// 使用文件解析组合式函数
const { parseFile } = useFileParser()

// 使用设置组合式函数
const { settings } = useSettings()

// 响应式数据
const leftFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });
const rightFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });

// 解析结果
const leftFileContent = ref('')
const rightFileContent = ref('')
const isParsing = ref(false)
const parseError = ref('')

// 对比结果
const showResults = ref(false)
const textSimilarity = ref('0%')
const similarSegments = ref(0)

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

// 切换到指定页码
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
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



// 使用最近记录组合式函数 - 传入fileCompare类型
const {
  showRecentRecords,
  recentRecords,
  addRecentRecord,
  clearAllRecords,
  deleteRecord
} = useRecentRecords('fileCompare')

// 帮助弹窗
const showHelp = ref(false)

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

// 查看历史对比记录
const viewHistoricalRecord = (record: any) => {
  // 更新文件信息
  leftFileInfo.value = {
    file: null,
    name: record.leftFileName,
    size: '未知',
    type: getFileType(record.leftFileName)
  };
  
  rightFileInfo.value = {
    file: null,
    name: record.rightFileName,
    size: '未知',
    type: getFileType(record.rightFileName)
  };
  
  // 设置文本相似度
  textSimilarity.value = record.similarity;
  
  // 显示结果界面
  showResults.value = true;
  
  // 恢复保存的雷同片段数据
  if (record.similarSegments && record.similarSegments.length > 0) {
    similarSegmentsList.value = record.similarSegments;
    
    // 设置当前显示内容
    currentContent.value = {
      left: record.similarSegments[0].leftContent,
      right: record.similarSegments[0].rightContent
    };
  } else {
    similarSegmentsList.value = [];
    currentContent.value = { left: '', right: '' };
  }
};

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

// 文本预处理（根据设置调整）
const preprocessText = (text: string): string => {
  // 检查text是否为undefined或null
  if (!text) {
    return '';
  }
  
  let processed = text;
  
  // 忽略大小写
  if (settings.ignoreCase) {
    processed = processed.toLowerCase();
  }
  
  // 忽略标点符号
  if (settings.ignorePunctuation) {
    processed = processed.replace(/[\p{P}\p{S}]/gu, '');
  }
  
  // 忽略空格差异
  if (settings.ignoreWhitespace) {
    processed = processed.replace(/\s+/g, ' ').trim();
  }
  
  return processed;
};

// 简单的文本相似度计算（基于最长公共子串）
const calculateTextSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;
  
  const preprocessed1 = preprocessText(text1);
  const preprocessed2 = preprocessText(text2);
  
  const m = preprocessed1.length;
  const n = preprocessed2.length;
  
  // 初始化dp数组
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  let maxLength = 0;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (preprocessed1[i - 1] === preprocessed2[j - 1]) {
        const prevValue: number = dp[i - 1][j - 1];
        const currentValue: number = prevValue + 1;
        dp[i][j] = currentValue;
        maxLength = Math.max(maxLength, currentValue);
      } else {
        dp[i][j] = 0;
      }
    }
  }
  
  // 计算相似度百分比
  const minLength = Math.min(preprocessed1.length, preprocessed2.length);
  if (minLength === 0) return 0;
  
  return Math.round((maxLength / minLength) * 100);
};

// 检测雷同片段 - 基于单词匹配的实现
const detectSimilarSegments = (text1: string, text2: string): SimilarSegment[] => {
  // 文件大小检查
  const totalChars = text1.length + text2.length;
  if (totalChars > 500000) {
    console.warn(`文件内容过大（${totalChars} 字符），建议使用 Web Worker 进行后台处理`);
  }

  // 前后显示的字符数 - 当检查的字符数大时，显示更少的上下文
  let contextLength = 15;
  
  // 如果文本内容很长，减少上下文长度，只显示重复文字的前后小段
  if (text1.length > 1000 || text2.length > 1000) {
    contextLength = 8;
  }
  
  // 使用设置中的最小查重字数
  const minMatchLength = settings.minDuplicateWords;
  
  // 预处理整个文本
  const preprocessed1 = preprocessText(text1);
  const preprocessed2 = preprocessText(text2);
  
  const m = preprocessed1.length;
  const n = preprocessed2.length;
  
  // 用于记录已经匹配的位置，避免重复匹配
  const matchedPositions = new Set<string>();
  
  const segments: SimilarSegment[] = [];
  
  // 寻找所有设置的最小查重字数及以上的重复内容
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      // 检查是否已经匹配过这个位置
      if (matchedPositions.has(i + ',' + j)) continue;
      
      let k = 0;
      // 找到最长的连续匹配内容 - 使用预处理文本进行比较
      while (i + k < m && j + k < n && preprocessed1[i + k] === preprocessed2[j + k]) {
        k++;
      }
      
      // 如果匹配长度达到最小要求
      if (k >= minMatchLength) {
        // 计算相似度（基于预处理文本，这里是完全匹配，所以相似度为100%）
        const similarityValue = 100;
        
        // 寻找原始文本中对应的位置
        let originalIndex1 = 0;
        let preprocessedCount1 = 0;
        
        // 找到预处理文本中i位置对应的原始文本位置
        while (preprocessedCount1 < i && originalIndex1 < text1.length) {
          const preprocessedChar = preprocessText(text1[originalIndex1]);
          if (preprocessedChar) {
            preprocessedCount1++;
          }
          originalIndex1++;
        }
        
        let originalIndex2 = 0;
        let preprocessedCount2 = 0;
        
        // 找到预处理文本中j位置对应的原始文本位置
        while (preprocessedCount2 < j && originalIndex2 < text2.length) {
          const preprocessedChar = preprocessText(text2[originalIndex2]);
          if (preprocessedChar) {
            preprocessedCount2++;
          }
          originalIndex2++;
        }
        
        // 找到匹配结束位置
        let originalEnd1 = originalIndex1;
        let originalEnd2 = originalIndex2;
        preprocessedCount1 = 0;
        preprocessedCount2 = 0;
        
        while (preprocessedCount1 < k && originalEnd1 < text1.length) {
          const preprocessedChar = preprocessText(text1[originalEnd1]);
          if (preprocessedChar) {
            preprocessedCount1++;
          }
          originalEnd1++;
        }
        
        while (preprocessedCount2 < k && originalEnd2 < text2.length) {
          const preprocessedChar = preprocessText(text2[originalEnd2]);
          if (preprocessedChar) {
            preprocessedCount2++;
          }
          originalEnd2++;
        }
        
        // 获取原始匹配内容
        const originalMatch1 = text1.substring(originalIndex1, originalEnd1);
        const originalMatch2 = text2.substring(originalIndex2, originalEnd2);
        
        // 只显示重复文字的前后小段
        const leftContextStart = Math.max(0, originalIndex1 - contextLength);
        const leftContextEnd = Math.min(text1.length, originalEnd1 + contextLength);
        const leftContentWithContext = text1.substring(leftContextStart, leftContextEnd);
        
        const rightContextStart = Math.max(0, originalIndex2 - contextLength);
        const rightContextEnd = Math.min(text2.length, originalEnd2 + contextLength);
        const rightContentWithContext = text2.substring(rightContextStart, rightContextEnd);
        
        // 生成带有高亮的内容 - 高亮匹配部分
        // 转义正则表达式特殊字符
        const escapeRegExp = (str: string) => {
          return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        };
        
        // 安全地转义HTML特殊字符，防止XSS攻击
        const escapeHtml = (str: string) => {
          const div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        };
        
        // 确保匹配内容在上下文文本中正确高亮
        let highlightedLeftContent = leftContentWithContext;
        let highlightedRightContent = rightContentWithContext;
        
        // 使用原始匹配内容进行高亮，而不是预处理后的内容
        // 安全地转义HTML特殊字符，防止XSS攻击
        const safeMatch1 = escapeHtml(originalMatch1);
        const safeMatch2 = escapeHtml(originalMatch2);
        
        // 先转义上下文文本，确保安全
        const safeLeftContext = escapeHtml(leftContentWithContext);
        const safeRightContext = escapeHtml(rightContentWithContext);
        
        // 高亮所有匹配内容 - 使用内联样式确保样式生效
        // 使用原始匹配内容进行高亮
        highlightedLeftContent = safeLeftContext.replace(new RegExp(escapeRegExp(safeMatch1), 'g'), `<span class="highlighted-text" style="background-color: rgba(255, 215, 0, 0.9); color: #8B0000; padding: 3px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">${safeMatch1}</span>`);
        highlightedRightContent = safeRightContext.replace(new RegExp(escapeRegExp(safeMatch2), 'g'), `<span class="highlighted-text" style="background-color: rgba(255, 215, 0, 0.9); color: #8B0000; padding: 3px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">${safeMatch2}</span>`);
        
        // 标记匹配位置，避免重复匹配
        for (let l = 0; l < k; l++) {
          matchedPositions.add((i + l) + ',' + (j + l));
        }
        
        segments.push({
          id: segments.length + 1,
          similarity: `${similarityValue}%`,
          similarityValue: similarityValue,
          leftContent: highlightedLeftContent,
          rightContent: highlightedRightContent,
          leftPage: `第${Math.floor(originalIndex1 / 1000) + 1}页`,
          rightPage: `第${Math.floor(originalIndex2 / 1000) + 1}页`,
          level: similarityValue >= 90 ? 'high' : similarityValue >= settings.textSimilarityThreshold ? 'medium' : 'low'
        });
      }
    }
  }
  
  return segments;
};

// 生成带高亮的HTML内容 - 显示所有设置的最小查重字数及以上的重复内容
const generateHighlightedContent = (text1: string, text2: string) => {
  if (!text1 || !text2) return { left: '', right: '' };
  
  // 前后显示的字符数 - 当检查的字符数大时，显示更少的上下文
  let contextLength = 15;
  
  // 如果文本内容很长，减少上下文长度，只显示重复文字的前后小段
  if (text1.length > 1000 || text2.length > 1000) {
    contextLength = 8;
  }
  
  // 预处理整个文本
  const preprocessed1 = preprocessText(text1);
  const preprocessed2 = preprocessText(text2);
  
  const m = preprocessed1.length;
  const n = preprocessed2.length;
  
  // 使用设置中的最小查重字数
  const minMatchLength = settings.minDuplicateWords;
  
  // 用于记录已经匹配的位置，避免重复匹配
  const matchedPositions = new Set<string>();
  
  // 存储所有匹配位置和匹配文本
  const matchPositions: { start1: number; end1: number; start2: number; end2: number; matchedText: string }[] = [];
  
  // 寻找所有设置的最小查重字数及以上的重复内容
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      // 检查是否已经匹配过这个位置
      if (matchedPositions.has(i + ',' + j)) continue;
      
      let k = 0;
      // 找到最长的连续匹配内容
      while (i + k < m && j + k < n && preprocessed1[i + k] === preprocessed2[j + k]) {
        k++;
      }
      
      // 如果匹配长度达到最小要求
      if (k >= minMatchLength) {
        // 标记匹配位置，避免重复匹配
        for (let l = 0; l < k; l++) {
          matchedPositions.add((i + l) + ',' + (j + l));
        }
        
        // 寻找原始文本中对应的位置
        let originalIndex1 = 0;
        let preprocessedCount1 = 0;
        
        // 找到预处理文本中i位置对应的原始文本位置
        while (preprocessedCount1 < i && originalIndex1 < text1.length) {
          const preprocessedChar = preprocessText(text1[originalIndex1]);
          if (preprocessedChar) {
            preprocessedCount1++;
          }
          originalIndex1++;
        }
        
        let originalIndex2 = 0;
        let preprocessedCount2 = 0;
        
        // 找到预处理文本中j位置对应的原始文本位置
        while (preprocessedCount2 < j && originalIndex2 < text2.length) {
          const preprocessedChar = preprocessText(text2[originalIndex2]);
          if (preprocessedChar) {
            preprocessedCount2++;
          }
          originalIndex2++;
        }
        
        // 找到匹配结束位置
        let originalEnd1 = originalIndex1;
        let originalEnd2 = originalIndex2;
        preprocessedCount1 = 0;
        preprocessedCount2 = 0;
        
        while (preprocessedCount1 < k && originalEnd1 < text1.length) {
          const preprocessedChar = preprocessText(text1[originalEnd1]);
          if (preprocessedChar) {
            preprocessedCount1++;
          }
          originalEnd1++;
        }
        
        while (preprocessedCount2 < k && originalEnd2 < text2.length) {
          const preprocessedChar = preprocessText(text2[originalEnd2]);
          if (preprocessedChar) {
            preprocessedCount2++;
          }
          originalEnd2++;
        }
        
        // 保存匹配位置和匹配文本
        matchPositions.push({
          start1: originalIndex1,
          end1: originalEnd1,
          start2: originalIndex2,
          end2: originalEnd2,
          matchedText: preprocessed1.substring(i, i + k) // 保存预处理后的匹配文本
        });
      }
    }
  }
  
  // 如果没有匹配内容，返回原始文本
  if (matchPositions.length === 0) {
    return { left: text1, right: text2 };
  }
  
  // 合并重叠的匹配位置
  matchPositions.sort((a, b) => a.start1 - b.start1);
  const mergedMatches: typeof matchPositions = [matchPositions[0]];
  
  for (let i = 1; i < matchPositions.length; i++) {
    const current = matchPositions[i];
    const last = mergedMatches[mergedMatches.length - 1];
    
    if (current.start1 <= last.end1) {
      // 重叠，合并
      last.end1 = Math.max(last.end1, current.end1);
      last.end2 = Math.max(last.end2, current.end2);
      // 合并matchedText，使用更长的匹配文本
      last.matchedText = last.matchedText.length > current.matchedText.length ? last.matchedText : current.matchedText;
    } else {
      // 不重叠，添加新匹配
      mergedMatches.push(current);
    }
  }
  
  // 生成带高亮的HTML，只显示重复文字的前后小段
  let highlightedText1 = '';
  let highlightedText2 = '';
  
  // 转义正则表达式特殊字符
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // 显示所有匹配的前后小段
  for (const match of mergedMatches) {
    // 左侧文件处理
    const leftStart = Math.max(0, match.start1 - contextLength);
    const leftEnd = Math.min(text1.length, match.end1 + contextLength);
    const leftText = text1.substring(leftStart, leftEnd);
    const leftMatchText = text1.substring(match.start1, match.end1);
    
    // 从匹配位置对象中获取预处理后的匹配文本
        const matchedText = match.matchedText;
        
        // 手动构建左侧高亮HTML - 使用内联样式确保样式生效
        let leftHighlighted = leftText;
        const leftMatchIndex = leftText.indexOf(leftMatchText);
        if (leftMatchIndex !== -1) {
          leftHighlighted = 
            leftText.substring(0, leftMatchIndex) + 
            `<span class="highlighted-text" style="background-color: rgba(255, 215, 0, 0.9); color: #8B0000; padding: 3px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">${leftMatchText}</span>` + 
            leftText.substring(leftMatchIndex + leftMatchText.length);
        }
        
        // 右侧文件处理
        const rightStart = Math.max(0, match.start2 - contextLength);
        const rightEnd = Math.min(text2.length, match.end2 + contextLength);
        const rightText = text2.substring(rightStart, rightEnd);
        const rightMatchText = text2.substring(match.start2, match.end2);
        
        // 手动构建右侧高亮HTML - 使用内联样式确保样式生效
        let rightHighlighted = rightText;
        const rightMatchIndex = rightText.indexOf(rightMatchText);
        if (rightMatchIndex !== -1) {
          rightHighlighted = 
            rightText.substring(0, rightMatchIndex) + 
            `<span class="highlighted-text" style="background-color: rgba(255, 215, 0, 0.9); color: #8B0000; padding: 3px 6px; border-radius: 4px; font-weight: 700; display: inline-block;">${rightMatchText}</span>` + 
            rightText.substring(rightMatchIndex + rightMatchText.length);
        }
    
    // 添加到结果中，用分隔符分隔不同匹配
    if (highlightedText1) {
      highlightedText1 += '<div class="match-separator">...</div>';
      highlightedText2 += '<div class="match-separator">...</div>';
    }
    highlightedText1 += leftHighlighted;
    highlightedText2 += rightHighlighted;
  }
  
  // 返回左右文本的高亮内容
  return {
    left: highlightedText1,
    right: highlightedText2
  };
};

// 当设置改变时，重新计算雷同片段等级和相似度
const updateSimilarityDisplay = () => {
  if (!leftFileContent.value || !rightFileContent.value) return;

  // 重新计算文本相似度
  const similarity = calculateTextSimilarity(leftFileContent.value, rightFileContent.value);
  textSimilarity.value = `${similarity}%`;

  // 重新检测雷同片段，应用新的阈值
  const segments = detectSimilarSegments(leftFileContent.value, rightFileContent.value);
  similarSegmentsList.value = segments;
  similarSegments.value = segments.length;
  
  // 重新生成带高亮的HTML内容
  const highlightedContent = generateHighlightedContent(leftFileContent.value, rightFileContent.value);
  
  // 更新当前显示内容
  if (segments.length > 0) {
    currentContent.value = highlightedContent;
    currentLeftPage.value = segments[0].leftPage;
    currentRightPage.value = segments[0].rightPage;
  } else {
    currentContent.value = { left: '', right: '' };
  }
  
  // 更新分页信息
  currentPage.value = 1;
  totalPages.value = Math.ceil(segments.length / pageSize.value);
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value || 1;
  }
};

// 监听设置变化，实现阈值联动
import { watch } from 'vue';
watch(
  () => settings.textSimilarityThreshold,
  () => {
    if (showResults.value) {
      updateSimilarityDisplay();
    }
  }
);

// 执行对比
const handleCompare = async () => {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) return;

  isParsing.value = true;
  parseError.value = '';

  try {
    // 解析左侧文件
    const leftResult = await parseFile(leftFileInfo.value.file);
    if (leftResult.error) {
      throw new Error(leftResult.error);
    }
    leftFileContent.value = leftResult.content;

    // 解析右侧文件
    const rightResult = await parseFile(rightFileInfo.value.file);
    if (rightResult.error) {
      throw new Error(rightResult.error);
    }
    rightFileContent.value = rightResult.content;

    // 文件大小警告
    const totalChars = leftResult.content.length + rightResult.content.length;
    if (totalChars > 500000) {
      parseError.value = `文件内容较大（${(totalChars / 10000).toFixed(1)} 万字），对比可能需要较长时间，请耐心等待...`;
    }

    // 计算相似度并显示结果
    updateSimilarityDisplay();
    
    // 添加真实的对比记录
    addRecentRecord({
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
      similarity: textSimilarity.value,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      similarSegments: similarSegmentsList.value
    });
    
    // 显示结果
    showResults.value = true;
  } catch (error) {
    parseError.value = (error as Error).message;
  } finally {
    isParsing.value = false;
  }
};

// 返回文件上传界面
const handleBack = () => {
  showResults.value = false;
};



// 片段点击处理
const handleSegmentClick = (segment: SimilarSegment) => {
  // 生成该片段的高亮内容
  const highlightedContent = generateHighlightedContent(segment.leftContent, segment.rightContent);
  currentContent.value = highlightedContent;
  currentLeftPage.value = segment.leftPage;
  currentRightPage.value = segment.rightPage;
};

// 返回处理
const handleReturn = () => {
  showResults.value = false;
};

// 导出对比报告为Word格式
const handleExportReport = async () => {
  // 生成Word文档
  const doc = generateWordReport();
  
  // 生成Blob对象
  const blob = await Packer.toBlob(doc);
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '文件对比报告.docx';
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
                text: `图片相似度：${imageSimilarity.value}`,
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
      <div class="title-section">
        <h1 class="main-title">文档比对中心</h1>
        <p class="sub-title">精准识别两个版本文档之间的内容差异、相似片段和结构变更</p>
      </div>
      <button class="help-btn" title="帮助" @click="toggleHelp">
        <RiQuestionLine class="help-icon" />
      </button>
      <div class="decorative-line"></div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelp" class="help-modal-overlay" @click="toggleHelp">
      <div class="help-modal" @click.stop>
        <div class="help-modal-header">
          <h3>使用说明</h3>
          <button class="help-close-btn" @click="toggleHelp">×</button>
        </div>
        <div class="help-modal-body">
          <h4>文件对比功能</h4>
          <p>1. 分别上传源文件和修订版文件（支持拖拽或点击上传）</p>
          <p>2. 点击"一键对比"按钮开始分析</p>
          <p>3. 查看详细的对比结果和高亮标记的相似内容</p>
          <p>4. 点击雷同片段可查看详细内容</p>
          <p>5. 支持导出 Word 格式报告</p>
          <h4>支持的格式</h4>
          <p>.doc, .docx, .pdf, .txt, .ppt, .pptx, .xls, .xlsx</p>
          <h4>注意事项</h4>
          <p>单个文件大小不超过 50MB</p>
        </div>
      </div>
    </div>

    <!-- 文件上传区域 -->
    <div v-if="!showResults" class="upload-section">
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
    </div>

    <!-- 功能说明区 -->
    <div v-if="!showResults" class="features-section">
      <div class="feature-cards">
        <!-- 精确对比 -->
        <div class="feature-card">
          <div class="card-icon">
            <RiSearchLine class="icon" />
          </div>
          <h3 class="card-title">精确对比</h3>
          <p class="card-desc">采用智能算法，精确识别文本内容的每一处差异</p>
        </div>
        <!-- 高亮展示 -->
        <div class="feature-card">
          <div class="card-icon">
            <RiEditLine class="icon" />
          </div>
          <h3 class="card-title">高亮展示</h3>
          <p class="card-desc">相似内容以醒目标记高亮显示，快速定位关键信息</p>
        </div>
        <!-- 报告导出 -->
        <div class="feature-card">
          <div class="card-icon">
            <RiFileExcelLine class="icon" />
          </div>
          <h3 class="card-title">报告导出</h3>
          <p class="card-desc">一键生成详细对比报告，支持多种格式导出</p>
        </div>
      </div>

      <!-- 对比按钮 -->
      <div class="compare-btn-wrapper">
        <button class="compare-main-btn" @click="handleCompare" :disabled="isParsing">
          <RiExchangeLine class="compare-icon" :class="{ 'rotating': isParsing }" />
          <span class="compare-text">{{ isParsing ? '对比中...' : '一键对比' }}</span>
        </button>
      </div>
    </div>

    <!-- 使用说明区 -->
    <div v-if="!showResults" class="instructions-section">
      <div class="instructions-content">
        <RiInformationLine class="instructions-icon" />
        <div class="instructions-text">
          <h3 class="instructions-title">使用说明</h3>
          <p class="instruction-item">1. 分别上传源文件和修订版文件</p>
          <p class="instruction-item">2. 点击"一键对比"按钮开始分析</p>
          <p class="instruction-item">3. 查看详细的对比结果和高亮标记</p>
        </div>
      </div>
    </div>

    <!-- 最近对比记录 -->
    <RecentRecords
      v-if="showRecentRecords && !showResults"
      :recent-records="recentRecords"
      :on-clear-all="clearAllRecords"
      :on-view-record="viewHistoricalRecord"
      :on-delete-record="deleteRecord"
    />

    <!-- 解析错误显示 -->
    <div v-if="parseError" class="error-message">
      {{ parseError }}
    </div>

    <!-- 对比结果 -->
    <div v-if="showResults" class="results-section">
      <!-- 结果统计 -->
      <div class="result-stats">
        <!-- 统计信息卡片 -->
        <div class="stat-card">
          <div class="stat-icon-container text-similarity">
            <RiPercentLine class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">文本重复率</span>
            <span class="stat-value text-similarity-value">{{ textSimilarity }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-container image-similarity">
            <RiImageLine class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">图片相似度</span>
            <span class="stat-value image-similarity-value">暂不支持</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-container similar-segments">
            <RiListCheck class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">雷同片段</span>
            <span class="stat-value similar-segments-value">{{ similarSegments }}处</span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="action-btn export-btn" @click="handleExportReport">
            <RiFileExcelLine class="btn-icon" />
            <span>导出报告</span>
          </button>
          <button class="action-btn ai-analysis-btn" @click="handleAIAnalysis" :disabled="isLoading">
            <RiBrainLine class="btn-icon" />
            <span>{{ isLoading ? '分析中...' : 'AI分析' }}</span>
          </button>
          <button class="action-btn issue-tracking-btn" @click="handleBack">
            <RiArrowLeftSLine class="btn-icon" />
            <span>返回</span>
          </button>
        </div>
      </div>

      <!-- 雷同片段列表 -->
      <div class="segment-details-section">
        <!-- 表格控件 -->
        <div class="table-container">
          <table class="similarity-table">
            <thead>
              <tr>
                <th class="table-header">序号</th>
                <th class="table-header">{{ leftFileInfo.name }}</th>
                <th class="table-header">页码</th>
                <th class="table-header sortable" @click="toggleSort">
                  相似度
                  <span class="sort-icon" :class="sortAscending ? 'asc' : 'desc'">
                    {{ sortAscending ? '↑' : '↓' }}
                  </span>
                </th>
                <th class="table-header">页码</th>
                <th class="table-header">{{ rightFileInfo.name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(segment, index) in similarSegmentsList.slice((currentPage - 1) * pageSize, currentPage * pageSize)" 
                :key="segment.id"
                class="table-row"
                @click="handleSegmentClick(segment)"
              >
                <td class="table-cell index">
                  <span>{{ (currentPage - 1) * pageSize + index + 1 }}</span>
                  <RiImageLine class="image-icon" v-if="segment.isImage" title="图片对比结果" />
                </td>
                <td class="table-cell file-content">
                  <div class="file-content-inner" v-html="segment.leftContent"></div>
                </td>
                <td class="table-cell page">
                  <span class="page-number">{{ segment.leftPage }}</span>
                </td>
                <td class="table-cell similarity">
                  <span 
                    class="similarity-label" 
                    :class="segment.similarityValue >= 90 ? 'high' : segment.similarityValue >= 75 ? 'medium' : 'low'"
                  >
                    {{ segment.similarity }}
                  </span>
                </td>
                <td class="table-cell page">
                  <span class="page-number">{{ segment.rightPage }}</span>
                </td>
                <td class="table-cell file-content">
                  <div class="file-content-inner" v-html="segment.rightContent"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 分页控件 -->
      <div v-if="Math.ceil(similarSegmentsList.length / pageSize) > 1" class="pagination-container">
        <div class="pagination-info">
          <span>显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, similarSegmentsList.length) }} 条，共 {{ similarSegmentsList.length }} 条记录</span>
        </div>
        <div class="pagination-controls">
          <button 
            class="pagination-btn" 
            :disabled="currentPage === 1" 
            @click="prevPage"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div class="page-numbers">
            <!-- 页码显示 -->
            <template v-if="Math.ceil(similarSegmentsList.length / pageSize) <= 5">
              <!-- 总页数小于等于5时，显示所有页码 -->
              <button 
                v-for="page in Math.ceil(similarSegmentsList.length / pageSize)" 
                :key="page"
                class="page-btn" 
                :class="{ 'active': page === currentPage }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </template>
            <template v-else>
              <!-- 总页数大于5时，显示部分页码和省略号 -->
              <!-- 首页 -->
              <button 
                class="page-btn" 
                :class="{ 'active': currentPage === 1 }"
                @click="goToPage(1)"
              >
                1
              </button>
              
              <!-- 前省略号 -->
              <span v-if="currentPage > 3" class="page-ellipsis">...</span>
              
              <!-- 中间页码 -->
              <button 
                v-for="page in getMiddlePages()" 
                :key="page"
                class="page-btn" 
                :class="{ 'active': page === currentPage }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
              
              <!-- 后省略号 -->
              <span v-if="currentPage < Math.ceil(similarSegmentsList.length / pageSize) - 2" class="page-ellipsis">...</span>
              
              <!-- 末页 -->
              <button 
                class="page-btn" 
                :class="{ 'active': currentPage === Math.ceil(similarSegmentsList.length / pageSize) }"
                @click="goToPage(Math.ceil(similarSegmentsList.length / pageSize))"
              >
                {{ Math.ceil(similarSegmentsList.length / pageSize) }}
              </button>
            </template>
          </div>
            
          <button 
            class="pagination-btn" 
            :disabled="currentPage === Math.ceil(similarSegmentsList.length / pageSize)" 
            @click="nextPage"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基础样式 - 国潮古风 */
.file-compare-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background-color: rgba(248, 244, 233, 1);
  padding: 32px;
  gap: 32px;
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 页面标题区 */
.page-header {
  width: 100%;
  position: relative;
}

.title-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.main-title {
  font-size: 36px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
  margin: 0;
}

.sub-title {
  font-size: 16px;
  color: rgba(107, 79, 52, 1);
  font-family: SourceHanSans-Regular;
  margin: 8px 0 0 0;
}

.help-btn {
  width: 40px;
  height: 40px;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.help-btn:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  background-color: rgba(139, 0, 0, 0.05);
}

.help-icon {
  font-size: 20px;
  color: rgba(107, 79, 52, 1);
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
  gap: 32px;
  align-items: flex-start;
  justify-content: center;
}

/* 功能说明区 */
.features-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.feature-cards {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.feature-card {
  width: 360px;
  height: 196px;
  padding: 48px;
  background-color: rgba(255, 255, 255, 1);
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.card-icon .icon {
  font-size: 36px;
  color: rgba(139, 0, 0, 1);
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
  color: rgba(139, 115, 85, 1);
  font-family: SourceHanSans-Regular;
  margin: 0;
  line-height: 1.6;
}

/* 对比按钮 */
.compare-btn-wrapper {
  display: flex;
  justify-content: center;
}

.compare-main-btn {
  width: 100%;
  height: 58px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  font-size: 18px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(139, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.compare-main-btn:hover:not(:disabled) {
  box-shadow: 0 6px 24px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
}

.compare-main-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.compare-icon {
  font-size: 24px;
  transition: all 0.3s ease;
}

.compare-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.compare-text {
  font-size: 18px;
  font-weight: 600;
}

/* 使用说明区 */
.instructions-section {
  display: flex;
  justify-content: center;
}

.instructions-content {
  width: 1078px;
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
  font-size: 13px;
  color: rgba(139, 0, 0, 1);
  font-family: SourceHanSans-Regular;
  cursor: pointer;
}

.select-btn {
  padding: 10px 20px;
  background-color: rgba(139, 0, 0, 1);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.2);
  font-family: SourceHanSans-Medium;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.select-btn:hover {
  background-color: rgba(120, 0, 0, 1);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
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
  width: 32px;
  height: 32px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  color: rgba(44, 24, 16, 1);
  font-size: 13px;
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
  background-color: rgba(255, 215, 0, 0.6) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  display: inline-block !important;
  line-height: 1.4 !important;
  z-index: 1000 !important;
  position: relative !important;
}

/* file-content-inner中的高亮文本 */
.file-content-inner .highlighted-text {
  background-color: rgba(255, 215, 0, 0.7) !important;
  color: rgba(139, 0, 0, 1) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  z-index: 1000 !important;
  position: relative !important;
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

/* 帮助弹窗 */
.help-modal-overlay {
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

.help-modal {
  background-color: rgba(255, 255, 255, 1);
  border-radius: 12px;
  width: 480px;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.help-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(216, 191, 156, 0.3);
}

.help-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.help-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  font-size: 24px;
  color: rgba(107, 79, 52, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.help-close-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.help-modal-body {
  padding: 24px;
}

.help-modal-body h4 {
  font-size: 15px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 16px 0 8px 0;
  font-family: SourceHanSans-SemiBold;
}

.help-modal-body h4:first-child {
  margin-top: 0;
}

.help-modal-body p {
  font-size: 14px;
  color: rgba(107, 79, 52, 1);
  margin: 4px 0;
  font-family: SourceHanSans-Regular;
  line-height: 1.6;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(166, 124, 82, 0.8);
}
</style>