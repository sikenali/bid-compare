<template>
  <div class="multi-compare-result">
    <div class="result-header">
      <h2>多文件对比结果</h2>
      <button class="back-btn" @click="$emit('close')">
        <RiArrowLeftLine class="back-icon" />
        <span>返回</span>
      </button>
    </div>

    <div class="result-summary">
      <div class="summary-card">
        <span class="summary-label">文件数量</span>
        <span class="summary-value">{{ fileCount }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">重复片段</span>
        <span class="summary-value">{{ totalDuplicates }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">平均相似度</span>
        <span class="summary-value">{{ averageSimilarity }}%</span>
      </div>
    </div>

    <!-- 相似度矩阵 -->
    <div class="similarity-matrix">
      <h3>相似度矩阵</h3>
      <div class="matrix-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="corner-cell"></th>
              <th v-for="(file, idx) in fileNames" :key="idx" class="matrix-header">
                <div class="header-content">
                  <RiFileLine class="file-icon" />
                  <span>{{ truncateName(file) }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, rowIdx) in fileNames" :key="rowIdx">
              <td class="matrix-header row-header">
                <div class="header-content">
                  <RiFileLine class="file-icon" />
                  <span>{{ truncateName(file) }}</span>
                </div>
              </td>
              <td v-for="(colFile, colIdx) in fileNames" :key="colIdx" 
                  class="matrix-cell"
                  :class="getSimilarityClass(similarityMatrix[rowIdx]?.[colIdx])">
                <span v-if="rowIdx === colIdx" class="diagonal">-</span>
                <span v-else-if="similarityMatrix[rowIdx]?.[colIdx] !== undefined">
                  {{ similarityMatrix[rowIdx][colIdx] }}%
                </span>
                <span v-else class="no-data">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 重复片段详情 -->
    <div class="duplicate-details" v-if="duplicates.length > 0">
      <h3>重复片段详情 ({{ duplicates.length }})</h3>
      <div class="duplicate-list">
        <div v-for="(dup, idx) in sortedDuplicates" :key="idx" class="duplicate-card">
          <div class="duplicate-header">
            <div class="duplicate-pair">
              <span class="file-tag">{{ dup.leftFileName }}</span>
              <RiArrowRightLine class="arrow-icon" />
              <span class="file-tag">{{ dup.rightFileName }}</span>
            </div>
            <span class="duplicate-similarity" :class="getSimilarityClass(dup.similarity)">
              {{ dup.similarity }}%
            </span>
          </div>
          <div class="duplicate-content">
            <div class="content-side">
              <div class="side-label">{{ dup.leftFileName }}</div>
              <div class="side-text" v-html="dup.leftContent"></div>
            </div>
            <div class="content-side">
              <div class="side-label">{{ dup.rightFileName }}</div>
              <div class="side-text" v-html="dup.rightContent"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="no-duplicates" v-else>
      <RiCheckLine class="no-dup-icon" />
      <p>未发现重复片段</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RiFileLine, RiArrowRightLine, RiArrowLeftLine, RiCheckLine } from '@remixicon/vue'

interface DuplicatePair {
  leftFileName: string
  rightFileName: string
  leftContent: string
  rightContent: string
  similarity: number
}

interface Props {
  fileNames: string[]
  similarityMatrix: number[][]
  duplicates: DuplicatePair[]
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'close'): void
}>()

const fileCount = computed(() => props.fileNames.length)

const totalDuplicates = computed(() => props.duplicates.length)

const averageSimilarity = computed(() => {
  if (props.duplicates.length === 0) return 0
  const sum = props.duplicates.reduce((acc, dup) => acc + dup.similarity, 0)
  return Math.round(sum / props.duplicates.length)
})

const sortedDuplicates = computed(() => {
  return [...props.duplicates].sort((a, b) => b.similarity - a.similarity)
})

const truncateName = (name: string): string => {
  if (name.length <= 12) return name
  return name.substring(0, 10) + '...'
}

const getSimilarityClass = (value: number | undefined): string => {
  if (value === undefined || value === null) return ''
  if (value >= 75) return 'high'
  if (value >= 50) return 'medium'
  if (value >= 25) return 'low'
  return 'minimal'
}
</script>

<style scoped>
.multi-compare-result {
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  box-shadow: 0 4px 16px rgba(44, 24, 16, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-SemiBold;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(101, 70, 40, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(248, 244, 233, 0.8);
  border-color: rgba(166, 124, 82, 0.5);
}

.back-icon {
  font-size: 16px;
}

.result-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, rgba(248, 244, 233, 0.6), rgba(245, 238, 226, 0.4));
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
  margin-bottom: 4px;
}

.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: rgba(44, 24, 16, 1);
  font-family: SourceHanSans-Bold;
}

.similarity-matrix {
  margin-bottom: 24px;
}

.similarity-matrix h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 12px 0;
}

.matrix-container {
  overflow-x: auto;
  padding-bottom: 8px;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 400px;
}

.matrix-table th,
.matrix-table td {
  padding: 10px 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  text-align: center;
  font-size: 12px;
}

.corner-cell {
  background: rgba(248, 244, 233, 0.3);
}

.matrix-header {
  background: rgba(248, 244, 233, 0.5);
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.row-header {
  text-align: left;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-icon {
  font-size: 14px;
  color: rgba(46, 89, 132, 0.8);
  flex-shrink: 0;
}

.matrix-cell {
  transition: all 0.2s;
  font-weight: 500;
}

.matrix-cell:hover {
  background: rgba(248, 244, 233, 0.5);
}

.matrix-cell.high {
  background: rgba(196, 30, 58, 0.15);
  color: rgba(196, 30, 58, 1);
}

.matrix-cell.medium {
  background: rgba(255, 152, 0, 0.15);
  color: rgba(255, 152, 0, 1);
}

.matrix-cell.low {
  background: rgba(76, 175, 80, 0.15);
  color: rgba(76, 175, 80, 1);
}

.matrix-cell.minimal {
  color: rgba(101, 70, 40, 0.5);
}

.diagonal {
  color: rgba(101, 70, 40, 0.4);
  font-style: italic;
}

.no-data {
  color: rgba(101, 70, 40, 0.3);
}

.duplicate-details h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 12px 0;
}

.duplicate-list {
  max-height: 400px;
  overflow-y: auto;
}

.duplicate-card {
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid rgba(166, 124, 82, 0.15);
  transition: all 0.2s;
}

.duplicate-card:hover {
  border-color: rgba(166, 124, 82, 0.3);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.08);
}

.duplicate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.duplicate-pair {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(46, 89, 132, 0.1);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(46, 89, 132, 1);
}

.arrow-icon {
  font-size: 16px;
  color: rgba(101, 70, 40, 0.5);
}

.duplicate-similarity {
  font-size: 16px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 6px;
}

.duplicate-similarity.high {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.duplicate-similarity.medium {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.duplicate-similarity.low {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 1);
}

.duplicate-content {
  display: flex;
  gap: 12px;
}

.content-side {
  flex: 1;
  min-width: 0;
}

.side-label {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.7);
  margin-bottom: 6px;
  font-weight: 500;
}

.side-text {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(44, 24, 16, 0.9);
  background: rgba(255, 255, 255, 0.6);
  padding: 10px 12px;
  border-radius: 6px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-word;
}

.side-text :deep(.highlighted-text) {
  background: rgba(255, 235, 59, 0.5);
  padding: 1px 3px;
  border-radius: 2px;
}

.no-duplicates {
  text-align: center;
  padding: 40px 20px;
  color: rgba(101, 70, 40, 0.6);
}

.no-dup-icon {
  font-size: 48px;
  color: rgba(76, 175, 80, 0.6);
  margin-bottom: 12px;
}

.no-duplicates p {
  margin: 0;
  font-size: 14px;
}
</style>
