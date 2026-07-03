# 文比猩 - 需求与设计文档

## 项目概述

**文比猩** 是一个文档比对与属性检查工具，通过取证级算法精确识别两个版本文档之间的内容差异、相似片段和结构变更。

### 技术栈

* **前端框架**: Vue 3 + TypeScript
* **路由**: Vue Router
* **构建工具**: Vite
* **样式**: Tailwind CSS + 自定义 CSS 变量
* **图标**: RemixIcon Vue
* **Worker**: Web Worker 用于大文件对比计算

***

## 功能模块

### 1. 文件对比模块

#### 1.1 文件对比首页 (`FileCompare.vue`)

**页面结构:**

* **页面标题区**: 标题"文档比对中心" + 副标题说明
* **文件上传区**: 双栏网格布局，分别上传"源文件"和"修订版文件"
* **功能说明区**: 三个特性介绍卡片 + 对比按钮

**核心功能:**

| 功能     | 说明                                                |
| ------ | ------------------------------------------------- |
| 文件上传   | 支持点击选择和拖拽上传两种方式                                   |
| 支持格式   | .doc, .docx, .pdf, .txt, .ppt, .pptx, .xls, .xlsx |
| 文件信息展示 | 显示文件名、文件类型图标、文件大小                                 |
| 拖拽上传   | 支持 dragover 和 drop 事件处理                           |
| 清除文件   | 已选文件可一键清除                                         |
| 对比执行   | 解析文件内容 → 调用对比算法 → 存储结果到 sessionStorage → 跳转结果页    |

**数据流:**

```
用户上传文件 → 点击"一键对比" → parseFile() 解析内容 
→ compareTexts() 执行对比 → 存储结果到 sessionStorage 
→ 路由跳转到 /file-compare-result
```

**存储数据结构:**

```typescript
{
  segments: Array<{
    id: number,
    leftContent: string,      // 源文件内容（含高亮 HTML）
    leftPage: string,         // 源文件位置（如"第1页"）
    rightContent: string,     // 修订版内容（含高亮 HTML）
    rightPage: string,        // 修订版位置
    similarity: number        // 相似度百分比
  }>,
  stats: {
    totalWords: number,       // 总字数
    similarWords: number,     // 相似字数
    similarityRate: number    // 整体重合率
  }
}
```

***

#### 1.2 文件对比结果页 (`FileCompareResult.vue`)

**页面结构:**

* **页面头部**: 标题"文件对比" + 副标题 + 导出报告按钮
* **对比列表区**: 表格形式展示相似片段
  * 表头：序号 | 源文件内容 | 源文件位置 | 修订版内容 | 修订版位置
  * 表体：分页展示，每页 10 条
  * 分页控件：上一页/页码/下一页
* **底部统计面板**: 两卡片布局
  * **对比概览卡片**: 总字数、相似字数、整体重合率（带进度条）
  * **重复项分布卡片**: 展示前 2 条相似片段预览 + "查看完整报告"按钮

**核心功能:**

| 功能   | 说明                      |
| ---- | ----------------------- |
| 数据加载 | 从 sessionStorage 读取对比结果 |
| 分页展示 | 每页 10 条，支持页码切换          |
| 高亮显示 | 相同字符以金色背景 + 深红色文字高亮     |
| 统计数据 | 展示总字数、相似字数、重合率进度条       |
| 导出功能 | 一键导出对比分析报告（待实现）         |
| 返回首页 | 无数据时自动跳转回文件对比首页         |

**高亮样式规范:**

```css
.highlighted-text {
  background-color: rgba(255, 215, 0, 0.6);
  color: #8B0000;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
}
```

***

### 2. 属性检查模块

#### 2.1 属性检查首页 (`PropertyCheck.vue`)

**页面结构:**

* **页面标题区**: 标题"属性检查" + 副标题 + 导出报告按钮 + 重新扫描按钮
* **文件上传区**: 双栏网格布局，分别上传"FILE A"和"FILE B"
* **操作按钮区**: "开始检查"按钮居中展示

**核心功能:**

| 功能     | 说明                           |
| ------ | ---------------------------- |
| 文件上传   | 支持点击选择和拖拽上传                  |
| 支持格式   | .doc, .docx, .pdf, .txt      |
| 文件大小提示 | 实时显示上传文件大小（MB）               |
| 属性检查   | 解析文件 → 对比文本相似度 → 生成属性对比数据    |
| 结果跳转   | 存储结果到 sessionStorage → 跳转结果页 |

**检查的属性项:**

如文件类型、大小、作者、最后一次保存者、修订号、版本号、程序名称（如wps、office）、公司等字段

**数据流:**

```
用户上传文件 → 点击"开始检查" → parseFile() 解析内容 
→ compareTexts() 计算相似度 → 生成属性对比数组 
→ 存储结果到 sessionStorage → 路由跳转到 /property-check-result
```

**存储数据结构:**

```typescript
{
  properties: Array<{
    name: string,           // 属性名称
    file1Value: string,     // 文件 A 的值
    file2Value: string,     // 文件 B 的值
    status: 'match' | 'mismatch'  // 匹配状态
  }>,
  stats: {
    matchCount: number,     // 匹配数量
    mismatchCount: number   // 不匹配数量
  }
}
```

***

#### 2.2 属性检查结果页 (`PropertyCheckResult.vue`)

**页面结构:**

* **页面头部**: 标题"属性检查结果" + 统计信息 + 返回按钮 + 导出报告按钮
* **统计卡片**: 两卡片展示匹配/不匹配属性数量
* **属性对比表格**:
  * 表头：属性字段 | 文件 1 | 状态图标 | 文件 2
  * 表体：逐行展示属性对比，不匹配行背景标红

**核心功能:**

| 功能   | 说明                        |
| ---- | ------------------------- |
| 数据加载 | 从 sessionStorage 读取属性检查结果 |
| 状态展示 | 匹配项显示绿色勾，不匹配项显示红色叉        |
| 高亮标记 | 不匹配的属性值以红色背景高亮            |
| 统计卡片 | 分别展示匹配和不匹配的属性数量           |
| 导出功能 | 一键导出报告（待实现）               |
| 返回首页 | 无数据时自动跳转回属性检查首页           |

***

### 3. 硬件属性模块

**硬件属性页** 展示系统硬件信息，如：设备信息、IP地址、MAC地址、指纹信息。

***

### 4. 系统设置模块

**系统设置页** 提供对比算法参数配置，具体功能待补充。

***

## 核心算法

### 文本对比算法 (`worker.js` / `useComparisonBackend.ts`)

#### 文本预处理

```typescript
// 标准化处理流程
1. 换行符统一（\r\n → \n）
2. Unicode 标准化（NFKC）
3. 移除零宽字符（\u200B-\u200D, \uFEFF）
4. 可选：忽略标点符号
5. 可选：忽略空白字符
6. 可选：忽略大小写
```

#### 相似度计算

```typescript
// 使用 Shingle 算法（n-gram）
1. 将文本分割为指定大小的 n-gram
2. 构建左右文本的 shingle 集合
3. 计算重叠数量
4. 相似度 = 重叠数 / min(左集合大小，右集合大小) * 100
```

#### 相似片段提取

```typescript
// 精确匹配算法
1. 滑动窗口扫描（窗口大小 = minDuplicateWords）
2. 构建右文本的 shingle 索引
3. 左文本逐位置查找匹配
4. 向两端扩展匹配范围
5. 过滤重叠匹配（重叠度 >= 60% 则跳过）
6. 按长度排序，取前 MAX_SEGMENTS 条
7. 为每条片段添加上下文（context = min(windowSize * 4, 48) 字符）
```

#### 高亮生成

```typescript
// trimWithContext 函数
1. 截取匹配位置 + 上下文
2. HTML 转义（&, <, >, "）
3. 正则转义匹配文本
4. 用 <span class="highlighted-text"> 替换匹配文本
5. 返回含高亮 HTML 的字符串
```

#### 性能优化

```typescript
// 大文件处理
- 文本长度限制：50 万字（标准化后）
- 采样策略：超过 10 万字时采用头尾采样
- Web Worker：异步计算，避免阻塞主线程
- 分段数量限制：最多 200 条片段
```

***

### 5. 硬件信息模块

* 操作系统硬件信息：如用户名、操作系统版本、硬件信息
* IP与MAC地址：分别显示IP 地址以及计算机MAC地址
* 指纹信息：显示指纹信息的字符串

## 设计规范

整体采取国潮书籍古风设计

## 路由配置

| 路径                       | 组件                      | 说明      |
| ------------------------ | ----------------------- | ------- |
| `/file-compare`          | FileCompare.vue         | 文件对比首页  |
| `/file-compare-result`   | FileCompareResult.vue   | 文件对比结果页 |
| `/property-check`        | PropertyCheck.vue       | 属性检查首页  |
| `/property-check-result` | PropertyCheckResult.vue | 属性检查结果页 |
| `/hardware-info`         | HardwareInfo.vue        | 硬件属性页   |
| `/settings`              | Settings.vue            | 系统设置页   |

***

## 数据流设计

```
用户上传文件
    ↓
FileCompare.vue / PropertyCheck.vue 收集文件
    ↓
useFileParser.parseFile() 解析文件内容
    ↓
useComparisonBackend.compareTexts() 执行对比
    ↓
Web Worker (worker.js) 异步计算
    ↓
返回对比结果（相似度 + 相似片段）
    ↓
存储到 sessionStorage
    ↓
路由跳转到结果页
    ↓
结果页从 sessionStorage 读取并展示
```

***

## 待完善功能

1. **导出报告**: 一键导出对比分析报告（Excel 格式）
2. **硬件属性页**: 完整功能实现
3. **系统设置页**: 算法参数配置界面
4. **AI 分析**: 接入 AI 模型进行智能分析
5. **更多文件格式**: 支持 PPT、Excel 等格式解析

***

## 项目结构

```
src/
├── components/
│   ├── FileCompare.vue           # 文件对比首页
│   ├── FileCompareResult.vue     # 文件对比结果页
│   ├── PropertyCheck.vue         # 属性检查首页
│   ├── PropertyCheckResult.vue   # 属性检查结果页
│   └── file-compare/
│       └── SegmentList.vue       # 相似片段列表组件
├── composables/
│   ├── useFileParser.ts          # 文件解析逻辑
│   ├── useComparisonBackend.ts   # 对比算法封装
│   └── useSettings.ts            # 设置管理
├── worker.js                     # Web Worker 对比实现
├── router/
│   └── index.js                  # 路由配置
└── assets/
    └── styles/
        └── main.css              # 全局样式
```

***


