<script setup lang="ts">
import { ref } from 'vue'
import { RiUploadCloud2Line, RiRefreshLine, RiCloseLine, RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line, RiFileTextLine } from '@remixicon/vue';

interface Props {
  side: 'left' | 'right';
  fileInfo: {
    file: File | null;
    name: string;
    size: string;
    type: string;
  };
  onFileChange: (event: Event, side: 'left' | 'right') => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent, side: 'left' | 'right') => void;
  onClearFile: (side: 'left' | 'right') => void;
}

const props = defineProps<Props>();

const titleText = props.side === 'left' ? 'File A' : 'File B';
const titleColor = props.side === 'left' ? 'rgba(139,0,0,1)' : 'rgba(46,89,132,1)';

// 声明文件输入框引用
const fileInput = ref<HTMLInputElement | null>(null);

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="file-upload-container">
    <!-- 上传标题 -->
    <div class="upload-title">
      <span class="title-decoration" :style="{ backgroundColor: titleColor }"></span>
      <span class="title-text">{{ titleText }}</span>
    </div>

    <!-- 上传区域 -->
    <div
      class="upload-area"
      @dragover="onDragOver"
      @drop="(e) => onDrop(e, props.side)"
    >
      <input
        type="file"
        :id="`${props.side}-file`"
        ref="fileInput"
        class="file-input"
        @change="(e) => onFileChange(e, props.side)"
        accept=".doc,.docx,.pdf,.txt,.ppt,.pptx,.xls,.xlsx"
      />

      <!-- 未上传状态 -->
      <div v-if="!fileInfo.name" class="upload-placeholder" @click="triggerFileInput">
        <div class="upload-icon-wrapper">
          <RiUploadCloud2Line class="upload-icon" />
        </div>
        <div class="upload-main-text">拖拽文件到此处或点击上传</div>
        <div class="upload-format-icons">
          <div class="format-icon" title="Word"><RiFileWord2Line class="format-icon-svg" /></div>
          <div class="format-icon" title="Excel"><RiFileExcel2Line class="format-icon-svg" /></div>
          <div class="format-icon" title="PPT"><RiSlideshow2Line class="format-icon-svg" /></div>
          <div class="format-icon" title="PDF"><RiFilePdf2Line class="format-icon-svg" /></div>
          <div class="format-icon" title="TXT"><RiFileTextLine class="format-icon-svg" /></div>
        </div>
      </div>

      <!-- 已上传状态 -->
      <div v-else class="file-info">
        <div class="upload-icon-wrapper">
          <RiUploadCloud2Line class="upload-icon uploaded" />
        </div>
        <div class="file-name">{{ fileInfo.name }}</div>
        <div class="file-meta">
          <span class="file-type">{{ fileInfo.type }}</span>
          <span class="file-size">{{ fileInfo.size }}</span>
        </div>
        <div class="file-actions">
          <label :for="`${props.side}-file`" class="action-btn replace-btn" title="更换文件">
            <RiRefreshLine class="btn-icon" />
            <span>更换文件</span>
          </label>
          <button class="action-btn clear-btn" @click="onClearFile(props.side)" title="清除文件">
            <RiCloseLine class="btn-icon" />
            <span>清除文件</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 中心操作按钮（可选插槽） -->
    <div class="upload-action">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<style scoped>
.file-upload-container {
  display: flex;
  flex-direction: column;
  width: 547px;
  height: 344px;
}

/* 上传标题 */
.upload-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.title-decoration {
  width: 5px;
  height: 24px;
  border-radius: 2px;
}

.title-text {
  font-size: 20px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

/* 上传区域 */
.upload-area {
  flex: 1;
  border: 0.7px solid rgba(216, 191, 156, 1);
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.upload-area:hover {
  border-color: rgba(139, 0, 0, 1);
  box-shadow: 0 6px 24px rgba(139, 0, 0, 0.12);
}

.file-input {
  display: none;
}

/* 未上传状态 */
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
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

.upload-icon.uploaded {
  color: rgba(34, 139, 34, 1);
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

.format-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(245, 238, 226, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.format-icon:hover {
  background-color: rgba(245, 238, 226, 1);
  transform: translateY(-2px);
}

.format-icon-svg {
  font-size: 20px;
  color: rgba(166, 124, 82, 1);
}

.upload-size-text {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
}

/* 已上传状态 */
.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  gap: 12px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  text-align: center;
  word-break: break-all;
  margin-bottom: 8px;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-Regular;
  margin-bottom: 16px;
}

.file-type, .file-size {
  background-color: rgba(245, 238, 226, 0.5);
  padding: 4px 12px;
  border-radius: 6px;
}

/* 文件操作按钮 */
.file-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: SourceHanSans-Medium;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid;
}

.btn-icon {
  font-size: 16px;
}

.replace-btn {
  background-color: rgba(139, 0, 0, 0.1);
  border-color: rgba(139, 0, 0, 0.3);
  color: rgba(139, 0, 0, 1);
}

.replace-btn:hover {
  background-color: rgba(139, 0, 0, 0.2);
  border-color: rgba(139, 0, 0, 1);
}

.clear-btn {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: rgba(239, 68, 68, 1);
}

.clear-btn:hover {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 1);
}

/* 中心操作按钮 */
.upload-action {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
