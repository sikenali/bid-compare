<template>
  <div class="multi-file-upload">
    <div class="upload-header">
      <h3>文件上传</h3>
      <span class="file-count">已选择 {{ files.length }} / {{ maxCount }} 个文件</span>
    </div>
    
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
          <RiUploadCloudLine class="upload-icon" />
          <p>点击或拖拽文件到这里</p>
          <p class="upload-hint">支持 Word、PDF、PPT、Excel 格式，最多 {{ maxCount }} 个文件</p>
        </div>

        <!-- 有文件时显示文件列表 -->
        <div v-else class="file-list-inside">
          <div class="file-list-header">
            <span class="file-list-title">已选择文件</span>
            <button class="add-more-btn" @click="triggerFileInput">
              <RiAddLine class="add-icon" />
              <span>继续添加</span>
            </button>
          </div>
          <div class="file-list-scroll">
            <div v-for="(file, index) in files" :key="index" class="file-item-inside">
              <div class="file-info-inside">
                <div class="file-icon-wrapper" :style="{ backgroundColor: getFileTypeInfo(file).bg }">
                  <component :is="getFileTypeInfo(file).icon" class="file-icon-svg" :style="{ color: getFileTypeInfo(file).color }" />
                </div>
                <div class="file-details">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-meta">
                    <span>{{ getFileTypeInfo(file).label }}</span>
                    <span class="meta-dot">·</span>
                    <span>{{ formatSize(file.size) }}</span>
                  </div>
                </div>
              </div>
              <button class="remove-btn-inside" @click="removeFile(index)" title="移除文件">
                <RiCloseLine />
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
  RiUploadCloudLine, RiFileLine, RiCloseLine, RiExchangeLine, RiAddLine,
  RiFileWordLine, RiFileExcelLine, RiFilePptLine, RiFileTextLine, RiFilePdfLine
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

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
  }
  // 重置input值，允许重复选择同一文件
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
  // 过滤已存在的文件（按文件名去重）
  const existingNames = new Set(files.value.map(f => f.name))
  const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name))
  
  // 限制数量
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

// 获取文件类型信息
const getFileTypeInfo = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, { icon: any; label: string; bg: string; color: string }> = {
    'docx': { icon: RiFileWordLine, label: 'Word', bg: 'rgba(46, 111, 182, 0.1)', color: 'rgba(46, 111, 182, 1)' },
    'doc': { icon: RiFileWordLine, label: 'Word', bg: 'rgba(46, 111, 182, 0.1)', color: 'rgba(46, 111, 182, 1)' },
    'xlsx': { icon: RiFileExcelLine, label: 'Excel', bg: 'rgba(33, 115, 70, 0.1)', color: 'rgba(33, 115, 70, 1)' },
    'xls': { icon: RiFileExcelLine, label: 'Excel', bg: 'rgba(33, 115, 70, 0.1)', color: 'rgba(33, 115, 70, 1)' },
    'pptx': { icon: RiFilePptLine, label: 'PPT', bg: 'rgba(196, 68, 24, 0.1)', color: 'rgba(196, 68, 24, 1)' },
    'ppt': { icon: RiFilePptLine, label: 'PPT', bg: 'rgba(196, 68, 24, 0.1)', color: 'rgba(196, 68, 24, 1)' },
    'pdf': { icon: RiFilePdfLine, label: 'PDF', bg: 'rgba(196, 30, 58, 0.1)', color: 'rgba(196, 30, 58, 1)' },
    'txt': { icon: RiFileTextLine, label: 'TXT', bg: 'rgba(101, 70, 40, 0.1)', color: 'rgba(101, 70, 40, 1)' }
  }
  return typeMap[ext] || { icon: RiFileLine, label: ext.toUpperCase() || '文件', bg: 'rgba(101, 70, 40, 0.1)', color: 'rgba(101, 70, 40, 1)' }
}

defineExpose({ clearFiles, files })
</script>

<style scoped>
.multi-file-upload {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
  display: flex;
  flex-direction: column;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.upload-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.file-count {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
}

.upload-area {
  border: 2px dashed rgba(166, 124, 82, 0.3);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: rgba(46, 89, 132, 0.6);
  background: rgba(248, 244, 233, 0.5);
}

.file-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  font-size: 32px;
  color: rgba(46, 89, 132, 0.6);
  margin-bottom: 8px;
}

.upload-content p {
  margin: 0;
  font-size: 14px;
  color: rgba(44, 24, 16, 0.8);
}

.upload-hint {
  font-size: 12px !important;
  color: rgba(101, 70, 40, 0.6) !important;
  margin-top: 4px !important;
}

.file-list {
  margin-top: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 6px;
  margin-bottom: 6px;
  transition: background 0.2s;
}

.file-item:hover {
  background: rgba(248, 244, 233, 0.5);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.file-icon {
  font-size: 16px;
  color: rgba(46, 89, 132, 0.8);
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.6);
  flex-shrink: 0;
  margin-left: 8px;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(196, 30, 58, 0.6);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: rgba(196, 30, 58, 1);
  background: rgba(196, 30, 58, 0.1);
}

/* 文件列表在 upload-area 内部 */
.upload-area.has-files {
  text-align: left;
  padding: 16px;
}

.file-list-inside {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.file-list-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.add-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px dashed rgba(166, 124, 82, 0.4);
  border-radius: 4px;
  background: transparent;
  color: rgba(101, 70, 40, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-more-btn:hover {
  border-color: rgba(46, 89, 132, 0.6);
  background: rgba(248, 244, 233, 0.5);
}

.add-icon {
  font-size: 14px;
}

.file-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item-inside {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(248, 244, 233, 0.4);
  border-radius: 6px;
  transition: background 0.2s;
}

.file-item-inside:hover {
  background: rgba(248, 244, 233, 0.6);
}

.file-info-inside {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.file-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon-svg {
  font-size: 18px;
}

.file-details {
  min-width: 0;
  flex: 1;
}

.file-details .file-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(101, 70, 40, 0.6);
  margin-top: 2px;
}

.meta-dot {
  color: rgba(166, 124, 82, 0.4);
}

.remove-btn-inside {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(196, 30, 58, 0.6);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn-inside:hover {
  color: rgba(196, 30, 58, 1);
  background: rgba(196, 30, 58, 0.1);
}

.upload-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(101, 70, 40, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(196, 30, 58, 0.1);
  border-color: rgba(196, 30, 58, 0.3);
  color: rgba(196, 30, 58, 1);
}

.btn-icon {
  font-size: 14px;
}

/* 多文件对比圆形按钮 */
.compare-circle-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
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
</style>
