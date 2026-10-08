<template>
  <div class="multi-file-upload">
    <!-- 标题区域 -->
    <div class="upload-title-section">
      <div class="upload-title">
        <span class="title-decoration" style="background-color: var(--color-cinnabar)"></span>
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
          <FormatIcons />
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

    <div v-if="addErrorMessage" class="upload-error">{{ addErrorMessage }}</div>

    <div class="compare-action-section">
      <button class="compare-btn" 
              @click="$emit('compare')" 
              :disabled="files.length < 2">
        <RiExchangeLine class="compare-btn-icon" />
        <span>文件对比</span>
      </button>
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
import FormatIcons from './FormatIcons.vue'

interface Props {
  maxCount?: number
  acceptTypes?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 10,
  acceptTypes: '.docx,.doc,.pdf,.pptx,.ppt,.xlsx,.xls,.txt'
})

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void
  (e: 'compare'): void
}>()

const files = ref<File[]>([])
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()
const addErrorMessage = ref('')

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

  const MAX_SIZE = 100 * 1024 * 1024
  const oversize = uniqueNewFiles.find(f => f.size > MAX_SIZE)
  if (oversize) {
    addErrorMessage.value = `文件 ${oversize.name} 超过 100MB 大小限制`
    setTimeout(() => addErrorMessage.value = '', 3000)
    return
  }

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
    'docx': { icon: RiFileWord2Line, label: 'Word 文档', bg: 'rgba(var(--rgb-cloud-blue), 0.1)', color: 'var(--color-cloud-blue)' },
    'doc': { icon: RiFileWord2Line, label: 'Word 文档', bg: 'rgba(var(--rgb-cloud-blue), 0.1)', color: 'var(--color-cloud-blue)' },
    'xlsx': { icon: RiFileExcel2Line, label: 'Excel 表格', bg: 'rgba(var(--rgb-jade), 0.1)', color: 'var(--color-jade)' },
    'xls': { icon: RiFileExcel2Line, label: 'Excel 表格', bg: 'rgba(var(--rgb-jade), 0.1)', color: 'var(--color-jade)' },
    'pptx': { icon: RiSlideshow2Line, label: 'PPT 演示', bg: 'rgba(var(--rgb-gold-dark), 0.1)', color: 'var(--color-gold-dark)' },
    'ppt': { icon: RiSlideshow2Line, label: 'PPT 演示', bg: 'rgba(var(--rgb-gold-dark), 0.1)', color: 'var(--color-gold-dark)' },
    'pdf': { icon: RiFilePdf2Line, label: 'PDF 文档', bg: 'rgba(var(--rgb-cinnabar), 0.1)', color: 'var(--color-cinnabar)' },
    'txt': { icon: RiFileTextLine, label: '文本文件', bg: 'rgba(var(--rgb-brown-muted), 0.1)', color: 'var(--color-brown-muted)' }
  }
  return typeMap[ext] || { icon: RiFileLine, label: '未知类型', bg: 'rgba(var(--rgb-brown-muted), 0.1)', color: 'var(--color-brown-muted)' }
}

defineExpose({ clearFiles, files })
</script>

<style scoped>
.multi-file-upload {
  padding: var(--spacing-5) var(--spacing-6);
  background: var(--color-cream);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-tan-border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.upload-title-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.upload-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.title-decoration {
  width: 5px;
  height: 24px;
  border-radius: var(--radius-xs);
}

.title-text {
  font-size: var(--text-heading);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  letter-spacing: 1px;
}

.file-count-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 12px;
  background: var(--color-cream-darker);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-tan-border);
}

.count-current {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--color-cinnabar);
  font-family: var(--font-ui);
}

.count-separator {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
}

.count-max {
  font-size: var(--text-caption);
  color: var(--color-brown);
}

.upload-area {
  border: 2px dashed var(--color-tan-dark);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: 200px;
}

.upload-area:hover {
  border-color: var(--color-cinnabar);
  box-shadow: var(--shadow-cinnabar-hover);
}

.upload-area.drag-over {
  border-color: var(--color-cloud-blue);
  background: var(--color-parchment);
  transform: scale(1.01);
}

.file-input {
  display: none;
}

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
  border-radius: var(--radius-full);
  background: var(--color-cream-darker);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all var(--transition-normal);
}

.upload-area:hover .upload-icon-wrapper {
  background: var(--color-cream-darker);
  transform: scale(1.05);
}

.upload-icon {
  font-size: 40px;
  color: var(--color-brown-muted);
}

.upload-main-text {
  font-size: var(--text-heading);
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin-bottom: var(--spacing-4);
}

.upload-size-text {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
}

.file-list-container {
  padding: var(--spacing-4);
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.file-list-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.add-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px dashed var(--color-tan-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-brown);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-more-btn:hover {
  border-color: var(--color-cinnabar);
  background: rgba(var(--rgb-cinnabar), 0.05);
  color: var(--color-cinnabar);
}

.add-icon {
  font-size: var(--text-body);
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
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.file-item-card:hover {
  background: var(--color-cream-dark);
  border-color: var(--color-tan-border);
}

.file-info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-width: 0;
  flex: 1;
}

.file-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
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
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-brown-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.file-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-caption);
  color: var(--color-brown);
}

.meta-dot {
  color: var(--color-tan-border);
}

.remove-btn-card {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  background: transparent;
  flex-shrink: 0;
}

.remove-btn-card:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
}

.remove-icon {
  font-size: 20px;
  color: rgba(var(--rgb-cinnabar), 0.7);
  transition: all var(--transition-fast);
}

.remove-btn-card:hover .remove-icon {
  color: var(--color-cinnabar);
  transform: scale(1.1);
}

.compare-action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: var(--spacing-5);
}

.upload-error {
  font-size: 13px;
  color: var(--color-cinnabar);
  text-align: center;
  padding: 8px;
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

@media (max-width: 768px) {
  .multi-file-upload {
    padding: var(--spacing-4);
  }

  .upload-title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .title-text {
    font-size: var(--text-heading);
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
    font-size: var(--text-body-sm);
  }

  .file-meta-line {
    font-size: 11px;
  }

  .compare-action-section {
    margin-top: var(--spacing-4);
  }
}

@media (max-width: 480px) {
  .multi-file-upload {
    padding: var(--spacing-3);
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
