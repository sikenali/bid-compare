<template>
  <div class="multi-file-upload">
    <!-- 标题区域 -->
    <div class="upload-title-section">
      <div class="upload-title">
        <span class="title-decoration" style="background-color: rgba(139,0,0,1)"></span>
        <span class="title-text">MULTI-DOCUMENT SOURCE</span>
      </div>
      <span class="file-count-badge">
        <span class="count-current">{{ files.length }}</span>
        <span class="count-separator">/</span>
        <span class="count-max">{{ maxCount }}</span>
      </span>
    </div>

    <!-- 上传区域 -->
    <BorderBeam size="line" color-variant="ocean" theme="light" :duration="3">
      <div class="upload-area" 
           @dragover.prevent="onDragOver"
           @dragleave="onDragLeave"
           @drop.prevent="onDrop"
           :class="{ 'drag-over': isDragOver, 'has-files': files.length > 0 }">
        <input type="file" 
               ref="fileInput"
               :accept="acceptTypes"
               multiple
               @change="onFileSelect"
               class="file-input" />
        
        <!-- 无文件时显示上传提示 -->
        <div v-if="files.length === 0" class="upload-content" @click="triggerFileInput">
          <div class="upload-icon-wrapper">
            <RiUploadCloud2Line class="upload-icon" />
          </div>
          <p class="upload-main-text">拖拽文件到此处或点击上传</p>
          <div class="upload-format-icons">
            <div class="format-icon-wrapper" v-for="fmt in formatIcons" :key="fmt.type">
              <component :is="fmt.icon" class="format-icon-svg" />
              <span class="format-tooltip">{{ fmt.label }}</span>
            </div>
          </div>
          <p class="upload-size-text">最多 {{ maxCount }} 个文件</p>
        </div>

        <!-- 有文件时显示文件列表 -->
        <div v-else class="file-list-container">
          <div class="file-list-header">
            <span class="file-list-title">已选择文件</span>
            <button class="add-more-btn" @click="triggerFileInput">
              <RiAddLine class="add-icon" />
              <span>继续添加</span>
            </button>
          </div>
          <div class="file-list-scroll">
            <div v-for="(file, index) in files" :key="index" class="file-item-card">
              <div class="file-info-row">
                <div class="file-icon-badge" :style="{ backgroundColor: getFileTypeInfo(file).bg }">
                  <component :is="getFileTypeInfo(file).icon" class="file-icon-svg" :style="{ color: getFileTypeInfo(file).color }" />
                </div>
                <div class="file-details-col">
                  <div class="file-name" :title="file.name">{{ file.name }}</div>
                  <div class="file-meta-line">
                    <span>{{ getFileTypeInfo(file).label }}</span>
                    <span class="meta-dot">·</span>
                    <span>{{ formatSize(file.size) }}</span>
                  </div>
                </div>
              </div>
              <button class="remove-btn-card" @click="removeFile(index)" title="移除文件">
                <RiCloseCircleLine class="remove-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </BorderBeam>

    <!-- 多文件对比圆形按钮 -->
    <div class="compare-circle-wrapper">
      <BorderBeam size="md" color-variant="colorful" theme="dark" :duration="2.4">
        <button class="compare-circle-btn" 
                @click="$emit('compare')" 
                :disabled="files.length < 2"
                :class="{ 'disabled': files.length < 2 }">
          <RiExchangeLine class="compare-circle-icon" />
          <span class="compare-circle-text">多文件对比</span>
        </button>
      </BorderBeam>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  RiUploadCloud2Line, RiFileLine, RiCloseCircleLine, RiExchangeLine, RiAddLine,
  RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line, RiFileTextLine
} from '@remixicon/vue'
import { BorderBeam } from 'vue3-border-beam'

interface Props {
  maxCount?: number
  acceptTypes?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 10,
  acceptTypes: '.docx,.pdf,.pptx,.xlsx,.txt'
})

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void
  (e: 'compare'): void
}>()

const files = ref<File[]>([])
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

const formatIcons = [
  { type: 'word', icon: RiFileWord2Line, label: 'Word' },
  { type: 'excel', icon: RiFileExcel2Line, label: 'Excel' },
  { type: 'ppt', icon: RiSlideshow2Line, label: 'PPT' },
  { type: 'pdf', icon: RiFilePdf2Line, label: 'PDF' },
  { type: 'txt', icon: RiFileTextLine, label: 'TXT' }
]

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
  }
  input.value = ''
}

const onDragOver = () => { isDragOver.value = true }
const onDragLeave = () => { isDragOver.value = false }

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const addFiles = (newFiles: File[]) => {
  const existingNames = new Set(files.value.map(f => f.name))
  const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name))
  
  const remaining = props.maxCount - files.value.length
  const toAdd = uniqueNewFiles.slice(0, remaining)
  
  files.value = [...files.value, ...toAdd]
  emit('update:files', files.value)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
  emit('update:files', files.value)
}

const clearFiles = () => {
  files.value = []
  emit('update:files', files.value)
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileTypeInfo = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, { icon: any; label: string; bg: string; color: string }> = {
    'docx': { icon: RiFileWord2Line, label: 'Word 文档', bg: 'rgba(219,234,254,1)', color: 'rgba(37,99,235,1)' },
    'doc': { icon: RiFileWord2Line, label: 'Word 文档', bg: 'rgba(219,234,254,1)', color: 'rgba(37,99,235,1)' },
    'xlsx': { icon: RiFileExcel2Line, label: 'Excel 表格', bg: 'rgba(220,252,231,1)', color: 'rgba(34,139,34,1)' },
    'xls': { icon: RiFileExcel2Line, label: 'Excel 表格', bg: 'rgba(220,252,231,1)', color: 'rgba(34,139,34,1)' },
    'pptx': { icon: RiSlideshow2Line, label: 'PPT 演示', bg: 'rgba(254,243,199,1)', color: 'rgba(217,119,6,1)' },
    'ppt': { icon: RiSlideshow2Line, label: 'PPT 演示', bg: 'rgba(254,243,199,1)', color: 'rgba(217,119,6,1)' },
    'pdf': { icon: RiFilePdf2Line, label: 'PDF 文档', bg: 'rgba(254,242,242,1)', color: 'rgba(220,38,38,1)' },
    'txt': { icon: RiFileTextLine, label: '文本文件', bg: 'rgba(243,244,246,1)', color: 'rgba(107,114,128,1)' }
  }
  return typeMap[ext] || { icon: RiFileLine, label: '未知类型', bg: 'rgba(243,244,246,1)', color: 'rgba(107,114,128,1)' }
}

defineExpose({ clearFiles, files })
</script>

<style scoped>
.multi-file-upload {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 4px 16px rgba(44, 24, 16, 0.08);
  display: flex;
  flex-direction: column;
}

/* 标题区域 */
.upload-title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.upload-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-decoration {
  width: 5px;
  height: 24px;
  border-radius: 2px;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  letter-spacing: 1px;
}

.file-count-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 12px;
  background: rgba(245, 238, 226, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.count-current {
  font-size: 16px;
  font-weight: 700;
  color: rgba(139, 0, 0, 1);
  font-family: SourceHanSans-Bold;
}

.count-separator {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.5);
}

.count-max {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
}

/* 上传区域 */
.upload-area {
  border: 2px dashed rgba(216, 191, 156, 0.7);
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 1);
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 200px;
}

.upload-area:hover {
  border-color: rgba(139, 0, 0, 1);
  box-shadow: 0 6px 24px rgba(139, 0, 0, 0.12);
}

.upload-area.drag-over {
  border-color: rgba(46, 89, 132, 1);
  background: rgba(248, 244, 233, 0.5);
  transform: scale(1.01);
}

.file-input {
  display: none;
}

/* 无文件状态 */
.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 8px;
}

.upload-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 9999px;
  background-color: rgba(245, 238, 226, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.upload-area:hover .upload-icon-wrapper {
  background-color: rgba(245, 238, 226, 0.8);
  transform: scale(1.05);
}

.upload-icon {
  font-size: 40px;
  color: rgba(166, 124, 82, 1);
}

.upload-main-text {
  font-size: 18px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  margin-bottom: 16px;
}

.upload-format-icons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.format-icon-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(245, 238, 226, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.format-icon-wrapper:hover {
  background-color: rgba(245, 238, 226, 1);
  transform: translateY(-2px);
}

.format-icon-svg {
  font-size: 20px;
  color: rgba(166, 124, 82, 1);
}

.format-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(44, 24, 16, 0.9);
  color: white;
  font-size: 11px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.format-icon-wrapper:hover .format-tooltip {
  opacity: 1;
}

.upload-size-text {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
}

/* 文件列表状态 */
.file-list-container {
  padding: 16px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.file-list-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.add-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px dashed rgba(166, 124, 82, 0.4);
  border-radius: 6px;
  background: transparent;
  color: rgba(101, 70, 40, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-more-btn:hover {
  border-color: rgba(139, 0, 0, 1);
  background: rgba(139, 0, 0, 0.05);
  color: rgba(139, 0, 0, 1);
}

.add-icon {
  font-size: 14px;
}

.file-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.file-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(248, 244, 233, 0.4);
  border-radius: 8px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.file-item-card:hover {
  background: rgba(248, 244, 233, 0.6);
  border-color: rgba(166, 124, 82, 0.2);
}

.file-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.file-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon-svg {
  font-size: 20px;
}

.file-details-col {
  min-width: 0;
  flex: 1;
}

.file-details-col .file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.file-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
}

.meta-dot {
  color: rgba(166, 124, 82, 0.4);
}

.remove-btn-card {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: transparent;
  flex-shrink: 0;
}

.remove-btn-card:hover {
  background: rgba(196, 30, 58, 0.1);
}

.remove-icon {
  font-size: 20px;
  color: rgba(220, 38, 38, 0.7);
  transition: all 0.2s;
}

.remove-btn-card:hover .remove-icon {
  color: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

/* 多文件对比圆形按钮 */
.compare-circle-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.compare-circle-btn {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.35);
  transition: all 0.3s ease;
}

.compare-circle-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(139, 0, 0, 0.45);
}

.compare-circle-btn:disabled,
.compare-circle-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, rgba(150, 150, 150, 1) 0%, rgba(180, 180, 180, 1) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.compare-circle-icon {
  font-size: 28px;
  transition: transform 0.3s ease;
}

.compare-circle-text {
  font-size: 12px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .multi-file-upload {
    padding: 16px;
  }

  .upload-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .title-text {
    font-size: 16px;
  }

  .upload-area {
    min-height: 180px;
  }

  .upload-icon-wrapper {
    width: 64px;
    height: 64px;
  }

  .upload-icon {
    font-size: 32px;
  }

  .upload-main-text {
    font-size: 15px;
  }

  .upload-format-icons {
    gap: 8px;
  }

  .format-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .format-icon-svg {
    font-size: 18px;
  }

  .upload-size-text {
    font-size: 11px;
  }

  .file-list-scroll {
    max-height: 200px;
  }

  .file-item-card {
    padding: 10px 12px;
  }

  .file-icon-badge {
    width: 36px;
    height: 36px;
  }

  .file-icon-svg {
    font-size: 18px;
  }

  .file-details-col .file-name {
    font-size: 13px;
  }

  .file-meta-line {
    font-size: 11px;
  }

  .compare-circle-wrapper {
    margin-top: 16px;
  }

  .compare-circle-btn {
    width: 80px;
    height: 80px;
  }

  .compare-circle-icon {
    font-size: 24px;
  }

  .compare-circle-text {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .multi-file-upload {
    padding: 12px;
  }

  .upload-area {
    min-height: 160px;
  }

  .upload-icon-wrapper {
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
  }

  .upload-icon {
    font-size: 28px;
  }

  .upload-format-icons {
    gap: 6px;
  }

  .format-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .format-icon-svg {
    font-size: 16px;
  }

  .file-list-scroll {
    max-height: 160px;
  }

  .compare-circle-btn {
    width: 70px;
    height: 70px;
  }

  .compare-circle-icon {
    font-size: 22px;
  }
}
</style>
