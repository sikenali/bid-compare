# 多文件对比功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现多文件对比功能（支持3个以上文件同时对比），包括文件上传、对比结果展示、属性检查，并在系统设置中添加开关控制

**Architecture:** 采用组件化设计，扩展现有FileCompare组件支持多文件模式，使用动态组件渲染对比结果矩阵

**Tech Stack:** Vue 3 + TypeScript + Composition API

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/composables/useSettings.ts` | 添加多文件对比开关配置 |
| `src/components/MultiFileUpload.vue` | 新建：多文件上传组件 |
| `src/components/MultiCompareResult.vue` | 新建：多文件对比结果展示 |
| `src/components/FileCompare.vue` | 修改：根据开关切换单文件/多文件模式 |
| `src/components/SystemSettings.vue` | 修改：添加多文件对比开关UI |

---

## Task 1: 扩展设置模块

**Files:**
- Modify: `src/composables/useSettings.ts:4-31,34-56`

- [ ] **Step 1: 添加多文件对比配置项**

```typescript
// 在 FileCompareSettings 接口中添加
export interface FileCompareSettings {
  // ... 现有配置
  // 多文件对比
  enableMultiFileCompare: boolean
  maxMultiFileCount: number
}

// 在 defaultSettings 中添加默认值
export const defaultSettings: FileCompareSettings = {
  // ... 现有配置
  enableMultiFileCompare: false,
  maxMultiFileCount: 10
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSettings.ts
git commit -m "feat: 添加多文件对比配置项"
```

---

## Task 2: 创建多文件上传组件

**Files:**
- Create: `src/components/MultiFileUpload.vue`

- [ ] **Step 1: 创建多文件上传组件**

```vue
<template>
  <div class="multi-file-upload">
    <div class="upload-header">
      <h3>文件上传</h3>
      <span class="file-count">已选择 {{ files.length }} / {{ maxCount }} 个文件</span>
    </div>
    
    <div class="upload-area" 
         @dragover.prevent="onDragOver"
         @dragleave="onDragLeave"
         @drop.prevent="onDrop"
         :class="{ 'drag-over': isDragOver }">
      <input type="file" 
             ref="fileInput"
             :accept="acceptTypes"
             multiple
             @change="onFileSelect"
             class="file-input" />
      <div class="upload-content" @click="triggerFileInput">
        <RiUploadCloudLine class="upload-icon" />
        <p>点击或拖拽文件到这里</p>
        <p class="upload-hint">支持 Word、PDF、PPT、Excel 格式</p>
      </div>
    </div>

    <div class="file-list" v-if="files.length > 0">
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-info">
          <RiFileLine class="file-icon" />
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
        </div>
        <button class="remove-btn" @click="removeFile(index)">
          <RiCloseLine />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RiUploadCloudLine, RiFileLine, RiCloseLine } from '@remixicon/vue'

interface Props {
  maxCount?: number
  acceptTypes?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 10,
  acceptTypes: '.docx,.pdf,.pptx,.xlsx,.txt'
})

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void
}>()

const files = ref<File[]>([])
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
  }
}

const onDragOver = () => { isDragOver.value = true }
const onDragLeave = () => { isDragOver.value = false }

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const addFiles = (newFiles: File[]) => {
  const remaining = props.maxCount - files.value.length
  const toAdd = newFiles.slice(0, remaining)
  files.value = [...files.value, ...toAdd]
  emit('update:files', files.value)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
  emit('update:files', files.value)
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const clearFiles = () => {
  files.value = []
  emit('update:files', [])
}

defineExpose({ clearFiles })
</script>

<style scoped>
.multi-file-upload {
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.upload-header h3 {
  margin: 0;
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
}

.file-count {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.7);
}

.upload-area {
  border: 2px dashed rgba(166, 124, 82, 0.3);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: rgba(46, 89, 132, 0.6);
  background: rgba(248, 244, 233, 0.5);
}

.file-input {
  display: none;
}

.upload-icon {
  font-size: 32px;
  color: rgba(46, 89, 132, 0.6);
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.6);
  margin-top: 4px;
}

.file-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(248, 244, 233, 0.3);
  border-radius: 6px;
  margin-bottom: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
  color: rgba(46, 89, 132, 0.8);
}

.file-name {
  font-size: 13px;
  color: rgba(44, 24, 16, 1);
}

.file-size {
  font-size: 11px;
  color: rgba(101, 70, 40, 0.6);
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(196, 30, 58, 0.7);
  padding: 4px;
}

.remove-btn:hover {
  color: rgba(196, 30, 58, 1);
}
</style>
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/components/MultiFileUpload.vue
git commit -m "feat: 创建多文件上传组件"
```

---

## Task 3: 创建多文件对比结果组件

**Files:**
- Create: `src/components/MultiCompareResult.vue`

- [ ] **Step 1: 创建多文件对比结果组件**

```vue
<template>
  <div class="multi-compare-result">
    <div class="result-header">
      <h2>多文件对比结果</h2>
      <div class="result-summary">
        <span class="summary-item">
          <strong>{{ fileCount }}</strong> 个文件
        </span>
        <span class="summary-item">
          发现 <strong>{{ totalDuplicates }}</strong> 组重复
        </span>
      </div>
    </div>

    <!-- 相似度矩阵 -->
    <div class="similarity-matrix">
      <h3>相似度矩阵</h3>
      <div class="matrix-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="(file, idx) in fileNames" :key="idx" class="matrix-header">
                {{ truncateName(file) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(file, rowIdx) in fileNames" :key="rowIdx">
              <td class="matrix-header">{{ truncateName(file) }}</td>
              <td v-for="(colFile, colIdx) in fileNames" :key="colIdx" 
                  class="matrix-cell"
                  :class="getSimilarityClass(similarityMatrix[rowIdx]?.[colIdx])">
                <span v-if="rowIdx === colIdx" class="diagonal">-</span>
                <span v-else>{{ similarityMatrix[rowIdx]?.[colIdx] || 0 }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 重复片段详情 -->
    <div class="duplicate-details">
      <h3>重复片段详情</h3>
      <div class="duplicate-list">
        <div v-for="(dup, idx) in duplicates" :key="idx" class="duplicate-card">
          <div class="duplicate-header">
            <span class="duplicate-pair">
              {{ dup.leftFileName }} ↔ {{ dup.rightFileName }}
            </span>
            <span class="duplicate-similarity" :class="{ 'high': dup.similarity >= 75 }">
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const fileCount = computed(() => props.fileNames.length)

const totalDuplicates = computed(() => props.duplicates.length)

const truncateName = (name: string): string => {
  return name.length > 10 ? name.substring(0, 8) + '...' : name
}

const getSimilarityClass = (value: number): string => {
  if (!value) return ''
  if (value >= 75) return 'high'
  if (value >= 50) return 'medium'
  if (value >= 25) return 'low'
  return ''
}
</script>

<style scoped>
.multi-compare-result {
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
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
  color: rgba(44, 24, 16, 1);
}

.result-summary {
  display: flex;
  gap: 16px;
}

.summary-item {
  font-size: 14px;
  color: rgba(101, 70, 40, 0.8);
}

.similarity-matrix {
  margin-bottom: 24px;
}

.similarity-matrix h3 {
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 12px;
}

.matrix-container {
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
}

.matrix-table th,
.matrix-table td {
  padding: 8px 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
  text-align: center;
  font-size: 12px;
}

.matrix-header {
  background: rgba(248, 244, 233, 0.5);
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.matrix-cell {
  transition: background 0.2s;
}

.matrix-cell.high {
  background: rgba(196, 30, 58, 0.1);
  color: rgba(196, 30, 58, 1);
}

.matrix-cell.medium {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 1);
}

.matrix-cell.low {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 1);
}

.diagonal {
  color: rgba(101, 70, 40, 0.4);
}

.duplicate-details h3 {
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
  margin-bottom: 12px;
}

.duplicate-card {
  background: rgba(248, 244, 233, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.duplicate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.duplicate-pair {
  font-size: 13px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
}

.duplicate-similarity {
  font-size: 14px;
  font-weight: 700;
  color: rgba(101, 70, 40, 0.8);
}

.duplicate-similarity.high {
  color: rgba(196, 30, 58, 1);
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
  margin-bottom: 4px;
}

.side-text {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(44, 24, 16, 0.9);
  background: rgba(255, 255, 255, 0.5);
  padding: 8px;
  border-radius: 4px;
  max-height: 100px;
  overflow-y: auto;
}

.side-text :deep(.highlighted-text) {
  background: rgba(255, 235, 59, 0.4);
  padding: 0 2px;
  border-radius: 2px;
}
</style>
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src/components/MultiCompareResult.vue
git commit -m "feat: 创建多文件对比结果组件"
```

---

## Task 4: 修改 FileCompare 支持多文件模式

**Files:**
- Modify: `src/components/FileCompare.vue`

- [ ] **Step 1: 导入新组件并添加多文件状态**

在 `<script setup>` 部分添加：

```typescript
import MultiFileUpload from './MultiFileUpload.vue'
import MultiCompareResult from './MultiCompareResult.vue'

// 多文件对比状态
const multiFiles = ref<File[]>([])
const multiFileMode = computed(() => settings.enableMultiFileCompare)
const showMultiResult = ref(false)
const multiSimilarityMatrix = ref<number[][]>([])
const multiDuplicates = ref<any[]>([])
```

- [ ] **Step 2: 添加多文件对比处理函数**

```typescript
// 多文件对比
const handleMultiFileCompare = async () => {
  if (multiFiles.value.length < 2) {
    comparisonParseError.value = '请至少上传2个文件'
    return
  }

  isProcessing.value = true
  progressMessage.value = '正在解析文件...'

  try {
    // 解析所有文件
    const parseResults = await Promise.all(
      multiFiles.value.map((file, idx) => {
        progress.value = (idx + 1) / multiFiles.value.length * 0.3
        return parseFile(file, getAbortSignal())
      })
    )

    // 构建相似度矩阵
    const fileCount = multiFiles.value.length
    const matrix: number[][] = Array(fileCount).fill(null).map(() => Array(fileCount).fill(0))
    const allDuplicates: any[] = []

    // 两两对比
    for (let i = 0; i < fileCount; i++) {
      for (let j = i + 1; j < fileCount; j++) {
        progressMessage.value = `正在对比 ${multiFiles.value[i].name} 与 ${multiFiles.value[j].name}...`
        progress.value = 0.3 + ((i * fileCount + j) / (fileCount * fileCount)) * 0.7

        const result = await runComparison(
          parseResults[i].content,
          parseResults[j].content,
          {
            minDuplicateWords: settings.minDuplicateWords,
            textSimilarityThreshold: settings.textSimilarityThreshold,
            ignoreCase: settings.ignoreCase,
            ignorePunctuation: settings.ignorePunctuation,
            ignoreWhitespace: settings.ignoreWhitespace
          },
          parseResults[i].pageMap,
          parseResults[j].pageMap
        )

        matrix[i][j] = result.similarity
        matrix[j][i] = result.similarity

        // 收集重复片段
        result.segments.forEach(seg => {
          allDuplicates.push({
            leftFileName: multiFiles.value[i].name,
            rightFileName: multiFiles.value[j].name,
            leftContent: seg.leftContent,
            rightContent: seg.rightContent,
            similarity: seg.similarityValue
          })
        })
      }
    }

    multiSimilarityMatrix.value = matrix
    multiDuplicates.value = allDuplicates
    showMultiResult.value = true
  } catch (error) {
    comparisonParseError.value = (error as Error).message
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}
```

- [ ] **Step 3: 修改模板支持多文件模式**

在模板中添加条件渲染：

```vue
<!-- 多文件上传区域 -->
<template v-if="multiFileMode">
  <MultiFileUpload 
    ref="multiFileUploadRef"
    :max-count="settings.maxMultiFileCount"
    @update:files="multiFiles = $event"
  />
  
  <div class="compare-action-area">
    <button class="compare-main-btn" 
            @click="handleMultiFileCompare" 
            :disabled="isProcessing || multiFiles.length < 2">
      <RiExchangeLine class="compare-icon" :class="{ 'rotating': isProcessing }" />
      <span class="btn-text">多文件对比</span>
    </button>
  </div>
</template>

<!-- 多文件对比结果 -->
<MultiCompareResult 
  v-if="showMultiResult"
  :file-names="multiFiles.map(f => f.name)"
  :similarity-matrix="multiSimilarityMatrix"
  :duplicates="multiDuplicates"
/>
```

- [ ] **Step 4: 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 5: Commit**

```bash
git add src/components/FileCompare.vue
git commit -m "feat: FileCompare支持多文件对比模式"
```

---

## Task 5: 修改系统设置添加开关

**Files:**
- Modify: `src/components/SystemSettings.vue`

- [ ] **Step 1: 在设置页面添加多文件对比开关**

在模板中添加：

```vue
<!-- 多文件对比设置 -->
<div class="settings-section">
  <h3 class="section-title">多文件对比</h3>
  
  <div class="setting-row">
    <div class="setting-label">
      <span class="label-text">启用多文件对比</span>
      <span class="label-hint">开启后可同时对比多个文件</span>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" v-model="settings.enableMultiFileCompare" />
      <span class="slider"></span>
    </label>
  </div>

  <div class="setting-row" v-if="settings.enableMultiFileCompare">
    <div class="setting-label">
      <span class="label-text">最大文件数量</span>
      <span class="label-hint">单次对比最多支持的文件数</span>
    </div>
    <input type="number" 
           v-model.number="settings.maxMultiFileCount" 
           min="3" 
           max="20"
           class="setting-input" />
  </div>
</div>
```

- [ ] **Step 2: 添加样式**

```css
.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(166, 124, 82, 0.15);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(44, 24, 16, 1);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(166, 124, 82, 0.1);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-text {
  font-size: 14px;
  color: rgba(44, 24, 16, 1);
}

.label-hint {
  font-size: 12px;
  color: rgba(101, 70, 40, 0.6);
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(166, 124, 82, 0.3);
  border-radius: 24px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .slider {
  background: rgba(46, 89, 132, 0.8);
}

.toggle-switch input:checked + .slider:before {
  transform: translateX(24px);
}

.setting-input {
  width: 80px;
  padding: 6px 12px;
  border: 1px solid rgba(166, 124, 82, 0.3);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}
```

- [ ] **Step 3: 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src/components/SystemSettings.vue
git commit -m "feat: 系统设置添加多文件对比开关"
```

---

## Task 6: 完整测试验证

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 服务器启动成功

- [ ] **Step 2: 测试单文件模式**

1. 访问 http://localhost:5173
2. 上传2个文件进行对比
3. 验证对比结果正常显示

- [ ] **Step 3: 测试多文件模式**

1. 进入系统设置，开启"多文件对比"
2. 返回文件对比页面
3. 上传3个以上文件
4. 点击"多文件对比"按钮
5. 验证相似度矩阵和重复片段正确显示

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成多文件对比功能实现"
```
