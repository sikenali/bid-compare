<template>
  <div class="multi-file-upload">
    <div class="upload-header">
      <h3>文件上传</h3>
      <span class="file-count">已选择 {{ files.length }} / {{ maxCount }} 个文件</span>
    </div>
    
    <div class="upload-area" 
         @dragover.prevent="onDragOver"
         @dragleave="onDragLeave"
         @drop.prevent="onDrop"
         :class="{ 'drag-over': isDragOver }">
      <input type="file" 
             ref="fileInput"
             :accept="acceptTypes"
             multiple
             @change="onFileSelect"
             class="file-input" />
      <div class="upload-content" @click="triggerFileInput">
        <RiUploadCloudLine class="upload-icon" />
        <p>点击或拖拽文件到这里</p>
        <p class="upload-hint">支持 Word、PDF、PPT、Excel 格式，最多 {{ maxCount }} 个文件</p>
      </div>
    </div>

    <div class="file-list" v-if="files.length > 0">
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-info">
          <RiFileLine class="file-icon" />
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
        </div>
        <button class="remove-btn" @click="removeFile(index)" title="移除文件">
          <RiCloseLine />
        </button>
      </div>
    </div>

    <div class="upload-actions" v-if="files.length > 0">
      <button class="clear-btn" @click="clearFiles">
        <RiDeleteBinLine class="btn-icon" />
        <span>清空所有</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RiUploadCloudLine, RiFileLine, RiCloseLine, RiDeleteBinLine } from '@remixicon/vue'

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

defineExpose({ clearFiles, files })
</script>

<style scoped>
.multi-file-upload {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
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
</style>
