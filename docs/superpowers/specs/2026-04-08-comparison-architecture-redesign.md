# 文件对比架构重构设计文档

**日期:** 2026-04-08
**状态:** 待实现
**方案:** B - 主从页面模式

---

## 视觉设计参考

设计稿来源：Calicat 原型设计，开发时应以下方链接中的视觉稿为准。

| 页面 | 设计稿链接 |
|------|-----------|
| 文件对比首页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=0fcb05a4-1dc5-4059-b539-bdde64326e20&node-type=group&mode=design) |
| 文件对比结果页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=ada5be1a-7625-4145-9099-01475df0ebe0&node-type=group&mode=design) |
| 属性检查首页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=6a6adcf1-f7aa-4d7b-b603-d78718b541cc&node-type=group&mode=design) |
| 属性检查结果页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=5070a03f-ed00-4727-b11d-6b2399e4b3fd&node-type=group&mode=design) |
| 硬件属性页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=a4ebfc38-33c7-46a8-aef8-2ee89c682203&node-type=group&mode=design) |
| 系统设置页 | [打开设计稿](https://www.calicat.cn/design/2041680174653206528?node-id=8eae5537-4d1c-40cd-b843-30f6359c0380&node-type=group&mode=design) |

---

## 概述

重构文件对比模块的架构，解决大文件（几万字以上）处理时的性能问题和用户体验瓶颈。保持现有"上传页 → 结果页"的两页结构，通过引入 IndexedDB 和分步加载替代 sessionStorage 全量加载模式。

---

## 问题陈述

### 现状

1. **存储限制** - 使用 sessionStorage 存储对比结果，容量限制约 5MB，大文件对比结果无法完整存储
2. **全量渲染** - 结果页一次性加载并渲染所有相似片段，DOM 节点过多导致页面卡顿
3. **无进度反馈** - 对比过程无进度提示，用户不知道当前状态
4. **一次性计算** - 大文件对比一次性完成，Worker 运行期间无中间状态回报
5. **内存常驻** - 原始文本和对比结果同时存在于内存，大文件场景内存占用高

### 目标

1. 支持 50 万字以上文件的对比
2. 结果页按需加载，每批 50 条
3. 对比过程展示实时进度
4. 对比完成后释放原始文本内存
5. 支持历史任务查询

---

## 架构设计

### 架构变更

```
现有架构:
上传页 → parseFile() → compareTexts() → sessionStorage(5MB限制) → 跳转 → 结果页(全量渲染)

新架构:
上传页 → parseFile() → compareTexts()(分块) → IndexedDB(无容量限制) → 跳转 → 结果页(按需加载50条/批)
```

### 新增文件

```
src/
├── db/
│   └── comparisonDB.ts              # IndexedDB 封装
├── composables/
│   ├── useComparisonEngine.ts       # 统一对比引擎
│   └── useResultLoader.ts           # 结果加载器
└── components/
    └── file-compare/
        ├── ComparisonProgress.vue   # 进度条组件
        └── LoadMoreButton.vue       # 加载更多按钮（可选）
```

### 改动文件

```
src/components/FileCompare.vue           # 使用新引擎，新增进度展示
src/components/FileCompareResult.vue     # 从 DB 按需加载，移除假分页
src/components/file-compare/SegmentList.vue  # 兼容 props 传入数据
```

---

## 详细设计

### 1. IndexedDB 封装 (`src/db/comparisonDB.ts`)

#### 数据库结构

**数据库名称:** `bid-assistant-comparisons`  
**版本:** 1

**Store 1: `tasks`**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID（主键），格式 `task_${timestamp}_${random}` |
| `createdAt` | string | ISO 8601 时间戳 |
| `leftFileName` | string | 左侧文件名称 |
| `rightFileName` | string | 右侧文件名称 |
| `stats` | object | `{ totalWords, similarWords, similarityRate }` |
| `segmentsCount` | number | 相似片段总数 |

**Store 2: `segments`**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | auto-increment | 自增主键 |
| `taskId` | string | 所属任务 ID（索引） |
| `segmentIndex` | number | 片段序号（用于排序） |
| `leftContent` | string | 左侧文件内容（含高亮 HTML） |
| `rightContent` | string | 右侧文件内容（含高亮 HTML） |
| `leftPage` | string | 左侧文件位置 |
| `rightPage` | string | 右侧文件位置 |
| `similarityValue` | number | 相似度百分比 |

#### 接口定义

```typescript
interface ComparisonDB {
  saveTaskMeta(taskId: string, meta: TaskMeta): Promise<void>
  getTaskMeta(taskId: string): Promise<TaskMeta | null>
  saveSegments(taskId: string, segments: SaveSegment[]): Promise<void>
  getSegments(taskId: string, offset: number, limit: number): Promise<SimilarSegment[]>
  getStats(taskId: string): Promise<ComparisonStats | null>
  getSegmentCount(taskId: string): Promise<number>
  deleteTask(taskId: string): Promise<void>
  listTasks(): Promise<TaskMeta[]>
  clearAllTasks(): Promise<void>
}

interface TaskMeta {
  id: string
  createdAt: string
  leftFileName: string
  rightFileName: string
  stats: ComparisonStats
  segmentsCount: number
}

interface ComparisonStats {
  totalWords: number
  similarWords: number
  similarityRate: number
}

interface SaveSegment {
  taskId: string
  segmentIndex: number
  leftContent: string
  rightContent: string
  leftPage: string
  rightPage: string
  similarityValue: number
}
```

#### 实现要点

- 使用原生 `indexedDB` API 或 `idb` 库（优先原生，减少依赖）
- `taskId` + `segmentIndex` 建复合索引，支持高效分页查询
- 写入操作使用事务，保证一致性
- 查询结果按 `segmentIndex` 排序

---

### 2. 统一对比引擎 (`src/composables/useComparisonEngine.ts`)

#### 职责

封装文件解析、对比计算、进度回报、结果存储的完整流程。

#### 接口定义

```typescript
interface ComparisonEngine {
  startComparison(
    leftFile: File,
    rightFile: File,
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<string>  // 返回 taskId
  
  cancelComparison(taskId: string): void
  isRunning(taskId: string): boolean
}

interface ProgressInfo {
  stage: 'parsing' | 'comparing' | 'saving'
  progress: number        // 0-100
  message: string         // 用户可读提示，如 "正在对比内容 (3/12)"
  detail?: string         // 可选的补充信息
}

interface ComparisonError {
  type: ComparisonErrorType
  message: string
  recoverable: boolean
  details?: string
}

type ComparisonErrorType =
  | 'FILE_PARSE_ERROR'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'WORKER_TIMEOUT'
  | 'WORKER_CRASH'
  | 'DB_WRITE_ERROR'
  | 'DB_READ_ERROR'
  | 'TASK_NOT_FOUND'
  | 'CANCELLED'
  | 'UNKNOWN'
```

#### 执行流程

```
startComparison(leftFile, rightFile, onProgress)
  │
  ├── 1. 生成 taskId
  │
  ├── 2. 阶段: parsing (进度 0-20%)
  │     ├── 调用 parseFile(leftFile)
  │     ├── 调用 parseFile(rightFile)
  │     └── 验证解析结果非空
  │
  ├── 3. 阶段: comparing (进度 20-80%)
  │     ├── 计算分块数量（基于文本长度 / CHUNK_SIZE=5000）
  │     ├── 逐块调用 compareTexts() 或 Worker
  │     │     ├── 检查 cancelledTasks 集合，如被取消则抛错
  │     │     ├── 当前块对比完成后
  │     │     │     ├── 结果写入 IndexedDB (saveSegments)
  │     │     │     └── 调用 onProgress 回报进度
  │     │     └── Worker 超时时抛错 (WORKER_TIMEOUT)
  │     └── 汇总所有块的统计信息
  │
  ├── 4. 阶段: saving (进度 80-100%)
  │     ├── 计算全局统计信息
  │     ├── 保存 taskMeta 到 IndexedDB
  │     └── 更新进度为 100%
  │
  ├── 5. 释放原始文本内存（置为 null）
  │
  └── 6. 返回 taskId
```

#### 分块策略

```typescript
const CHUNK_SIZE = 5000 // 每块约 5000 字

function splitIntoChunks(leftText: string, rightText: string, chunkSize: number) {
  // 简单策略：按字符数等分
  // 改进方案：按段落/章节边界分块（未来优化）
  const leftChunks = splitBySize(leftText, chunkSize)
  const rightChunks = splitBySize(rightText, chunkSize)
  
  // 确保块数一致，取较大值
  const maxChunks = Math.max(leftChunks.length, rightChunks.length)
  
  return Array.from({ length: maxChunks }, (_, i) => ({
    leftText: leftChunks[i] || '',
    rightText: rightChunks[i] || '',
  }))
}
```

#### 错误处理

- 每个阶段使用独立的 try-catch
- 捕获错误后清理已写入的 DB 数据
- 将错误转换为 `ComparisonError` 类型向上抛出
- 调用方根据 `recoverable` 字段决定后续操作

---

### 3. 结果加载器 (`src/composables/useResultLoader.ts`)

#### 职责

从 IndexedDB 按需加载对比结果，支持分批读取和内存缓存管理。

#### 接口定义

```typescript
interface ResultLoader {
  loadTaskMeta(taskId: string): Promise<TaskMeta>
  loadStats(taskId: string): Promise<ComparisonStats>
  loadInitialSegments(taskId: string): Promise<LoadResult>
  loadMoreSegments(taskId: string, offset: number): Promise<LoadResult>
  releaseMemory(): void
}

interface LoadResult {
  segments: SimilarSegment[]
  hasMore: boolean
}
```

#### 常量

```typescript
const BATCH_SIZE = 50           // 每批加载 50 条
const MAX_CACHE_SIZE = 200      // 最多缓存 200 条
```

#### 缓存策略

```typescript
class ResultLoader {
  private segmentCache = new Map<string, SimilarSegment[]>()
  
  // LRU 缓存淘汰
  private setCache(key: string, value: SimilarSegment[]) {
    if (this.segmentCache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.segmentCache.keys().next().value
      this.segmentCache.delete(firstKey)
    }
    this.segmentCache.set(key, value)
  }
  
  // 组件卸载时释放
  releaseMemory() {
    this.segmentCache.clear()
  }
}
```

---

### 4. 进度条组件 (`src/components/file-compare/ComparisonProgress.vue`)

#### Props

```typescript
interface ProgressProps {
  progress: number        // 0-100
  stageText: string       // 阶段描述，如 "正在对比内容"
  detailText: string      // 补充描述，如 "(3/12)"
}
```

#### 事件

```typescript
emits: ['cancel']  // 用户点击取消按钮
```

#### 布局

```
┌─────────────────────────────────────┐
│  半透明遮罩（覆盖整个页面）            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  对比进行中                     │  │
│  │                               │  │
│  │  正在对比内容 (3/12)...       │  │
│  │  ████████░░░░░░░░  35%        │  │
│  │                               │  │
│  │  [取消对比]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

#### 样式要点

- 固定定位，覆盖整个视口
- 居中卡片，白色背景，圆角阴影
- 进度条：蓝色渐变，过渡动画
- 取消按钮：幽灵样式，红色文字

---

### 5. FileCompare.vue 改动

#### 移除的逻辑

- `sessionStorage.setItem('compareResult', ...)`
- 直接调用 `compareTexts()`
- 手动计算 `totalWords`, `similarWords` 并存入 sessionStorage

#### 新增的逻辑

```typescript
const engine = useComparisonEngine()

const handleCompare = async () => {
  if (!leftFileInfo.value.file || !rightFileInfo.value.file) return
  
  isComparing.value = true
  progress.value = 0
  stageText.value = '正在解析文件...'
  
  try {
    const taskId = await engine.startComparison(
      leftFileInfo.value.file,
      rightFileInfo.value.file,
      (p) => {
        progress.value = p.progress
        stageText.value = p.message
      }
    )
    
    router.push(`/file-compare-result?task=${taskId}`)
  } catch (error: ComparisonError) {
    showError(error.message)
    if (!error.recoverable) {
      console.error('不可恢复的错误:', error)
    }
  } finally {
    isComparing.value = false
  }
}

const handleCancelComparison = () => {
  if (currentTaskId.value) {
    engine.cancelComparison(currentTaskId.value)
  }
  isComparing.value = false
}
```

#### 模板新增

```vue
<template>
  <div class="file-compare-home">
    <!-- 原有内容不变 -->
    
    <!-- 进度覆盖层 -->
    <Teleport to="body">
      <ComparisonProgress
        v-if="isComparing"
        :progress="progress"
        :stage-text="stageText"
        @cancel="handleCancelComparison"
      />
    </Teleport>
  </div>
</template>
```

---

### 6. FileCompareResult.vue 改动

#### 移除的逻辑

- `sessionStorage.getItem('compareResult')`
- `currentPage`, `pageSize`, `paginatedSegments`, `totalPages`
- 原有分页控件（页码按钮、上一页/下一页）

#### 新增的逻辑

```typescript
const route = useRoute()
const loader = useResultLoader()

const taskMeta = ref<TaskMeta | null>(null)
const stats = ref<ComparisonStats | null>(null)
const segments = ref<SimilarSegment[]>([])
const hasMore = ref(false)
const isLoading = ref(false)

onMounted(async () => {
  const taskId = route.query.task as string
  if (!taskId) {
    router.push('/file-compare')
    return
  }
  
  try {
    taskMeta.value = await loader.loadTaskMeta(taskId)
    stats.value = await loader.loadStats(taskId)
    const result = await loader.loadInitialSegments(taskId)
    segments.value = result.segments
    hasMore.value = result.hasMore
  } catch (error: ComparisonError) {
    if (error.type === 'TASK_NOT_FOUND') {
      router.push('/file-compare')
    }
    // 其他错误展示错误提示
  }
})

const loadMore = async () => {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  try {
    const result = await loader.loadMoreSegments(taskId, segments.value.length)
    segments.value.push(...result.segments)
    hasMore.value = result.hasMore
  } catch (error) {
    console.error('加载更多失败:', error)
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  loader.releaseMemory()
})
```

#### 模板改动

```vue
<template>
  <div class="compare-result-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-section">
        <h1 class="page-title">文件对比</h1>
        <p class="page-subtitle">
          {{ taskMeta?.leftFileName }} vs {{ taskMeta?.rightFileName }}
        </p>
      </div>
      <button class="btn-export" @click="handleExport">
        <RiFileExcelLine class="btn-icon" />
        <span>一键导出对比分析报告</span>
      </button>
    </div>

    <!-- 对比列表 -->
    <div class="comparison-list-section">
      <!-- 表头不变 -->
      <div class="table-header">...</div>
      
      <!-- 表体 -->
      <div class="table-body">
        <div v-for="(item, index) in segments" :key="item.id" class="table-row">
          <!-- 行内容不变 -->
        </div>
        
        <!-- 加载更多按钮 -->
        <div v-if="hasMore" class="load-more-wrapper">
          <button class="btn-load-more" @click="loadMore" :disabled="isLoading">
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
        
        <div v-if="segments.length === 0 && !isLoading" class="empty-state">
          暂无对比数据
        </div>
      </div>
    </div>

    <!-- 底部统计面板（使用 stats 中的数据） -->
    <div class="stats-grid">...</div>
  </div>
</template>
```

---

### 7. SegmentList.vue 兼容处理

如果结果页直接使用 SegmentList 组件，确保它：

- 接收 `segments` 数组作为 prop（由父组件控制数据来源）
- 不包含自己的分页逻辑（由父组件管理）
- 高亮样式保持不变

---

## 错误处理

### 错误类型定义

```typescript
const ERROR_MESSAGES: Record<ComparisonErrorType, string> = {
  FILE_PARSE_ERROR: '文件解析失败，可能是文件已损坏或格式不支持',
  FILE_TOO_LARGE: '文件超过 50MB 限制，请选择更小的文件',
  UNSUPPORTED_FORMAT: '不支持的文件格式，请选择 .docx/.pdf/.txt',
  WORKER_TIMEOUT: '对比超时，文件可能过大，请稍后重试',
  WORKER_CRASH: '对比进程异常，请刷新页面后重试',
  DB_WRITE_ERROR: '保存结果失败，请检查浏览器存储空间',
  DB_READ_ERROR: '读取结果失败，数据可能已损坏',
  TASK_NOT_FOUND: '找不到对比任务，可能已被清除',
  CANCELLED: '对比已取消',
  UNKNOWN: '发生未知错误，请重试'
}
```

### 关键错误处理场景

| 场景 | 处理 |
|------|------|
| 文件上传时格式不支持 | 上传阶段拦截，展示错误提示 |
| 文件超过 50MB | 上传阶段拦截，展示错误提示 |
| 文件解析失败 | 对比阶段捕获，提示重新上传 |
| Worker 超时 | 对比阶段捕获，提示重试 |
| 用户取消对比 | 清理半成品数据，无错误提示 |
| IndexedDB 写入失败 | 对比阶段捕获，提示清理浏览器存储 |
| 结果页 taskId 不存在 | 跳转回首页 |
| IndexedDB 存储配额不足 | 提示清理旧任务 |
| 浏览器刷新/关闭 | 未完成的对比丢失，已完成的结果保留 |

---

## 内存管理

### 策略

1. **对比完成后释放原始文本** - `useComparisonEngine` 在对比完成后将 `leftResult.content` 和 `rightResult.content` 置为 `null`
2. **结果加载器 LRU 缓存** - 最多缓存 200 条片段，超出时淘汰最早的
3. **组件卸载时释放缓存** - `FileCompareResult.vue` 在 `onUnmounted` 时调用 `loader.releaseMemory()`
4. **避免全局状态累积** - 每次新对比生成独立 taskId，旧数据可被清理

### 内存估算

```
单个片段约 500 字符（含 HTML 标签）→ 约 1KB
200 条缓存片段 → 约 200KB
IndexedDB 中的数据不占用 JavaScript 堆内存
总内存占用 < 5MB（对比过程中）
```

---

## 大文件处理流程

```
用户上传 10万字 文件
    │
    ▼
FileCompare.vue 收集文件
    │
    ▼
useComparisonEngine.startComparison()
    │
    ├── 阶段1: parsing (0-20%)
    │     └── parseFile() 解析两个文件
    │
    ├── 阶段2: comparing (20-80%)
    │     └── 将文本分块（每块5000字 → 约20块）
    │     └── Worker 逐块对比，每块完成后：
    │           ├── 回报进度 (progress += 3%)
    │           └── 结果写入 IndexedDB segments store
    │
    ├── 阶段3: saving (80-100%)
    │     └── 计算统计信息，写入 tasks store
    │
    └── 返回 taskId
    │
    ▼
跳转 /file-compare-result?task=xxx
    │
    ▼
FileCompareResult.vue
    ├── loadTaskMeta() → 显示文件信息
    ├── loadStats() → 显示统计卡片
    └── loadInitialSegments(50条) → 渲染列表
    │
    ▼
用户滚动查看
    │
    ▼
点击"加载更多" → loadMoreSegments(50条) → 追加渲染
```

---

## 常量定义

```typescript
// 文件限制
const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50MB
const ALLOWED_EXTENSIONS = ['doc', 'docx', 'pdf', 'txt', 'ppt', 'pptx', 'xls', 'xlsx']

// 对比分块
const CHUNK_SIZE = 5000                  // 每块约 5000 字

// 结果加载
const BATCH_SIZE = 50                    // 每批加载 50 条
const MAX_CACHE_SIZE = 200               // 最多缓存 200 条

// Worker 超时
const WORKER_TIMEOUT_MS = 180_000        // 180秒（大文件）
```

---

## 现有兼容性

- `useComparisonBackend.ts` 中的 `compareTexts()` 函数保持不变
- 新引擎内部可调用它，增加分块和进度回报逻辑
- `SegmentList.vue` 组件保持现有结构，仅数据来源改为 props
- 路由配置不变，仅结果页 URL 增加 query 参数

---

## 未来优化空间

1. 按段落/章节边界分块（替代简单的字符数等分）
2. Web Worker 内直接写入 IndexedDB（避免主线程传递大数据）
3. 虚拟滚动替代"加载更多"（无缝滚动体验）
4. 多文件对比支持
5. 对比历史列表页
