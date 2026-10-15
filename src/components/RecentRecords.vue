<script setup lang="ts">
import type { Ref } from 'vue';
import {
  RiFileWordLine,
  RiFilePdfLine,
  RiFileTextLine,
  RiFileExcelLine,
  RiFileLine,
  RiFileImageLine,
  RiFilePptLine
} from '@remixicon/vue';

// 定义最近记录类型，与useRecentRecords保持一致
interface RecentRecord {
  id: number;
  filename: string;
  timestamp: string;
  similarity: string;
  leftFileName?: string;
  rightFileName?: string;
}

interface Props {
  recentRecords: RecentRecord[];
  onClearAll: () => void;
  onViewRecord?: (record: RecentRecord) => void;
  onDeleteRecord: (id: number) => void;
  onClose?: () => void;
}

const props = defineProps<Props>();

const handleClearAll = () => {
  props.onClearAll()
  // 清除后关闭弹窗
  if (props.onClose) {
    props.onClose()
  }
}

// 根据文件名获取文件类型
const getFileType = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    'doc': 'Word文档',
    'docx': 'Word文档',
    'pdf': 'PDF文档',
    'txt': '文本文件',
    'ppt': 'PPT演示',
    'pptx': 'PPT演示',
    'xls': 'Excel表格',
    'xlsx': 'Excel表格'
  };
  return typeMap[ext] || '未知类型';
};

// 根据文件类型获取对应的图标组件
const getFileIconComponent = (name: string): any => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, any> = {
    'doc': RiFileWordLine,
    'docx': RiFileWordLine,
    'pdf': RiFilePdfLine,
    'txt': RiFileTextLine,
    'xls': RiFileExcelLine,
    'xlsx': RiFileExcelLine,
    'jpg': RiFileImageLine,
    'jpeg': RiFileImageLine,
    'png': RiFileImageLine,
    'gif': RiFileImageLine,
    'bmp': RiFileImageLine,
    'ppt': RiFilePptLine,
    'pptx': RiFilePptLine
  };
  return iconMap[ext] || RiFileLine;
};
</script>

<template>
  <div class="recent-records">
    <div class="records-header">
      <h3 class="records-title">最近对比记录</h3>
      <button class="select-btn clear-all-btn" @click="handleClearAll">一键清除</button>
    </div>
    <div class="records-list">
      <div v-for="record in props.recentRecords" :key="record.id" class="record-item">
        <div class="record-info">
          <component 
            class="record-icon" 
            :is="record.leftFileName ? getFileIconComponent(record.leftFileName) : getFileIconComponent(record.filename.split(' vs ')[0])"
          />
          <div class="record-details">
            <div class="record-filename">{{ record.filename }}</div>
            <div class="record-timestamp">{{ record.timestamp }}</div>
          </div>
        </div>
        <div class="record-actions">
          <button 
            class="record-action-btn" 
            @click="props.onViewRecord && props.onViewRecord(record)"
            title="查看记录"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button 
            class="record-action-btn" 
            @click="props.onDeleteRecord(record.id)"
            title="删除记录"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
      <div v-if="props.recentRecords.length === 0" class="no-records">
        暂无对比记录
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-records {
  padding: 0;
  margin-top: 0;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.records-title {
  font-size: var(--text-heading);
  font-weight: 600;
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
  margin: 0;
}

.select-btn {
  height: 40px;
  padding: 0 20px;
  background: var(--color-cinnabar);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-cinnabar);
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-btn:hover {
  background: var(--color-cinnabar-dark);
  transform: translateY(-1px);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  transition: all var(--transition-normal);
}

.record-item:hover {
  background: var(--color-cream-dark);
}

.record-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-icon {
  font-size: var(--text-heading);
  color: var(--color-brown-muted);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-filename {
  font-size: var(--text-body);
  color: var(--color-brown-dark);
  font-family: var(--font-ui);
}

.record-timestamp {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
  font-family: var(--font-ui);
}

.record-actions {
  display: flex;
  gap: 8px;
}

.record-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-tan-border);
  border-radius: var(--radius-full);
  background: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  color: var(--color-brown-muted);
  font-size: var(--text-body);
}

.record-action-btn:hover {
  background: rgba(var(--rgb-cinnabar), 0.05);
  color: var(--color-cinnabar);
  border-color: rgba(var(--rgb-cinnabar), 0.3);
}

.no-records {
  text-align: center;
  color: var(--color-brown-muted);
  padding: var(--spacing-5);
  font-family: var(--font-ui);
  font-size: var(--text-body);
}

/* 移动端响应式适配 */
@media (max-width: 768px) {
  .records-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .select-btn {
    width: 100%;
    height: 44px;
  }

  .record-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }

  .record-actions {
    width: 100%;
    display: flex;
    gap: 8px;
  }

  .record-action-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }

  .record-filename {
    font-size: 15px;
    word-break: break-word;
  }

  .record-timestamp {
    font-size: 13px;
  }
}
</style>