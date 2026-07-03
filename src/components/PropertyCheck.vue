<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  RiExchangeLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiQuestionLine,
  RiFileLine,
  RiUserLine,
  RiCalendarLine,
  RiHistoryLine
} from '@remixicon/vue'
import { useFileParser } from '../composables/useFileParser'
import { useSettings } from '../composables/useSettings'
import { useRecentRecords } from '../composables/useRecentRecords'
import { calculateTextSimilarity } from '../utils/textAlgorithms'
import { storePropertyCheckResult } from '../utils/compareResultStore'
import { buildPropertyDetails, propsMapSource, recordSource } from '../utils/propertyFields'
import FileUpload from './FileUpload.vue'
import RecentRecords from './RecentRecords.vue'
import { BorderBeam } from 'vue3-border-beam'

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
  // 恢复保存的属性详情数据
  let propertyDetails = []
  
  if (record.propertyDetails && record.propertyDetails.length > 0) {
    propertyDetails = record.propertyDetails
  } else {
    // 如果没有保存属性详情，生成默认数据(与 handleCheck 保持相同的 13 个字段)
    const leftSrc = recordSource({
      leftFileName: record.leftFileName,
      rightFileName: record.leftFileName,
      leftFileType: getFileType(record.leftFileName),
      rightFileType: getFileType(record.leftFileName)
    });
    const rightSrc = recordSource({
      leftFileName: record.rightFileName,
      rightFileName: record.rightFileName,
      leftFileType: getFileType(record.rightFileName),
      rightFileType: getFileType(record.rightFileName)
    });
    propertyDetails = buildPropertyDetails(leftSrc, rightSrc, 'N/A');
  }

  // 统计属性状态
  const matchingProperties = propertyDetails.filter((p: any) => p.status === 'match').length
  const nonMatchingProperties = propertyDetails.filter((p: any) => p.status === 'mismatch').length
  const warningProperties = propertyDetails.filter((p: any) => p.status === 'warning').length

  // 将历史记录数据存储到模块级存储中
  const checkResult = {
    propertyDetails: propertyDetails,
    leftFileName: record.leftFileName,
    rightFileName: record.rightFileName,
    totalProperties: propertyDetails.length,
    matchingProperties: matchingProperties,
    nonMatchingProperties: nonMatchingProperties,
    warningProperties: warningProperties,
    similarity: record.similarity,
    leftFileProperties: {},
    rightFileProperties: {},
    similarityStatus: 'match'
  }

  // 存储到模块级存储
  const resultId = storePropertyCheckResult(checkResult)

  // 跳转到结果页面，传递存储 ID 和时间戳
  router.push({ path: '/property-check-result', query: { resultId, t: Date.now() } })
  
  // 关闭历史记录弹窗
  showHistory.value = false
}

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
const propertyDetails = ref<any[]>([])

// 组件挂载时不恢复结果，总是显示主界面
// 刷新页面后返回检查界面，不恢复之前的检查结果

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
    
    // 计算相似度（使用优化后的算法，滚动数组实现空间 O(min(m,n))）
    const similarity = calculateTextSimilarity(leftFileContent.value, rightFileContent.value, settings);
    const similarityStatus = similarity >= settings.textSimilarityThreshold ? 'match' : similarity >= 50 ? 'warning' : 'mismatch';
    
    // 更新属性详情
    const leftSrc = propsMapSource(
      leftFileProperties.value,
      leftFileInfo.value.name,
      leftFileInfo.value.size,
      leftFileInfo.value.type
    );
    const rightSrc = propsMapSource(
      rightFileProperties.value,
      rightFileInfo.value.name,
      rightFileInfo.value.size,
      rightFileInfo.value.type
    );
    propertyDetails.value = buildPropertyDetails(leftSrc, rightSrc);

    // 文件大小特殊处理:使用原始字节数比较,避免格式化字符串精度问题
    if (leftFileInfo.value.file && rightFileInfo.value.file) {
      const sizeIdx = propertyDetails.value.findIndex(p => p.name === '文件大小');
      if (sizeIdx >= 0) {
        const sameBytes = leftFileInfo.value.file.size === rightFileInfo.value.file.size;
        propertyDetails.value[sizeIdx] = {
          ...propertyDetails.value[sizeIdx],
          status: sameBytes ? 'match' : 'mismatch'
        };
      }
    }
    
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

    // 保存检查结果到模块级存储
    const checkResult = {
      propertyDetails: propertyDetails.value,
      leftFileName: leftFileInfo.value.name,
      rightFileName: rightFileInfo.value.name,
      totalProperties: propertyDetails.value.length,
      matchingProperties: matchingProperties.value,
      nonMatchingProperties: nonMatchingProperties.value,
      warningProperties: warningProperties.value,
      similarity: `${similarity}%`,
      leftFileProperties: leftFileProperties.value,
      rightFileProperties: rightFileProperties.value,
      similarityStatus: similarityStatus
    }
    const resultId = storePropertyCheckResult(checkResult)

    // 跳转到结果页面，传递存储 ID
    router.push({ path: '/property-check-result', query: { resultId, t: Date.now() } })
  } catch (error) {
    parseError.value = (error as Error).message;
  } finally {
    isParsing.value = false;
  }
}

// 导出属性报告为Word格式
const handleExportReport = async () => {
  try {
    // 生成文件名：文件A_vs_文件B_属性检查报告
    const leftName = leftFileInfo.value.name.replace(/\.[^/.]+$/, '') || '文件A';
    const rightName = rightFileInfo.value.name.replace(/\.[^/.]+$/, '') || '文件B';
    const fileName = `${leftName}_vs_${rightName}_属性检查报告`;

    // 生成Word文档
    const doc = generateWordReport()

    // 生成Blob对象
    const blob = await Packer.toBlob(doc)

    // 创建下载链接
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.docx`

    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    alert('导出报告失败，请重试')
  }
}

// 返回文件上传界面
const handleBack = () => {
  showResults.value = false
  // 重置检查结果状态，但保留已上传的文件信息
  isParsing.value = false;
  parseError.value = '';
  propertyDetails.value = [];
  matchingProperties.value = 0;
  nonMatchingProperties.value = 0;
  warningProperties.value = 0;
  leftFileContent.value = '';
  rightFileContent.value = '';
  leftFileProperties.value = {};
  rightFileProperties.value = {};
  // 注意：不清理 leftFileInfo 和 rightFileInfo，保留已上传的文件
  // 用户可以重新点击检查或上传新文件
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

    <!-- 文件上传区域 -->
    <div class="upload-section" :class="{ 'processing': isParsing }">
      <!-- 文件A上传 -->
      <FileUpload
        side="left"
        :file-info="leftFileInfo"
        :on-file-change="handleFileUpload"
        :on-drag-over="handleDragOver"
        :on-drop="handleDrop"
        :on-clear-file="handleClearFile"
      />

      <!-- 属性检查圆形按钮 -->
      <div class="check-circle-wrapper">
        <BorderBeam size="md" color-variant="colorful" theme="dark" :duration="2.4">
          <button class="check-circle-btn" @click="handleCheck" :disabled="isParsing" :class="{ 'processing': isParsing }">
            <RiExchangeLine class="check-circle-icon" :class="{ 'rotating': isParsing }" />
            <span class="check-circle-text">属性检查</span>
          </button>
        </BorderBeam>
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

    <!-- 进度显示 -->
    <div v-if="isParsing" class="progress-display">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill"></div>
      </div>
      <span class="progress-text">正在检查中...</span>
    </div>

    <!-- 解析错误显示 -->
    <div v-if="parseError" class="error-message">
      {{ parseError }}
    </div>
  </div>
</template>

<style scoped>
.property-check-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: rgba(var(--rgb-parchment), 1);
  gap: 12px;
  font-family: var(--font-ui);
}

/* 页面标题区 */
.page-header {
  padding: 16px 24px;
  background-color: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  box-shadow: 0 2px 8px rgba(var(--rgb-brown-dark), 0.08);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-brown-dark);
  margin: 0 0 4px 0;
  font-family: var(--font-ui);
}

.page-subtitle {
  font-size: 12px;
  color: var(--color-brown);
  margin: 0;
  font-family: var(--font-ui);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-back-btn {
  height: 40px;
  padding: 0 20px;
  background-color: var(--color-white);
  color: var(--color-cinnabar);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.3);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  transition: all 0.3s ease;
}

.header-back-btn:hover {
  background-color: rgba(var(--rgb-cinnabar), 0.05);
  border-color: var(--color-cinnabar);
}

.header-export-btn {
  height: 40px;
  padding: 0 20px;
  background: var(--color-cinnabar);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.3);
  transition: all 0.3s ease;
}

.header-export-btn:hover {
  box-shadow: 0 6px 16px rgba(var(--rgb-cinnabar), 0.4);
  transform: translateY(-2px);
}

/* 图标按钮容器 */
.icon-btn-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-cinnabar);
  color: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-btn-wrapper:hover {
  box-shadow: 0 6px 20px rgba(var(--rgb-cinnabar), 0.4);
  transform: translateY(-2px);
  background: var(--color-cinnabar-dark);
}

.icon-btn-wrapper:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(var(--rgb-cinnabar), 0.3);
}

.icon-btn-svg {
  font-size: 20px;
  width: 20px;
  height: 20px;
  color: var(--color-white);
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
  background-color: rgba(var(--rgb-brown-dark), 0.9);
  color: white;
  font-size: 11px;
  font-family: var(--font-ui);
  border-radius: var(--radius-xs);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.icon-btn-wrapper:hover .icon-btn-tooltip {
  opacity: 1;
}

.history-modal {
  background-color: var(--color-white);
  border-radius: var(--radius-lg);
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
  color: var(--color-brown-muted);
  font-size: 14px;
  font-family: var(--font-ui);
}

.help-btn:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.help-icon {
  font-size: 20px;
  color: var(--color-brown);
}

.decorative-line {
  width: 100%;
  height: 3px;
  margin-top: 24px;
  background: var(--color-tan-dark);
  border-radius: var(--radius-xs);
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

/* 属性检查圆形按钮 */
.check-circle-wrapper {
  flex-shrink: 0;
}

.check-circle-btn {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: none;
  background: var(--color-cinnabar);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 6px 20px rgba(var(--rgb-cinnabar), 0.35);
  transition: all 0.3s ease;
}

.check-circle-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(var(--rgb-cinnabar), 0.45);
}

.check-circle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.check-circle-icon {
  font-size: 28px;
  transition: transform 0.3s ease;
}

.check-circle-icon.rotating {
  animation: rotate 1s linear infinite;
}

.check-circle-text {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-ui);
}

/* 检查按钮区域 */
.check-action-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  gap: 16px;
}

/* 检查按钮 */
.start-check-btn {
  position: relative;
  width: 980px;
  height: 40px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-cinnabar);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.3);
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-ui);
  overflow: hidden;
}

.start-check-btn::before {
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

.start-check-btn:hover:not(:disabled)::before {
  transform: translateX(100%);
}

.start-check-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(var(--rgb-cinnabar), 0.4);
  transform: translateY(-2px);
}

.start-check-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.start-check-btn.processing {
  background: linear-gradient(90deg, 
    var(--color-cinnabar) 0%, 
    rgba(var(--rgb-cinnabar), 0.8) 50%, 
    var(--color-cinnabar) 100%);
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

.check-icon {
  font-size: 24px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.check-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  background-color: rgba(var(--rgb-tan-dark), 0.3);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  width: 30%;
  background: var(--color-cinnabar);
  border-radius: var(--radius-xs);
  animation: indeterminate-progress 1.5s ease-in-out infinite;
}

@keyframes indeterminate-progress {
  0% { width: 0%; margin-left: 0; }
  50% { width: 30%; margin-left: 35%; }
  100% { width: 0%; margin-left: 100%; }
}

.progress-text {
  font-size: 13px;
  color: var(--color-brown);
  font-family: var(--font-ui);
  text-align: center;
}

/* 处理中遮罩 */
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--rgb-parchment), 0.9);
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
  border-top-color: var(--color-cinnabar);
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

/* 错误信息样式 */
.error-message {
  color: var(--color-cinnabar);
  font-size: 14px;
  text-align: center;
  margin: 16px 0;
  padding: 12px;
  background-color: rgba(var(--rgb-cinnabar), 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.2);
  font-family: var(--font-ui);
}

.upload-box {
  flex: 1;
  min-width: 300px;
  height: 180px;
  border: 2px dashed rgba(var(--rgb-brown-muted), 0.4);
  border-radius: var(--radius-md);
  background-color: rgba(var(--rgb-parchment), 0.5);
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
  border-color: var(--color-cinnabar);
  background-color: rgba(var(--rgb-cinnabar), 0.05);
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.15);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 36px;
  color: var(--color-brown-muted);
  transition: all 0.3s;
}

.upload-box:hover .upload-icon {
  color: var(--color-cinnabar);
}

.upload-text {
  font-size: 14px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.file-input {
  display: none;
}

.select-btn {
  padding: 10px 20px;
  background: var(--color-cinnabar);
  color: white;
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.select-btn:hover {
  box-shadow: 0 6px 16px rgba(var(--rgb-cinnabar), 0.4);
  transform: translateY(-2px);
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
  color: var(--color-brown-dark);
  font-weight: 500;
  background-color: var(--color-cream);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 6px rgba(var(--rgb-brown-dark), 0.08);
  font-family: var(--font-ui);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.file-type, .file-size {
  background-color: var(--color-cream);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

/* 更换文件按钮 */
.replace-btn {
  position: absolute;
  bottom: 16px;
  opacity: 0;
  visibility: hidden;
  padding: 8px 16px;
  background-color: rgba(var(--rgb-cinnabar), 0.9);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-family: var(--font-ui);
  z-index: 10;
}

.upload-box:hover .replace-btn {
  opacity: 1;
  visibility: visible;
}

.replace-btn:hover {
  background-color: var(--color-cinnabar-dark);
}

/* 错误信息样式 */
.error-message {
  color: var(--color-cinnabar);
  font-size: 14px;
  text-align: center;
  margin: 16px 0;
  padding: 12px;
  background-color: rgba(var(--rgb-cinnabar), 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-cinnabar), 0.2);
  font-family: var(--font-ui);
}

/* 最近对比记录 */
.recent-records {
  background-color: var(--color-cream);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(var(--rgb-brown-dark), 0.08);
  padding: 20px;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.records-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.view-all {
  font-size: 13px;
  color: var(--color-cinnabar);
  font-family: var(--font-ui);
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
  background-color: rgba(var(--rgb-parchment), 0.5);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  border: 1px solid rgba(var(--rgb-brown-muted), 0.15);
  transition: all 0.3s ease;
}

.record-item:hover {
  background-color: rgba(var(--rgb-parchment), 0.8);
  border-color: rgba(var(--rgb-brown-muted), 0.3);
}

.record-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-icon {
  font-size: 16px;
  color: var(--color-brown-muted);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-filename {
  font-size: 14px;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.record-timestamp {
  font-size: 12px;
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.record-actions {
  display: flex;
  gap: 8px;
}

.record-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(var(--rgb-brown-muted), 0.3);
  border-radius: var(--radius-sm);
  background-color: var(--color-cream);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: var(--color-brown-muted);
  font-size: 14px;
}

.record-action-btn:hover {
  background-color: var(--color-cinnabar);
  color: white;
  border-color: var(--color-cinnabar);
}

/* 属性检查结果 */
.results-section {
  background-color: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  box-shadow: 0 2px 8px rgba(var(--rgb-brown-dark), 0.08);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 属性统计 */
.property-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: rgba(var(--rgb-parchment), 0.5);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
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
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-container.match {
  background-color: rgba(var(--rgb-jade), 0.1);
}

.stat-icon-container.mismatch {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
}

.stat-icon-container.warning {
  background-color: rgba(255, 165, 0, 0.1);
}

.stat-icon {
  font-size: 18px;
}

.stat-icon-container.match .stat-icon {
  color: var(--color-jade-light);
}

.stat-icon-container.mismatch .stat-icon {
  color: var(--color-cinnabar);
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
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-ui);
}

.stat-value.match {
  color: var(--color-jade-light);
}

.stat-value.mismatch {
  color: var(--color-cinnabar);
}

.stat-value.warning {
  color: rgba(255, 165, 0, 1);
}

.export-section {
  display: flex;
  gap: 12px;
}

.export-btn {
  background-color: var(--color-cinnabar);
  color: white;
}

.export-btn:hover {
  background-color: var(--color-cinnabar-dark);
  box-shadow: 0 4px 12px rgba(var(--rgb-cinnabar), 0.3);
}

.issue-tracking-btn {
  background-color: var(--color-brown-muted);
  color: white;
}

.issue-tracking-btn:hover {
  background-color: var(--color-brown-muted);
  box-shadow: 0 4px 12px rgba(var(--rgb-brown-muted), 0.3);
}

/* 属性差异详情 */
.property-details-section {
  background-color: var(--color-cream);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  box-shadow: 0 2px 8px rgba(var(--rgb-brown-dark), 0.08);
  overflow: hidden;
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background-color: rgba(var(--rgb-parchment), 0.5);
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.section-icon-container {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--rgb-cinnabar), 0.1);
  flex-shrink: 0;
}

.section-icon {
  font-size: 18px;
  color: var(--color-cinnabar);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin: 0;
}

.view-options {
  display: flex;
  gap: 8px;
}

.view-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.3);
  background-color: var(--color-cream);
  color: var(--color-brown-muted);
  font-size: 13px;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all 0.3s;
}

.view-btn.active {
  background-color: var(--color-cinnabar);
  color: white;
  border-color: var(--color-cinnabar);
}

/* 属性表格 */
.property-table {
  background-color: var(--color-cream);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 120px;
  padding: 12px 16px;
  background-color: rgba(var(--rgb-parchment), 0.8);
  border-bottom: 2px solid rgba(var(--rgb-brown-muted), 0.3);
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-brown-dark);
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 120px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.15);
  transition: background-color 0.2s;
  align-items: center;
}

.table-row:hover {
  background-color: rgba(var(--rgb-parchment), 0.3);
}

.table-row.status-mismatch {
  background-color: rgba(var(--rgb-cinnabar), 0.05);
}

.table-row.status-mismatch:hover {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
}

.table-col {
  font-size: 13px;
  font-family: var(--font-ui);
  color: var(--color-brown-dark);
}

.prop-name {
  color: var(--color-brown-dark);
  font-weight: 500;
}

.prop-value-left,
.prop-value-right {
  color: var(--color-brown-muted);
}

/* 状态标签 */
.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-lg);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-ui);
  white-space: nowrap;
}

.status-match {
  background-color: rgba(var(--rgb-jade), 0.1);
  color: var(--color-jade-light);
}

.status-mismatch {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
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
  background-color: rgba(var(--rgb-brown-muted), 0.5);
  border-radius: var(--radius-xs);
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--rgb-brown-muted), 0.8);
}

/* 历史记录/帮助弹窗 - 统一样式 */
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
  background-color: rgba(var(--rgb-parchment), 1);
  border-radius: var(--radius-lg);
  width: 600px;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--rgb-brown-muted), 0.2);
}

.help-modal-header,
.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(var(--rgb-brown-muted), 0.2);
  background-color: var(--color-cream);
}

.help-modal-header h3,
.history-modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
  font-family: var(--font-ui);
}

.help-close-btn,
.history-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background-color: transparent;
  cursor: pointer;
  font-size: 20px;
  color: var(--color-brown);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.help-close-btn:hover,
.history-close-btn:hover {
  background-color: rgba(var(--rgb-cinnabar), 0.1);
  color: var(--color-cinnabar);
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
  background-color: rgba(var(--rgb-parchment), 0.5);
  border-radius: var(--radius-lg);
  border: 0.7px solid rgba(var(--rgb-tan-dark), 0.3);
  transition: all 0.3s ease;
}

.help-feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.help-feature-card .card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
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
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin: 0 0 8px 0;
}

.help-feature-card .card-desc {
  font-size: 13px;
  color: var(--color-brown);
  font-family: var(--font-ui);
  margin: 0;
  line-height: 1.4;
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .upload-section {
    flex-direction: column;
    gap: 12px;
    padding: 0 12px;
  }

  .check-action-area {
    padding: 0;
    gap: 12px;
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .page-title {
    font-size: 18px;
  }

  .page-subtitle {
    font-size: 12px;
  }

  .btn-text {
    font-size: 14px;
  }

  .start-check-btn {
    width: 100%;
    max-width: none;
    height: 44px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    box-sizing: border-box;
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

  .property-stats {
    flex-direction: column;
    gap: 10px;
  }

  .stat-item {
    width: 100%;
  }

  .property-details-list {
    gap: 12px;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 0;
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

  /* 属性详情区域移动端优化 */
  .property-details-section {
    margin: 0 -16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .section-header {
    padding: 12px 16px;
    flex-wrap: wrap;
  }

  .section-title {
    font-size: 14px;
  }

  .view-options {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
  }

  .view-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* 属性表格移动端优化 */
  .property-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table-header {
    grid-template-columns: 100px 1fr 1fr 80px;
    padding: 10px 12px;
    font-size: 12px;
    min-width: 600px;
  }

  .table-row {
    grid-template-columns: 100px 1fr 1fr 80px;
    padding: 12px;
    min-width: 600px;
    font-size: 12px;
  }

  .table-header-cell,
  .table-cell {
    padding: 4px 6px;
    word-break: break-word;
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
  }

  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    order: 2;
  }

  .pagination-btn {
    padding: 8px 12px;
    font-size: 13px;
    min-height: 44px;
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

  .table-header,
  .table-row {
    font-size: 11px;
  }

  .table-header-cell,
  .table-cell {
    padding: 3px 5px;
  }
}
</style>