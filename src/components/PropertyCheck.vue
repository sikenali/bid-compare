<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  RiExchangeLine,
  RiFileWordLine,
  RiCheckDoubleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiFileExcelLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiQuestionLine,
  RiSearchLine,
  RiFileLine,
  RiUserLine,
  RiCalendarLine,
  RiHistoryLine,
  RiDownloadLine
} from '@remixicon/vue'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useRecentRecords } from '../composables/useRecentRecords'
import FileUpload from './FileUpload.vue'
import RecentRecords from './RecentRecords.vue'

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

// 响应式数据
const leftFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });
const rightFileInfo = ref<FileInfo>({ file: null, name: '', size: '', type: '' });

// 使用最近记录组合式函数 - 传入propertyCheck类型
const { 
  showRecentRecords, 
  recentRecords, 
  addRecentRecord, 
  clearAllRecords,
  deleteRecord
} = useRecentRecords('propertyCheck')

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
  
  // 恢复保存的属性详情数据
  if (record.propertyDetails && record.propertyDetails.length > 0) {
    propertyDetails.value = record.propertyDetails;
  } else {
    // 如果没有保存属性详情，生成默认数据
    propertyDetails.value = [
      {
        name: '文件名称',
        leftValue: record.leftFileName,
        rightValue: record.rightFileName,
        status: record.leftFileName === record.rightFileName ? 'match' : 'mismatch'
      },
      {
        name: '文件大小',
        leftValue: '未知',
        rightValue: '未知',
        status: 'mismatch'
      },
      {
        name: '文件类型',
        leftValue: getFileType(record.leftFileName),
        rightValue: getFileType(record.rightFileName),
        status: getFileType(record.leftFileName) === getFileType(record.rightFileName) ? 'match' : 'warning'
      },
      {
        name: '作者',
        leftValue: '未知',
        rightValue: '未知',
        status: 'mismatch'
      },
      {
        name: '最后一次保存者',
        leftValue: '未知',
        rightValue: '未知',
        status: 'mismatch'
      },
      {
        name: '页码范围',
        leftValue: 'N/A',
        rightValue: 'N/A',
        status: 'mismatch'
      },
      {
        name: '程序名称',
        leftValue: '未知',
        rightValue: '未知',
        status: 'mismatch'
      },
      {
        name: '公司',
        leftValue: '未知',
        rightValue: '未知',
        status: 'mismatch'
      },
      {
        name: '文本内容长度',
        leftValue: '0',
        rightValue: '0',
        status: 'match'
      },
      {
        name: '文本相似度',
        leftValue: record.similarity,
        rightValue: record.similarity,
        status: parseInt(record.similarity) >= settings.textSimilarityThreshold ? 'match' : parseInt(record.similarity) >= 50 ? 'warning' : 'mismatch'
      }
    ];
  }
  
  // 统计属性状态
  matchingProperties.value = propertyDetails.value.filter(p => p.status === 'match').length;
  nonMatchingProperties.value = propertyDetails.value.filter(p => p.status === 'mismatch').length;
  warningProperties.value = propertyDetails.value.filter(p => p.status === 'warning').length;
  
  // 显示结果界面
  showResults.value = true;
};

// 解析结果
const leftFileContent = ref('')
const leftFileProperties = ref<any>({})
const rightFileContent = ref('')
const rightFileProperties = ref<any>({})
const isParsing = ref(false)
const parseError = ref('')

// 属性检查结果
const showResults = ref(false)
const matchingProperties = ref(0)
const nonMatchingProperties = ref(0)
const warningProperties = ref(0)

// 属性差异详情
  const propertyDetails = ref([
    {
      name: '文件名称',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '文件大小',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '文件类型',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '作者',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '最后一次保存者',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '页码范围',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '程序名称',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '公司',
      leftValue: '',
      rightValue: '',
      status: 'match'
    },
    {
      name: '文本内容长度',
      leftValue: '0',
      rightValue: '0',
      status: 'match'
    },
    {
      name: '文本相似度',
      leftValue: '0%',
      rightValue: '0%',
      status: 'match'
    }
  ])

// 组件挂载时恢复 sessionStorage 中保存的结果
onMounted(() => {
  const saved = sessionStorage.getItem('propertyCheckResult')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      propertyDetails.value = data.propertyDetails || []
      matchingProperties.value = data.matchCount || 0
      nonMatchingProperties.value = data.mismatchCount || 0
      warningProperties.value = data.warningCount || 0
      leftFileInfo.value.name = data.leftFileName || ''
      rightFileInfo.value.name = data.rightFileName || ''
      showResults.value = true
    } catch {
      sessionStorage.removeItem('propertyCheckResult')
    }
  }
})

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
}

// 拖拽处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

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
}

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
}

// 帮助弹窗
const showHelp = ref(false)
const showHistory = ref(false)

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

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
  
  // 初始化dp数组，使用any类型避免类型检查
  const dp: any = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
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

// 执行属性检查
const handleCheck = async () => {
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
    leftFileProperties.value = leftResult.properties;
    
    // 解析右侧文件
    const rightResult = await parseFile(rightFileInfo.value.file);
    if (rightResult.error) {
      throw new Error(rightResult.error);
    }
    rightFileContent.value = rightResult.content;
    rightFileProperties.value = rightResult.properties;
    
    // 计算相似度
    const similarity = calculateTextSimilarity(leftFileContent.value, rightFileContent.value);
    const similarityStatus = similarity >= settings.textSimilarityThreshold ? 'match' : similarity >= 50 ? 'warning' : 'mismatch';
    
    // 更新属性详情
    propertyDetails.value = [
      {
        name: '文件名称',
        leftValue: leftFileProperties.value.文件名 || leftFileInfo.value.name,
        rightValue: rightFileProperties.value.文件名 || rightFileInfo.value.name,
        status: (leftFileProperties.value.文件名 || leftFileInfo.value.name) === (rightFileProperties.value.文件名 || rightFileInfo.value.name) ? 'match' : 'mismatch'
      },
      {
        name: '文件大小',
        leftValue: leftFileProperties.value.文件大小 || leftFileInfo.value.size,
        rightValue: rightFileProperties.value.文件大小 || rightFileInfo.value.size,
        status: (leftFileProperties.value.文件大小 || leftFileInfo.value.size) === (rightFileProperties.value.文件大小 || rightFileInfo.value.size) ? 'match' : 'mismatch'
      },
      {
        name: '文件类型',
        leftValue: leftFileProperties.value.文件类型 || leftFileInfo.value.type,
        rightValue: rightFileProperties.value.文件类型 || rightFileInfo.value.type,
        status: (leftFileProperties.value.文件类型 || leftFileInfo.value.type) === (rightFileProperties.value.文件类型 || rightFileInfo.value.type) ? 'match' : 'warning'
      },
      {
        name: '作者',
        leftValue: leftFileProperties.value.作者 || '未知',
        rightValue: rightFileProperties.value.作者 || '未知',
        status: (leftFileProperties.value.作者 || '未知') === (rightFileProperties.value.作者 || '未知') ? 'match' : 'mismatch'
      },
      {
        name: '最后一次保存者',
        leftValue: leftFileProperties.value.最后一次保存者 || '未知',
        rightValue: rightFileProperties.value.最后一次保存者 || '未知',
        status: (leftFileProperties.value.最后一次保存者 || '未知') === (rightFileProperties.value.最后一次保存者 || '未知') ? 'match' : 'mismatch'
      },
      {
            name: '页码范围',
            leftValue: leftFileProperties.value.页码范围 || 'N/A',
            rightValue: rightFileProperties.value.页码范围 || 'N/A',
            status: (leftFileProperties.value.页码范围 || 'N/A') === (rightFileProperties.value.页码范围 || 'N/A') ? 'match' : 'mismatch'
          },
      {
        name: '程序名称',
        leftValue: leftFileProperties.value.程序名称 || '未知',
        rightValue: rightFileProperties.value.程序名称 || '未知',
        status: (leftFileProperties.value.程序名称 || '未知') === (rightFileProperties.value.程序名称 || '未知') ? 'match' : 'warning'
      },
      {
        name: '公司',
        leftValue: leftFileProperties.value.公司 || '未知',
        rightValue: rightFileProperties.value.公司 || '未知',
        status: (leftFileProperties.value.公司 || '未知') === (rightFileProperties.value.公司 || '未知') ? 'match' : 'mismatch'
      },
      {
        name: '文本内容长度',
        leftValue: leftFileProperties.value.文本内容长度 || leftFileContent.value.length.toString(),
        rightValue: rightFileProperties.value.文本内容长度 || rightFileContent.value.length.toString(),
        status: (leftFileProperties.value.文本内容长度 || leftFileContent.value.length.toString()) === (rightFileProperties.value.文本内容长度 || rightFileContent.value.length.toString()) ? 'match' : 'mismatch'
      },
      {
        name: '文本相似度',
        leftValue: `${similarity}%`,
        rightValue: `${similarity}%`,
        status: similarityStatus
      }
    ];
    
    // 统计属性状态
    matchingProperties.value = propertyDetails.value.filter(p => p.status === 'match').length;
    nonMatchingProperties.value = propertyDetails.value.filter(p => p.status === 'mismatch').length;
    warningProperties.value = propertyDetails.value.filter(p => p.status === 'warning').length;
    
    // 添加真实的对比记录
    addRecentRecord({
      filename: `${leftFileInfo.value.name} vs ${rightFileInfo.value.name}`,
      timestamp: new Date().toLocaleString(),
      similarity: `${similarity}%`,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      propertyDetails: propertyDetails.value
    });
    
    // 显示结果
    showResults.value = true;

    // 持久化结果到 sessionStorage
    sessionStorage.setItem('propertyCheckResult', JSON.stringify({
      matchCount: matchingProperties.value,
      mismatchCount: nonMatchingProperties.value,
      warningCount: warningProperties.value,
      propertyDetails: propertyDetails.value,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name
    }))
  } catch (error) {
    parseError.value = (error as Error).message;
  } finally {
    isParsing.value = false;
  }
}

// 导出属性报告为Word格式
const handleExportReport = async () => {
  try {
    // 生成Word文档
    const doc = generateWordReport()
    
    // 生成Blob对象
    const blob = await Packer.toBlob(doc)
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '属性对比报告.docx'
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('导出报告失败:', error)
    alert('导出报告失败，请重试')
  }
}

// 返回文件上传界面
const handleBack = () => {
  showResults.value = false
}

// 生成Word报告内容
const generateWordReport = () => {
  // 确保只有当有属性数据时才生成报告
  if (propertyDetails.value.length === 0) {
    alert('没有可导出的属性对比数据')
    return new Document()
  }
  
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
                text: '属性对比报告',
                bold: true,
                size: 24,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 200,
            }
          }),
          
          // 添加属性统计
          new Paragraph({
            children: [
              new TextRun({
                text: '属性统计：',
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
                text: `匹配属性：${matchingProperties.value}项`,
                size: 16,
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `不匹配属性：${nonMatchingProperties.value}项`,
                size: 16,
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `警告属性：${warningProperties.value}项`,
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
          
          // 添加属性详情表格
          new Paragraph({
            children: [
              new TextRun({
                text: '属性差异详情：',
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
                    children: [new Paragraph({ text: '对比类型', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: leftFileInfo.value.name, bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: rightFileInfo.value.name, bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '是否匹配', bold: true, alignment: AlignmentType.CENTER })],
                    shading: {
                      fill: '#f0f0f0',
                    }
                  }),
                ],
              }),
              // 表格数据行
              ...propertyDetails.value.map((property) => {
                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: property.name, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: property.leftValue, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: property.rightValue, alignment: AlignmentType.CENTER })]
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: property.status === 'match' ? '匹配' : property.status === 'mismatch' ? '不匹配' : '警告', 
                        alignment: AlignmentType.CENTER 
                      })]
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
  
  return doc
}
</script>

<template>
  <div class="property-check-container">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-row">
        <div>
          <h1 class="page-title">属性检查</h1>
          <p class="page-subtitle">对比两个文件的基础属性信息，快速识别差异</p>
        </div>
        <div class="header-actions">
          <button v-if="showResults" class="header-back-btn" @click="handleBack" title="返回">
            <RiArrowLeftSLine class="header-btn-icon" />
            <span class="header-btn-text">返回</span>
          </button>
          <button v-if="showResults" class="header-export-btn" @click="handleExportReport" title="导出报告">
            <RiDownloadLine class="header-btn-icon" />
            <span class="header-btn-text">导出报告</span>
          </button>
          <button v-if="!showResults" class="icon-btn" title="历史记录" @click="toggleHistory">
            <RiHistoryLine class="icon-btn-svg" />
          </button>
          <button class="help-btn" v-if="!showResults" title="帮助" @click="toggleHelp">
            <RiQuestionLine class="help-icon" />
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
          />
          <div v-else class="empty-history">
            <p>暂无历史记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelp" class="help-modal-overlay" @click="toggleHelp">
      <div class="help-modal" @click.stop>
        <div class="help-modal-header">
          <h3>功能介绍</h3>
          <button class="help-close-btn" @click="toggleHelp">×</button>
        </div>
        <div class="help-modal-body">
          <div class="help-feature-cards">
            <div class="help-feature-card">
              <div class="card-icon accuracy">
                <RiFileLine class="icon" />
              </div>
              <h3 class="card-title">文件类型检查</h3>
              <p class="card-desc">自动识别并对比两个文件的类型和大小，快速发现基本差异。</p>
            </div>
            <div class="help-feature-card">
              <div class="card-icon highlight">
                <RiUserLine class="icon" />
              </div>
              <h3 class="card-title">作者信息比对</h3>
              <p class="card-desc">提取文档作者和最后保存者信息，确保文档来源可靠。</p>
            </div>
            <div class="help-feature-card">
              <div class="card-icon export">
                <RiCalendarLine class="icon" />
              </div>
              <h3 class="card-title">时间戳验证</h3>
              <p class="card-desc">对比创建时间和修改时间，发现文档是否被篡改。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件上传区域 -->
    <div v-if="!showResults" class="upload-section" :class="{ 'processing': isParsing }">
      <!-- 文件A上传 -->
      <FileUpload
        side="left"
        :file-info="leftFileInfo"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />

      <!-- 检查按钮 -->
      <div class="check-btn-wrapper">
        <button class="start-check-btn" @click="handleCheck" :disabled="isParsing" title="开始检查">
          <RiExchangeLine class="check-icon" :class="{ 'rotating': isParsing }" />
        </button>
      </div>

      <!-- 文件B上传 -->
      <FileUpload
        side="right"
        :file-info="rightFileInfo"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />

      <!-- 处理中遮罩 -->
      <div v-if="isParsing" class="processing-overlay">
        <div class="processing-content">
          <div class="processing-spinner"></div>
          <p class="processing-text">正在检查文件...</p>
        </div>
      </div>
    </div>

    <!-- 解析错误显示 -->
    <div v-if="parseError" class="error-message">
      {{ parseError }}
    </div>

    <!-- 属性检查结果 -->
    <div v-if="showResults" class="results-section">
      <!-- 属性统计 -->
      <div class="property-stats">
        <div class="stat-item match">
          <div class="stat-icon-container match">
            <RiCheckDoubleLine class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">匹配属性</span>
            <span class="stat-value match">{{ matchingProperties }}项</span>
          </div>
        </div>
        <div class="stat-item mismatch">
          <div class="stat-icon-container mismatch">
            <RiCloseCircleLine class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">不匹配属性</span>
            <span class="stat-value mismatch">{{ nonMatchingProperties }}项</span>
          </div>
        </div>
        <div class="stat-item warning">
          <div class="stat-icon-container warning">
            <RiAlertLine class="stat-icon" />
          </div>
          <div class="stat-content">
            <span class="stat-label">警告属性</span>
            <span class="stat-value warning">{{ warningProperties }}项</span>
          </div>
        </div>
        <div class="export-section">
          <!-- 按钮已移动到头部 -->
        </div>
      </div>

      <!-- 属性差异详情 -->
        <div class="property-details-section">
          <div class="section-header">
            <h3 class="section-title">属性对比详情</h3>
          </div>
          
          <!-- 整合后的属性表格 -->
          <div class="property-table">
            <div class="table-header">
              <div class="table-col prop-name">对比类型</div>
              <div class="table-col prop-value-left">文件名称</div>
              <div class="table-col prop-value-right">文件名称</div>
              <div class="table-col prop-status">是否匹配</div>
            </div>
            <div class="table-body">
              <div 
                v-for="(property, index) in propertyDetails" 
                :key="index"
                class="table-row"
                :class="`status-${property.status}`"
              >
                <div class="table-col prop-name">{{ property.name }}</div>
                <div class="table-col prop-value-left">{{ property.leftValue }}</div>
                <div class="table-col prop-value-right">{{ property.rightValue }}</div>
                <div class="table-col prop-status">
                  <span :class="`status-tag status-${property.status}`">
                    {{ property.status === 'match' ? '匹配' : property.status === 'mismatch' ? '不匹配' : '警告' }}
                  </span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.property-check-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background-color: rgba(248, 244, 233, 1);
  gap: 20px;
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
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-back-btn {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(107, 79, 52, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.3s ease;
}

.header-back-btn:hover {
  background-color: rgba(139, 0, 0, 0.05);
  border-color: rgba(139, 0, 0, 1);
}

.header-export-btn {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background-color: rgba(46, 89, 132, 1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  transition: all 0.3s ease;
}

.header-export-btn:hover {
  background-color: rgba(46, 89, 132, 0.9);
  box-shadow: 0 4px 12px rgba(46, 89, 132, 0.3);
}

.header-btn-icon {
  font-size: 18px;
}

.header-back-btn .header-btn-icon {
  color: rgba(107, 79, 52, 1);
}

.header-export-btn .header-btn-icon {
  color: rgba(255, 255, 255, 1);
}

.header-btn-text {
  font-size: 14px;
  font-weight: 500;
}

.icon-btn {
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

.icon-btn:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  background-color: rgba(139, 0, 0, 0.05);
}

.icon-btn-svg {
  font-size: 20px;
  color: rgba(107, 79, 52, 1);
}

.history-modal {
  background-color: rgba(255, 255, 255, 1);
  border-radius: 12px;
  width: 600px;
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

.help-btn:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
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
  gap: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  position: relative;
}

.upload-section.processing {
  pointer-events: none;
}

/* 处理中遮罩 */
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

.check-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.start-check-btn {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 50%;
  background: rgba(139, 0, 0, 1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.start-check-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.4);
  transform: scale(1.05);
}

.start-check-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.check-icon {
  font-size: 28px;
  transition: all 0.3s ease;
}

.check-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-box {
  flex: 1;
  min-width: 300px;
  height: 180px;
  border: 2px dashed rgba(166, 124, 82, 0.4);
  border-radius: 8px;
  background-color: rgba(248, 244, 233, 0.5);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-box:hover {
  border-color: rgba(139, 0, 0, 1);
  background-color: rgba(139, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.15);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 36px;
  color: rgba(166, 124, 82, 1);
  transition: all 0.3s;
}

.upload-box:hover .upload-icon {
  color: rgba(139, 0, 0, 1);
}

.upload-text {
  font-size: 14px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.file-input {
  display: none;
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

/* 已上传文件信息 */
.file-info-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  text-align: center;
  width: 100%;
}

.file-name {
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(44, 24, 16, 0.08);
  font-family: SourceHanSans-Medium;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

.file-type, .file-size {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

/* 更换文件按钮 */
.replace-btn {
  position: absolute;
  bottom: 16px;
  opacity: 0;
  visibility: hidden;
  padding: 8px 16px;
  background-color: rgba(139, 0, 0, 0.9);
  color: white;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-family: SourceHanSans-Medium;
  z-index: 10;
}

.upload-box:hover .replace-btn {
  opacity: 1;
  visibility: visible;
}

.replace-btn:hover {
  background-color: rgba(120, 0, 0, 1);
}

/* 错误信息样式 */
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

.check-btn-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  flex-shrink: 0;
}

.check-btn {
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #FFFFFF;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: #FFFFFF;
  font-size: 24px;
  transition: all 0.3s ease;
}

.check-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.check-btn:hover {
  transform: rotate(90deg);
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
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

.view-all {
  font-size: 13px;
  color: rgba(139, 0, 0, 1);
  font-family: SourceHanSans-Regular;
  cursor: pointer;
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

/* 属性检查结果 */
.results-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 属性统计 */
.property-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 统计图标容器 */
.stat-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-container.match {
  background-color: rgba(34, 139, 34, 0.1);
}

.stat-icon-container.mismatch {
  background-color: rgba(139, 0, 0, 0.1);
}

.stat-icon-container.warning {
  background-color: rgba(255, 165, 0, 0.1);
}

.stat-icon {
  font-size: 18px;
}

.stat-icon-container.match .stat-icon {
  color: rgba(34, 139, 34, 1);
}

.stat-icon-container.mismatch .stat-icon {
  color: rgba(139, 0, 0, 1);
}

.stat-icon-container.warning .stat-icon {
  color: rgba(255, 165, 0, 1);
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

.stat-value.match {
  color: rgba(34, 139, 34, 1);
}

.stat-value.mismatch {
  color: rgba(139, 0, 0, 1);
}

.stat-value.warning {
  color: rgba(255, 165, 0, 1);
}

.export-section {
  display: flex;
  gap: 12px;
}

/* 操作按钮 */
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

.export-btn {
  background-color: rgba(139, 0, 0, 1);
  color: white;
}

.export-btn:hover {
  background-color: rgba(120, 0, 0, 1);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
}

.issue-tracking-btn {
  background-color: rgba(166, 124, 82, 1);
  color: white;
}

.issue-tracking-btn:hover {
  background-color: rgba(145, 108, 70, 1);
  box-shadow: 0 4px 12px rgba(166, 124, 82, 0.3);
}

/* 属性差异详情 */
.property-details-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  overflow: hidden;
}

/* 区域标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: rgba(248, 244, 233, 0.5);
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

.view-options {
  display: flex;
  gap: 8px;
}

.view-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  background-color: rgba(255, 255, 255, 0.9);
  color: rgba(166, 124, 82, 1);
  font-size: 13px;
  font-family: SourceHanSans-Regular;
  cursor: pointer;
  transition: all 0.3s;
}

.view-btn.active {
  background-color: rgba(139, 0, 0, 1);
  color: white;
  border-color: rgba(139, 0, 0, 1);
}

/* 属性表格 */
.property-table {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 120px;
  padding: 12px 16px;
  background-color: rgba(248, 244, 233, 0.8);
  border-bottom: 2px solid rgba(166, 124, 82, 0.3);
  font-family: SourceHanSans-SemiBold;
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 120px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.15);
  transition: background-color 0.2s;
  align-items: center;
}

.table-row:hover {
  background-color: rgba(248, 244, 233, 0.3);
}

.table-row.status-mismatch {
  background-color: rgba(139, 0, 0, 0.05);
}

.table-row.status-mismatch:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.table-col {
  font-size: 13px;
  font-family: SourceHanSans-Regular;
  color: rgba(44, 24, 16, 1);
}

.prop-name {
  color: rgba(44, 24, 16, 1);
  font-weight: 500;
}

.prop-value-left,
.prop-value-right {
  color: rgba(166, 124, 82, 1);
}

/* 状态标签 */
.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  white-space: nowrap;
}

.status-match {
  background-color: rgba(34, 139, 34, 0.1);
  color: rgba(34, 139, 34, 1);
}

.status-mismatch {
  background-color: rgba(139, 0, 0, 0.1);
  color: rgba(139, 0, 0, 1);
}

.status-warning {
  background-color: rgba(255, 165, 0, 0.1);
  color: rgba(255, 165, 0, 1);
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

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(166, 124, 82, 0.8);
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
  width: 900px;
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
</style>