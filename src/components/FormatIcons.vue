<template>
  <div class="upload-format-icons">
    <div class="format-icon-wrapper" v-for="fmt in formatIcons" :key="fmt.type">
      <component :is="fmt.icon" class="format-icon-svg" />
      <span class="format-tooltip">{{ fmt.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  RiFileWord2Line, RiFileExcel2Line, RiSlideshow2Line, RiFilePdf2Line, RiFileTextLine
} from '@remixicon/vue'

const formatIcons = [
  { type: 'word', icon: RiFileWord2Line, label: 'Word' },
  { type: 'excel', icon: RiFileExcel2Line, label: 'Excel' },
  { type: 'ppt', icon: RiSlideshow2Line, label: 'PPT' },
  { type: 'pdf', icon: RiFilePdf2Line, label: 'PDF' },
  { type: 'txt', icon: RiFileTextLine, label: 'TXT' }
]
</script>

<style scoped>
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
  background: var(--color-cream-darker);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.format-icon-wrapper:hover {
  background: var(--color-cream-darker);
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
  background: rgba(var(--rgb-brown-dark), 0.9);
  color: white;
  font-size: 11px;
  border-radius: var(--radius-xs);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
  z-index: 10;
}

.format-icon-wrapper:hover .format-tooltip {
  opacity: 1;
}

@media (max-width: 768px) {
  .upload-format-icons {
    gap: 8px;
  }

  .format-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .format-icon-svg {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .upload-format-icons {
    gap: 6px;
  }

  .format-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .format-icon-svg {
    font-size: 16px;
  }
}
</style>
