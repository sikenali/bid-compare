<script setup lang="ts">
import { computed } from 'vue'
import { RiUploadCloud2Line, RiFileLine, RiCloseLine } from '@remixicon/vue'

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
  acceptedFormats: '.pdf,.docx,.doc',
})

const titleText = computed(() => props.label || (props.side === 'left' ? '原始文件' : '修改文件'))

const handleFileChange = (event: Event) => props.onFileChange?.(event, props.side)
const handleDragOver = (event: DragEvent) => props.onDragOver?.(event)
const handleDrop = (event: DragEvent) => props.onDrop?.(event, props.side)
const handleClear = () => props.onClearFile?.(props.side)
</script>

<template>
  <div class="upload-wrapper" @dragover="handleDragOver" @drop="handleDrop">
    <div v-if="!fileInfo.file" class="upload-area">
      <div class="upload-icon">
        <RiUploadCloud2Line class="upload-icon-svg" />
      </div>
      <p class="upload-title">{{ titleText }}</p>
      <p class="upload-hint">支持 PDF、DOCX、DOC 格式，单个文件不超过 50MB</p>
      <label class="upload-btn">
        <RiFileLine class="upload-btn-icon" />
        <span>选择文件</span>
        <input type="file" hidden @change="handleFileChange" :accept="acceptedFormats" />
      </label>
      <p class="upload-drag-hint">或拖拽文件到此处</p>
    </div>
    <div v-else class="file-info-bar">
      <RiFileLine class="file-icon" />
      <div class="file-details">
        <span class="file-name">{{ fileInfo.name }}</span>
        <span class="file-meta">{{ fileInfo.size }} · {{ fileInfo.type }}</span>
      </div>
      <button class="file-clear-btn" @click="handleClear" title="移除文件">
        <RiCloseLine />
      </button>
    </div>
  </div>
</template>

<style scoped>
.upload-wrapper {
  flex: 1;
  min-height: 200px;
}

.upload-area {
  background: #F5EFE3;
  border-radius: 12px;
  border: 1px dashed #D4C4A8;
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
  border-color: #C43D3D;
  background: #F0E8D8;
}

.upload-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #F0E8D8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.upload-icon-svg {
  font-size: 36px;
  color: #C43D3D;
}

.upload-title {
  font-size: 20px;
  font-weight: 600;
  color: #3D2B1F;
  margin: 0;
}

.upload-hint {
  font-size: 14px;
  color: #8B7355;
  margin: 0;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #C43D3D;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.upload-btn:hover {
  background: #A83028;
}

.upload-btn-icon {
  font-size: 18px;
}

.upload-drag-hint {
  font-size: 12px;
  color: #8B7355;
  margin: 0;
}

.file-info-bar {
  background: #F5EFE3;
  border-radius: 12px;
  border: 1px solid #D4C4A8;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
  color: #C43D3D;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #3D2B1F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 12px;
  color: #8B7355;
}

.file-clear-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #8B7355;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.file-clear-btn:hover {
  background: rgba(196, 61, 61, 0.1);
  color: #C43D3D;
}
</style>