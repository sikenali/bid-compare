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
    <div class="upload-area">
      <div class="upload-icon">
        <RiUploadCloud2Line class="upload-icon-svg" />
      </div>
      <template v-if="!fileInfo.file">
        <p class="upload-title">{{ titleText }}</p>
        <p class="upload-hint">支持 PDF、DOCX、DOC 格式，单个文件不超过 50MB</p>
        <label class="upload-btn">
          <RiFileLine class="upload-btn-icon" />
          <span>选择文件</span>
          <input type="file" hidden @change="handleFileChange" :accept="acceptedFormats" />
        </label>
        <p class="upload-drag-hint">或拖拽文件到此处</p>
      </template>
      <template v-else>
        <p class="upload-title">{{ fileInfo.name }}</p>
        <p class="upload-hint">{{ fileInfo.size }} · {{ fileInfo.type }}</p>
        <label class="upload-btn upload-btn-replace">
          <RiFileLine class="upload-btn-icon" />
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

.upload-btn-replace {
  margin-top: 12px;
}

.upload-btn-icon {
  font-size: 18px;
}

.upload-drag-hint {
  font-size: 12px;
  color: #8B7355;
  margin: 0;
}

.upload-clear-btn {
  background: none;
  border: none;
  color: #8B7355;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  margin-top: 4px;
  transition: color 0.2s;
}

.upload-clear-btn:hover {
  color: #C43D3D;
}
</style>