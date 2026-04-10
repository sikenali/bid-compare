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
  recentRecords: Ref<RecentRecord[]>;
  onClearAll: () => void;
  onViewRecord?: (record: RecentRecord) => void;
  onDeleteRecord: (id: number) => void;
}

const props = defineProps<Props>();

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
      <button class="select-btn clear-all-btn" @click="props.onClearAll">一键清除</button>
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
  font-size: 16px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
  margin: 0;
}

.select-btn {
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(139, 0, 0, 1) 0%, rgba(196, 30, 58, 1) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: SourceHanSans-SemiBold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-btn:hover {
  box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
  transform: translateY(-2px);
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
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.record-item:hover {
  background-color: rgba(239, 246, 255, 0.5);
}

.record-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-icon {
  font-size: 16px;
  color: #9CA3AF;
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-filename {
  font-size: 14px;
  color: #333333;
  font-family: SourceHanSans-Regular;
}

.record-timestamp {
  font-size: 12px;
  color: #888888;
  font-family: SourceHanSans-Regular;
}

.record-actions {
  display: flex;
  gap: 8px;
}

.record-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #E5E7EB;
  border-radius: 9999px;
  background-color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #666666;
  font-size: 14px;
}

.record-action-btn:hover {
  background-color: rgba(139, 0, 0, 0.05);
  color: rgba(139, 0, 0, 1);
  border-color: rgba(139, 0, 0, 0.3);
}

.no-records {
  text-align: center;
  color: #9CA3AF;
  padding: 20px;
  font-family: SourceHanSans-Regular;
  font-size: 14px;
}
</style>