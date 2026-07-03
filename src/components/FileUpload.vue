<script setup lang="ts">
import { ref, computed } from 'vue'
import { RiUploadCloud2Line, RiExchangeLine, RiCloseCircleLine, RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line, RiFileTextLine, RiDeleteBinLine } from '@remixicon/vue';

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

const titleText = props.side === 'left' ? '原始文件' : '修改文件';
const titleColor = props.side === 'left' ? 'var(--color-cinnabar)' : 'var(--color-cloud-blue)';

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
    doc: { icon: RiFileWord2Line, color: 'var(--color-cloud-blue)', bg: 'rgba(var(--rgb-cloud-blue), 0.1)', label: 'Word 文档' },
    docx: { icon: RiFileWord2Line, color: 'var(--color-cloud-blue)', bg: 'rgba(var(--rgb-cloud-blue), 0.1)', label: 'Word 文档' },
    xls: { icon: RiFileExcel2Line, color: 'var(--color-jade)', bg: 'rgba(var(--rgb-jade), 0.1)', label: 'Excel 表格' },
    xlsx: { icon: RiFileExcel2Line, color: 'var(--color-jade)', bg: 'rgba(var(--rgb-jade), 0.1)', label: 'Excel 表格' },
    ppt: { icon: RiSlideshow2Line, color: 'var(--color-gold-dark)', bg: 'rgba(var(--rgb-gold-dark), 0.1)', label: 'PPT 演示' },
    pptx: { icon: RiSlideshow2Line, color: 'var(--color-gold-dark)', bg: 'rgba(var(--rgb-gold-dark), 0.1)', label: 'PPT 演示' },
    pdf: { icon: RiFilePdf2Line, color: 'var(--color-cinnabar)', bg: 'rgba(var(--rgb-cinnabar), 0.1)', label: 'PDF 文档' },
    txt: { icon: RiFileTextLine, color: 'var(--color-brown-muted)', bg: 'rgba(var(--rgb-brown-muted), 0.1)', label: '文本文件' }
  };
  return typeMap[ext] || { icon: RiFileTextLine, color: 'var(--color-brown-muted)', bg: 'rgba(var(--rgb-brown-muted), 0.1)', label: '未知类型' };
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
        accept=".docx,.pdf,.txt,.xlsx,.pptx"
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
            <div class="file-name" :title="fileInfo.name">{{ fileInfo.name }}</div>
            <div class="file-meta-line">
              <span>{{ fileTypeInfo.label }}</span>
              <span class="meta-dot">·</span>
              <span>{{ fileInfo.size }}</span>
            </div>
          </div>
          <div class="file-actions-inline">
            <label :for="`${props.side}-file`" class="icon-btn" title="更换文件">
              <RiExchangeLine class="icon-btn-svg" />
            </label>
            <button class="icon-btn delete-btn" @click="onClearFile(props.side)" title="清除文件">
              <RiCloseCircleLine class="icon-btn-svg delete" />
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
  width: 100%;
  max-width: 547px;
  height: 347px;
}

@media (max-width: 768px) {
  .file-upload-container {
    max-width: 100%;
    height: auto;
    min-height: 280px;
  }
}

.upload-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.title-decoration {
  width: 5px;
  height: 24px;
  border-radius: var(--radius-xs);
}

.title-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.upload-area {
  flex: 1;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.upload-area:hover {
  border-color: var(--color-cinnabar);
  box-shadow: var(--shadow-cinnabar);
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-6);
  gap: var(--spacing-2);
  background: #F5EFE3;
}

.upload-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: #F5EFE3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-6);
  transition: all var(--transition-normal);
}

.upload-area:hover .upload-icon-wrapper {
  background: #F5EFE3;
  transform: scale(1.05);
}

.upload-icon {
  font-size: 40px;
  color: var(--color-brown-muted);
}

.upload-icon.uploaded {
  color: var(--color-jade);
}

.upload-main-text {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin-bottom: var(--spacing-4);
}

.upload-format-icons {
  display: flex;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.format-icon-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: #F5EFE3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.format-icon-wrapper:hover {
  background: #F5EFE3;
  transform: translateY(-2px);
}

.format-icon-svg {
  font-size: 20px;
  color: var(--color-brown-muted);
}

.format-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: var(--color-brown-dark);
  color: white;
  font-size: var(--text-micro);
  font-family: var(--font-ui);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
  z-index: 10;
}

.format-icon-wrapper:hover .format-tooltip {
  opacity: 1;
}

.upload-size-text {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: var(--spacing-4);
  overflow: hidden;
}

.file-info-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  width: 100%;
}

.file-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
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
  font-size: var(--text-heading);
  font-weight: 500;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta-line {
  font-size: var(--text-body);
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

.meta-dot {
  font-size: var(--text-body);
}

.file-actions-inline {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
  justify-content: center;
}

.icon-btn {
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

.icon-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.1);
}

.icon-btn-svg {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: var(--color-brown-muted);
  transition: all var(--transition-normal);
  flex-shrink: 0;
}

.icon-btn:hover .icon-btn-svg {
  color: var(--color-cinnabar);
}

.icon-btn-svg.delete {
  color: var(--color-cinnabar);
}

.delete-btn:hover .icon-btn-svg.delete {
  color: var(--color-cinnabar-dark);
  transform: scale(1.1);
}

.upload-action {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-2);
}

@media (max-width: 768px) {
  .upload-placeholder {
    padding: var(--spacing-4);
  }

  .upload-icon-wrapper {
    width: 64px;
    height: 64px;
    margin-bottom: var(--spacing-4);
  }

  .upload-icon {
    font-size: 32px;
  }

  .upload-main-text {
    font-size: var(--text-heading);
    margin-bottom: var(--spacing-3);
  }

  .format-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .format-icon-svg {
    font-size: 18px;
  }
}
</style>
