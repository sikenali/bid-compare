<script setup lang="ts">
import { computed } from 'vue'
import {
  RiAddLine,
  RiFilePdfLine,
  RiFileWordLine,
  RiFileExcelLine,
  RiFileTextLine
} from '@remixicon/vue'

interface FileInfo {
  file: File | null
  name: string
  size: string
  type: string
}

const props = withDefaults(defineProps<{
  side: 'left' | 'right'
  fileInfo: FileInfo
  label?: string
  acceptedFormats?: string
  onFileChange?: (event: Event, side: 'left' | 'right') => void
  onDragOver?: (event: DragEvent) => void
  onDrop?: (event: DragEvent, side: 'left' | 'right') => void
  onClearFile?: (side: 'left' | 'right') => void
}>(), {
  label: '',
  acceptedFormats: '.pdf,.docx,.doc,.xlsx,.txt',
})

const titleText = computed(() => props.label || (props.side === 'left' ? '原始文件' : '修改文件'))

const handleFileChange = (event: Event) => props.onFileChange?.(event, props.side)
const handleDragOver = (event: DragEvent) => props.onDragOver?.(event)
const handleDrop = (event: DragEvent) => props.onDrop?.(event, props.side)
const handleClear = () => props.onClearFile?.(props.side)

const isPdf = (t: string) => t.includes('PDF')
const isWord = (t: string) => t.includes('Word')
const isExcel = (t: string) => t.includes('Excel')
const isTxt = (t: string) => t.includes('文本')
</script>

<template>
  <div class="upload-wrapper" @dragover="handleDragOver" @drop="handleDrop">
    <div class="upload-area">
      <div class="upload-icon" :class="side">
        <RiFilePdfLine v-if="fileInfo.file && isPdf(fileInfo.type)" class="upload-icon-svg" />
        <RiFileWordLine v-else-if="fileInfo.file && isWord(fileInfo.type)" class="upload-icon-svg" />
        <RiFileExcelLine v-else-if="fileInfo.file && isExcel(fileInfo.type)" class="upload-icon-svg" />
        <RiFileTextLine v-else class="upload-icon-svg" />
      </div>
      <template v-if="!fileInfo.file">
        <p class="upload-title">{{ titleText }}</p>
        <p class="upload-hint">支持 PDF、Word、Excel、TXT 格式，单个文件不超过 50MB</p>
        <label class="upload-btn">
          <RiAddLine class="upload-btn-icon" />
          <span>选择文件</span>
          <input type="file" hidden @change="handleFileChange" :accept="acceptedFormats" />
        </label>
        <p class="upload-drag-hint">或拖拽文件到此处</p>
      </template>
      <template v-else>
        <p class="upload-title">{{ fileInfo.name }}</p>
        <p class="upload-hint">{{ fileInfo.size }} · {{ fileInfo.type }}</p>
        <label class="upload-btn upload-btn-replace">
          <RiAddLine class="upload-btn-icon" />
          <span>重新选择</span>
          <input type="file" hidden @change="handleFileChange" :accept="acceptedFormats" />
        </label>
        <button class="upload-clear-btn" @click="handleClear">移除文件</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.upload-wrapper {
  flex: 1;
  min-height: 200px;
}

.upload-area {
  background: var(--color-upload-bg);
  border-radius: 12px;
  border: 1px dashed var(--color-tan-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 260px;
}

.upload-area:hover {
  border-color: var(--color-accent-red);
  background: var(--color-icon-bg);
}

.upload-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.upload-icon.left {
  background: var(--color-diff-deleted);
}

.upload-icon.right {
  background: var(--color-diff-added);
}

.upload-icon-svg {
  font-size: 36px;
}

.upload-icon.left .upload-icon-svg {
  color: var(--color-accent-red);
}

.upload-icon.right .upload-icon-svg {
  color: var(--color-jade);
}

.upload-icon .upload-icon-svg {
  color: var(--color-brown-muted);
}

.upload-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brown-dark);
  margin: 0;
}

.upload-hint {
  font-size: 14px;
  color: var(--color-brown-muted);
  margin: 0;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: var(--color-accent-red);
  color: var(--color-white);
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.upload-btn:hover {
  background: var(--color-accent-red-dark);
}

.upload-btn-replace {
  margin-top: 12px;
}

.upload-btn-icon {
  font-size: 18px;
}

.upload-drag-hint {
  font-size: 12px;
  color: var(--color-brown-muted);
  margin: 0;
}

.upload-clear-btn {
  background: none;
  border: none;
  color: var(--color-brown-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  margin-top: 4px;
  transition: color 0.2s;
}

.upload-clear-btn:hover {
  color: var(--color-accent-red);
}
</style>
