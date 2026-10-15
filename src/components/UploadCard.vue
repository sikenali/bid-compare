<script setup lang="ts">
import { ref, computed } from 'vue';
import { RiUploadCloud2Line, RiRefreshLine } from '@remixicon/vue';

interface FileInfo {
  file: File | null;
  name: string;
  size: string;
  type: string;
}

interface Props {
  leftFileInfo: FileInfo;
  rightFileInfo: FileInfo;
  title?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '点击选择或拖拽目标文件',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:leftFileInfo', value: FileInfo): void;
  (e: 'update:rightFileInfo', value: FileInfo): void;
  (e: 'leftFileChange', file: File | null): void;
  (e: 'rightFileChange', file: File | null): void;
  (e: 'replace'): void;
}>();

const isDraggingLeft = ref(false);
const isDraggingRight = ref(false);

function getExt(file: File): string {
  const name = file.name.toLowerCase();
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1) : '';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function validateFile(file: File): boolean {
  const ext = getExt(file);
  if (ext === 'doc') {
    console.warn('不支持 .doc 格式，请转换成 Docx 格式后再上传');
    return false;
  }
  if (!['docx', 'pdf', 'md', 'txt', 'xlsx', 'csv', 'html'].includes(ext)) {
    console.warn('不支持的格式，请上传支持的文件');
    return false;
  }
  if (file.size > 100 * 1024 * 1024) {
    console.warn('文件超过 100MB 上限');
    return false;
  }
  return true;
}

function handleDragOver(side: 'left' | 'right', e: DragEvent) {
  e.preventDefault();
  if (side === 'left') isDraggingLeft.value = true;
  else isDraggingRight.value = true;
}

function handleDragLeave(side: 'left' | 'right') {
  if (side === 'left') isDraggingLeft.value = false;
  else isDraggingRight.value = false;
}

function handleDrop(side: 'left' | 'right', e: DragEvent) {
  e.preventDefault();
  if (side === 'left') isDraggingLeft.value = false;
  else isDraggingRight.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0 && !props.disabled) {
    if (validateFile(files[0])) {
      selectFile(side, files[0]);
    }
  }
}

function triggerFileInput(side: 'left' | 'right') {
  const id = side === 'left' ? 'leftFileInput' : 'rightFileInput';
  (document.getElementById(id) as HTMLInputElement)?.click();
}

function handleFileSelect(side: 'left' | 'right', event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0 && !props.disabled) {
    if (validateFile(input.files[0])) {
      selectFile(side, input.files[0]);
    } else {
      input.value = '';
    }
  }
}

function selectFile(side: 'left' | 'right', file: File) {
  const fileInfo: FileInfo = {
    file,
    name: file.name,
    size: formatSize(file.size),
    type: getExt(file),
  };

  if (side === 'left') {
    emit('update:leftFileInfo', fileInfo);
    emit('leftFileChange', file);
  } else {
    emit('update:rightFileInfo', fileInfo);
    emit('rightFileChange', file);
  }
}

function handleReplace(side: 'left' | 'right') {
  if (props.disabled) return;
  const emptyInfo: FileInfo = { file: null, name: '', size: '', type: '' };
  if (side === 'left') {
    emit('update:leftFileInfo', emptyInfo);
    emit('leftFileChange', null);
  } else {
    emit('update:rightFileInfo', emptyInfo);
    emit('rightFileChange', null);
  }
  emit('replace');
}

const formatTags = [
  { label: 'W', color: '#2B579A' },
  { label: 'X', color: '#217346' },
  { label: 'P', color: '#C0392B' },
  { label: 'PDF', color: '#B03A2E' },
  { label: 'MD', color: '#4A6FA5' },
  { label: 'TX', color: '#5A5750' },
];
</script>

<template>
  <div class="upload-card-row">
    <!-- 左侧上传卡片 -->
    <div
      class="upload-card"
      :class="{ dragging: isDraggingLeft, hasFile: !!leftFileInfo.file && !disabled }"
      @dragover="handleDragOver('left', $event)"
      @dragleave="handleDragLeave('left')"
      @drop="handleDrop('left', $event)"
      @click="!disabled && triggerFileInput('left')"
    >
      <template v-if="!leftFileInfo.file">
        <div class="upload-icon-wrap">
          <RiUploadCloud2Line class="upload-icon" />
        </div>
        <p class="upload-hint">{{ title }}</p>
        <div class="format-row">
          <span v-for="tag in formatTags" :key="tag.label" class="fmt" :style="{ backgroundColor: tag.color }">{{ tag.label }}</span>
        </div>
      </template>

      <template v-else>
        <button v-if="!disabled" class="replace-icon" @click.stop="handleReplace('left')" title="替换文件">
          <RiRefreshLine class="replace-icon-inner" />
        </button>
        <div class="file-centered">
          <div class="file-icon" :class="'fmt-' + leftFileInfo.type">
            <svg v-if="leftFileInfo.type === 'docx'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 9h12M8 13h12M8 17h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="leftFileInfo.type === 'xlsx'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 9h12M8 13h12M8 17h12M14 7v14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="leftFileInfo.type === 'pdf'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M9 10l4 3-4 3V10z" fill="currentColor"/>
              <path d="M17 10l4 3-4 3V10z" fill="currentColor" opacity="0.5"/>
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="file-name">{{ leftFileInfo.name }}</p>
          <p class="file-size">{{ leftFileInfo.size }}</p>
        </div>
      </template>

      <input
        id="leftFileInput"
        type="file"
        class="file-input-hidden"
        accept=".docx,.pdf,.md,.txt,.xlsx,.csv,.html"
        :disabled="disabled"
        @change="handleFileSelect('left', $event)"
      />
      <span class="card-label">原始版本</span>
    </div>

    <!-- VS 标识 -->
    <div class="vs-badge">
      <span>VS</span>
    </div>

    <!-- 右侧上传卡片 -->
    <div
      class="upload-card"
      :class="{ dragging: isDraggingRight, hasFile: !!rightFileInfo.file && !disabled }"
      @dragover="handleDragOver('right', $event)"
      @dragleave="handleDragLeave('right')"
      @drop="handleDrop('right', $event)"
      @click="!disabled && triggerFileInput('right')"
    >
      <template v-if="!rightFileInfo.file">
        <div class="upload-icon-wrap">
          <RiUploadCloud2Line class="upload-icon" />
        </div>
        <p class="upload-hint">{{ title }}</p>
        <div class="format-row">
          <span v-for="tag in formatTags" :key="tag.label" class="fmt" :style="{ backgroundColor: tag.color }">{{ tag.label }}</span>
        </div>
      </template>

      <template v-else>
        <button v-if="!disabled" class="replace-icon" @click.stop="handleReplace('right')" title="替换文件">
          <RiRefreshLine class="replace-icon-inner" />
        </button>
        <div class="file-centered">
          <div class="file-icon" :class="'fmt-' + rightFileInfo.type">
            <svg v-if="rightFileInfo.type === 'docx'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 9h12M8 13h12M8 17h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="rightFileInfo.type === 'xlsx'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 9h12M8 13h12M8 17h12M14 7v14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="rightFileInfo.type === 'pdf'" width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M9 10l4 3-4 3V10z" fill="currentColor"/>
              <path d="M17 10l4 3-4 3V10z" fill="currentColor" opacity="0.5"/>
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="2" width="22" height="24" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="file-name">{{ rightFileInfo.name }}</p>
          <p class="file-size">{{ rightFileInfo.size }}</p>
        </div>
      </template>

      <input
        id="rightFileInput"
        type="file"
        class="file-input-hidden"
        accept=".docx,.pdf,.md,.txt,.xlsx,.csv,.html"
        :disabled="disabled"
        @change="handleFileSelect('right', $event)"
      />
      <span class="card-label">修订版本</span>
    </div>
  </div>
</template>

<style scoped>
.upload-card-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  width: 100%;
}

.upload-card {
  width: 440px;
  height: 360px;
  flex-shrink: 0;
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, var(--color-tan-border, #E5DFD3));
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
  gap: 20px;
  padding: 40px 32px;
  cursor: pointer;
}

.upload-card:hover {
  border-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  box-shadow: 0 4px 20px rgba(192, 57, 43, 0.08);
}

.upload-card.dragging {
  border-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  background-color: var(--color-primary-soft, #FBE9E7);
}

.upload-card.hasFile {
  cursor: default;
}

.upload-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--color-bg-secondary, var(--color-cream-dark, #F7F3EA));
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 34px;
  color: var(--color-text-muted, #8A8578);
}

.upload-hint {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
  font-family: var(--font-ui);
  line-height: 1.2;
  text-align: center;
}

.format-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.fmt {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  font-size: 9px;
  font-family: var(--font-ui);
  line-height: 1;
}

/* Replace icon */
.replace-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0.7px solid var(--color-border, var(--color-tan-border, #E5DFD3));
  background-color: var(--color-bg-white, #FFFFFF);
  color: var(--color-text-muted, #8A8578);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s, transform 0.2s;
  z-index: 2;
}

.replace-icon:hover {
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
  border-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  background-color: var(--color-primary-soft, #FBE9E7);
}

.replace-icon-inner {
  font-size: 16px;
  transition: transform 0.3s ease;
}

.replace-icon:hover .replace-icon-inner {
  transform: rotate(120deg);
}

/* File selected state */
.file-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: center;
}

.file-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon.fmt-docx { background-color: #2B579A; color: #fff; }
.file-icon.fmt-xlsx { background-color: #217346; color: #fff; }
.file-icon.fmt-pdf { background-color: var(--color-primary, var(--color-cinnabar, #C0392B)); color: #fff; }
.file-icon.fmt-md { background-color: #4A6FA5; color: #fff; }
.file-icon.fmt-txt { background-color: #5A5750; color: #fff; }

.file-name {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary, #1F1D1A);
  font-family: var(--font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.file-size {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted, #8A8578);
  font-family: var(--font-ui);
}

.file-input-hidden { display: none; }

.card-label {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted, #8A8578);
  font-family: var(--font-ui);
}

/* VS badge */
.vs-badge {
  width: 72px;
  height: 72px;
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, var(--color-tan-border, #E5DFD3));
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vs-badge span {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary, #6E6A60);
  font-family: var(--font-ui);
}

/* Responsive */
@media (max-width: 1024px) {
  .upload-card-row {
    flex-direction: column;
  }
  .vs-badge {
    transform: rotate(90deg);
  }
  .upload-card {
    width: 100%;
    max-width: 480px;
  }
}

@media (max-width: 640px) {
  .upload-card {
    height: 300px;
    width: 100%;
  }
}
</style>
