<script setup lang="ts">
import { ref, computed } from 'vue'
import { RiUploadCloud2Line, RiRefreshLine, RiCloseLine, RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line, RiFileTextLine, RiDeleteBinLine } from '@remixicon/vue';

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

const titleText = props.side === 'left' ? 'DOCUMENT SOURCE' : 'DOCUMENT MODIFY';
const titleColor = props.side === 'left' ? 'rgba(139,0,0,1)' : 'rgba(46,89,132,1)';

// 声明文件输入框引用
const fileInput = ref<HTMLInputElement | null>(null);

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 根据文件类型获取图标和颜色
const fileTypeInfo = computed(() => {
  const ext = props.fileInfo.name.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    doc: { icon: RiFileWord2Line, color: 'rgba(37,99,235,1)', bg: 'rgba(219,234,254,1)', label: 'Word 文档' },
    docx: { icon: RiFileWord2Line, color: 'rgba(37,99,235,1)', bg: 'rgba(219,234,254,1)', label: 'Word 文档' },
    xls: { icon: RiFileExcel2Line, color: 'rgba(34,139,34,1)', bg: 'rgba(220,252,231,1)', label: 'Excel 表格' },
    xlsx: { icon: RiFileExcel2Line, color: 'rgba(34,139,34,1)', bg: 'rgba(220,252,231,1)', label: 'Excel 表格' },
    ppt: { icon: RiSlideshow2Line, color: 'rgba(217,119,6,1)', bg: 'rgba(254,243,199,1)', label: 'PPT 演示' },
    pptx: { icon: RiSlideshow2Line, color: 'rgba(217,119,6,1)', bg: 'rgba(254,243,199,1)', label: 'PPT 演示' },
    pdf: { icon: RiFilePdf2Line, color: 'rgba(220,38,38,1)', bg: 'rgba(254,242,242,1)', label: 'PDF 文档' },
    txt: { icon: RiFileTextLine, color: 'rgba(107,114,128,1)', bg: 'rgba(243,244,246,1)', label: '文本文件' }
  };
  return typeMap[ext] || { icon: RiFileTextLine, color: 'rgba(107,114,128,1)', bg: 'rgba(243,244,246,1)', label: '未知类型' };
});
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
          <div class="format-icon-wrapper">
            <RiFileWord2Line class="format-icon-svg" />
            <span class="format-tooltip">Word</span>
          </div>
          <div class="format-icon-wrapper">
            <RiFileExcel2Line class="format-icon-svg" />
            <span class="format-tooltip">Excel</span>
          </div>
          <div class="format-icon-wrapper">
            <RiSlideshow2Line class="format-icon-svg" />
            <span class="format-tooltip">PPT</span>
          </div>
          <div class="format-icon-wrapper">
            <RiFilePdf2Line class="format-icon-svg" />
            <span class="format-tooltip">PDF</span>
          </div>
          <div class="format-icon-wrapper">
            <RiFileTextLine class="format-icon-svg" />
            <span class="format-tooltip">TXT</span>
          </div>
        </div>
      </div>

      <!-- 已上传状态 -->
      <div v-else class="file-info">
        <div class="file-info-right">
          <div class="file-icon" :style="{ backgroundColor: fileTypeInfo.bg }">
            <component :is="fileTypeInfo.icon" class="file-icon-svg" :style="{ color: fileTypeInfo.color }" />
          </div>
          <div class="file-details">
            <div class="file-name">{{ fileInfo.name }}</div>
            <div class="file-meta-line">
              <span>{{ fileTypeInfo.label }}</span>
              <span class="meta-dot">·</span>
              <span>{{ fileInfo.size }}</span>
            </div>
          </div>
          <div class="file-actions-inline">
            <label :for="`${props.side}-file`" class="icon-btn" title="更换文件">
              <RiRefreshLine class="icon-btn-svg" />
            </label>
            <button class="icon-btn delete-btn" @click="onClearFile(props.side)" title="清除文件">
              <RiDeleteBinLine class="icon-btn-svg delete" />
            </button>
          </div>
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
  font-family: SourceHanSans-Regular;
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
  font-family: SourceHanSans-Regular;
}

/* 已上传状态 */
.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: hidden;
}

.file-info-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.file-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon-svg {
  font-size: 24px;
}

.file-details {
  width: 100%;
  text-align: center;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Medium;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta-line {
  font-size: 14px;
  color: rgba(107, 114, 128, 1);
  font-family: SourceHanSans-Regular;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.meta-dot {
  font-size: 14px;
}

.file-actions-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background-color: transparent;
  flex-shrink: 0;
}

.icon-btn:hover {
  background-color: rgba(139, 0, 0, 0.1);
}

.icon-btn-svg {
  font-size: 18px;
  color: rgba(107, 114, 128, 1);
}

.icon-btn-svg.delete {
  color: rgba(220, 38, 38, 1);
}

.delete-btn:hover {
  background-color: rgba(220, 38, 38, 0.1);
}

/* 中心操作按钮 */
.upload-action {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
