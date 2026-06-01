# 📄 文件对对碰 — 专业文档对比工具

<p align="center">
  <strong>🎯 精准识别文档差异 · 🤖 AI 智能分析 · 📦 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文件对对碰 Logo">
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-41.2.0-47848F?logo=electron&logoColor=white">
  <img alt="Vue" src="https://img.shields.io/badge/Vue_3-3.5.24-4FC08D?logo=vue.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Win%20|%20Mac%20|%20Linux-lightgrey">
</p>

---

## 📖 工具介绍

**文件对对碰**（File Comparison Assistant）是一款专业的文档对比桌面工具，专为招投标文件、合同审阅、版本文档差异检测等场景设计。基于 Vue 3 + TypeScript + Electron 构建，支持多种文档格式的精准对比分析，并集成 AI 大模型辅助差异解读。

### 🌟 核心优势

| 优势 | 说明 |
|------|------|
| **🔍 三阶智能对比** | SimHash 快速筛查 → LCS 中等精度 → Myers 精确差异，层层递进 |
| **📊 属性检查** | 13 项文档元数据字段全面比对，三级状态一目了然 |
| **🖼️ 图像对比** | dHash 感知哈希算法，精准计算图片相似度 |
| **📁 批量对比** | 3-10 文件全两两比较，相似度矩阵可视化 |
| **🤖 AI 分析** | 集成 DeepSeek / 通义千问 / OpenAI，一键生成差异分析报告 |
| **🔎 OCR 识别** | Tesseract.js 浏览器端 OCR，识别图片中的文字内容 |
| **🎨 国潮古风 UI** | 中国传统美学配色（#F8F4E9 底），边框流光动效，沉浸式体验 |
| **📦 跨平台桌面** | Electron 41 驱动，Windows / macOS / Linux 原生安装包 |
| **🔒 隐私安全** | 所有数据本地存储，仅本浏览器可访问，不上传服务器 |
| **📱 响应式设计** | 完美适配桌面端与移动端，触摸操作友好 |

---

## ✨ 功能全景

### 1️⃣ 文件对比 (File Compare)

核心功能：精准识别两个版本文档之间的内容差异、相似片段和结构变更。

| 功能项 | 说明 |
|--------|------|
| **多格式支持** | Word (.docx)、PDF (.pdf)、Excel (.xlsx)、PowerPoint (.pptx)、纯文本 (.txt) |
| **三阶对比算法** | SimHash（64-bit FNV-1a 指纹）→ LCS（最长公共子序列）→ Myers 差异算法 |
| **高亮渲染** | 相同内容金色高亮标注 + 悬浮 tooltip 展示完整原文，差异用双色区分 |
| **全文预览** | 预览界面显示完整文档内容，高亮标记重复片段 |
| **相似度统计** | 实时计算整体重复率、相似片段数量、平均相似度 |
| **分页结果** | 大文档结果自动分页，每页 10 个片段，支持逐页浏览 |
| **上下文查看** | 点击相似片段弹出上下文 Modal，展示匹配段落周围内容 |
| **AI 差异分析** | 一键调用大模型，生成差异分析报告、风险建议 |
| **结果导出** | 导出 Word (.docx) 或 Markdown (.md) 格式对比报告，相同内容高亮显示 |
| **历史记录** | localStorage 持久化最近 10 条记录，仅本浏览器可访问，支持删除和重新查看 |
| **Web Worker** | 大文件（>100K 字符）自动启用 Worker 线程，避免阻塞 UI |
| **水印移除** | 45+ 正则匹配中英文常见文档水印（内部资料、机密、免责声明等） |
| **去重预处理** | 移除两文件中完全相同的公共段落，降低噪音 |

#### 使用流程

```
上传左/右文件 → 配置对比参数 → 点击「一键对比」
  → 三阶算法自动执行 → 查看高亮差异结果
  → AI 分析（可选） → 导出报告
```

#### 对比参数设置（13+ 项）

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| N-gram 大小 | 3 | SimHash 滑动窗口的 N-gram 长度 |
| 最小重复字数 | 8 | 判定为雷同的最小连续字符数 |
| 文本相似度阈值 | 75% | 标记为高相似度的最低百分比 |
| 图像相似度阈值 | 70% | 标记为高相似度图片的最低百分比 |
| 最大结果数 | 100 | 返回的最大相似片段数量 |
| 忽略大小写 | ✅ | 对比时忽略英文字母大小写 |
| 忽略标点符号 | ❌ | 对比时忽略中文/英文标点符号 |
| 忽略空白字符 | ✅ | 对比时忽略空格/制表符/换行 |
| 忽略不可见字符 | ✅ | 对比时忽略零宽字符等不可见字符 |
| 启用子句移除 | ✅ | 移除两文件相同的公共段落 |
| 启用水印移除 | ✅ | 自动过滤文档水印文字 |
| 启用图片对比 | ❌ | 从文档中提取图片进行 dHash 对比 |
| 启用 OCR | ❌ | 对文档中的图片进行 OCR 文字识别 |

---

### 2️⃣ 属性检查 (Property Check)

对比两个文档的 13 项元数据属性，快速识别文件来源和版本差异。

| 功能项 | 说明 |
|--------|------|
| **属性解析** | 自动提取 Office 文档 ZIP 包中的元数据 |
| **三级标注** | ✅ 匹配 / ❌ 不匹配 / ⚠️ 警告（字段缺失） |
| **实时统计** | 显示匹配、不匹配、警告属性数量 |
| **筛选查看** | 可按状态（匹配/不匹配/警告）筛选属性列表 |
| **结果导出** | 导出 Word 格式的属性对比报告 |

#### 检查属性清单

| 属性字段 | 说明 |
|----------|------|
| 文件名称 | 文档文件名 |
| 文件大小 | 文件体积对比（字节） |
| 文件类型 | 文档格式 MIME 类型 |
| 作者 | 文档创建作者 |
| 最后一次保存者 | 最后编辑人员 |
| 修订号 | 文档修订版本号 |
| 版本号 | 创作应用程序版本号 |
| 程序名称 | 创建/编辑该文档的应用程序 |
| 公司 | 所属公司/组织信息 |
| 创建时间 | 文档首次创建时间戳 |
| 修改时间 | 文档最后修改时间戳 |
| 文本内容长度 | 文档正文纯文本字数 |
| 页码范围 | 文档总页数（PDF/Word 页面数） |

---

### 3️⃣ 图像对比 (Image Compare)

对两张图片进行感知哈希比对，输出相似度百分比。

| 功能项 | 说明 |
|--------|------|
| **dHash 算法** | 差异哈希（Difference Hash），8×8 灰度缩放 + 64-bit 指纹 |
| **相似度计算** | 基于汉明距离的百分比相似度 |
| **同屏对比** | 双图并排展示，指示标注哪张图 |
| **OCR 扩展** | 可对识别到的图片文字进行提取（需开启 OCR 设置） |
| **格式支持** | JPG, PNG, JPEG, GIF, WEBP, BMP |
| **文档嵌入图** | 支持从 DOCX（word/media/）和 PDF（页面渲染）提取图片进行对比 |

---

### 4️⃣ 批量对比 (Batch Compare)

对 3–10 个文件进行全两两配对对比，生成相似度矩阵。

| 功能项 | 说明 |
|--------|------|
| **多文件上传** | 3–10 文件拖拽上传，文件类型图标标识，格式提示悬浮显示 |
| **全两两对比** | 自动对所有文件配对执行文本对比 |
| **相似度矩阵** | 颜色编码矩阵可视化（绿 → 黄 → 红 渐变），显示相似度和重复数量 |
| **点击跳转** | 点击矩阵单元格自动跳转到对应表格位置 |
| **批量导出** | 导出批量对比结果报告，相同内容高亮显示 |

---

### 5️⃣ 硬件信息 (Hardware Info)

查看当前设备的系统和硬件信息，辅助技术支持诊断。

| 信息类别 | 包含内容 |
|----------|----------|
| **操作系统** | 用户名、主机名、系统版本、CPU 型号、总内存、系统运行时间 |
| **网络信息** | IPv4 地址、MAC 地址、子网掩码、默认网关 |
| **设备指纹** | 基于 CPU/主板/MAC/磁盘序列号 SHA-256 哈希生成的唯一设备标识 |

> 桌面端（Electron）通过 IPC `get-hardware-info` 使用 Node.js `os` / `systeminformation` / `crypto` 模块获取；浏览器端通过 Navigator API 获取（信息有限）。

---

### 6️⃣ 系统设置 (System Settings)

五标签页配置面板，所有设置自动持久化到 localStorage。

| 标签页 | 包含设置 |
|--------|---------|
| **对比算法** | N-gram 大小、最小查重字数、文本/图像相似度阈值、最大结果数 |
| **文本设置** | 忽略规则（大小写/标点/空格/不可见字符） |
| **参数设置** | 相同条款剔除、水印移除、图片对比、OCR 识别、多文件对比、最大文件数 |
| **导出设置** | 默认导出格式、包含高亮样式、包含统计图表 |
| **模型设置** | AI 模型选择（DeepSeek / 通义千问 / OpenAI）、API Key、API Endpoint |

---

## 🤖 AI 智能分析

支持配置第三方大模型 API，对文档差异进行智能分析。

| 模型 | 供应商 | 配置方式 |
|------|--------|----------|
| **DeepSeek** | deepseek.com | 设置 API Key + Endpoint |
| **通义千问 (Qwen)** | Alibaba Cloud | 设置 API Key + Endpoint |
| **OpenAI** | OpenAI | 设置 API Key + Endpoint |

AI 分析引擎会自动将对比结果结构化为 JSON，发送给模型生成专业的差异分析报告，包含差异摘要、风险点标注、修改建议等。

---

## 🔧 OCR 文字识别

基于 **Tesseract.js** 的浏览器端 OCR 引擎，无需外部服务。

| 配置项 | 默认值 |
|--------|--------|
| 识别语言 | chi_sim+eng（中文简体 + 英文） |
| 识别对象 | 文档中嵌入的图片（DOCX/PDF） |
| 触发方式 | 对比设置中启用「图片 OCR」开关 |
| 结果利用 | OCR 文字参与文本对比分析 |

---

## 🛠️ 技术架构

### 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **桌面框架** | Electron | 41.2.0 | 跨平台桌面应用运行时，IPC 通信 |
| **前端框架** | Vue 3 | 3.5.24 | Composition API + `<script setup>` 组合式开发 |
| **开发语言** | TypeScript | 5.9.3 | 全栈类型安全 |
| **构建工具** | Vite | 7.2.4 | 极速 HMR、按需编译、相对路径输出 |
| **路由** | Vue Router 4 | 4.6.3 | Hash 历史模式（兼容 file://） |
| **状态管理** | Vue Reactivity | 内置 | Composable 响应式状态管理 |
| **图标** | Remix Icon | 4.7.0 | @remixicon/vue 矢量图标 |
| **打包** | electron-builder | 26.8.1 | NSIS / DMG / AppImage 安装包生成 |

### 文档处理库

| 库 | 版本 | 用途 |
|----|------|------|
| **mammoth** | ^1.9.1 | .docx → HTML/文本 解析 |
| **pdfjs-dist** | ^4.9.155 | .pdf 文本提取 + 页面渲染 |
| **xlsx** | ^0.18.5 | .xlsx 工作表解析 |
| **docx** | ^9.2.0 | Word 对比报告生成（支持高亮） |
| **JSZip** | ^3.10.1 | Office ZIP 包底层处理 |

### 图像与 OCR

| 库 | 版本 | 用途 |
|----|------|------|
| **tesseract.js** | ^5.1.1 | 浏览器端 OCR 文字识别 |
| **sharp** | ^0.33.5 | 开发时图标生成（PNG/ICO） |

### 其他关键依赖

| 库 | 版本 | 用途 |
|----|------|------|
| **markdown-it** | ^14.1.0 | Markdown 渲染 / 导出 |
| **DOMPurify** | ^3.2.4 | HTML XSS 过滤（高亮内容展示） |
| **vue3-border-beam** | ^1.2.0 | 国潮边框流光动效装饰 |

### 架构层次

```
┌──────────────────────────────────────────────────────────────────┐
│                    Electron 主进程 (electron-main.js)             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  窗口管理 (1600×950, 最小 1200×800)                        │  │
│  │  IPC 通道: get-app-version, get-platform, get-hardware-info│  │
│  │  Node.js: os, systeminformation, crypto, networkInterfaces │  │
│  │  预加载: preload.cjs (contextBridge → window.electronAPI)  │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                     渲染进程 — Vue 3 应用                         │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  App.vue     │ │  Router      │ │ Plugins  │ │ Directives  │ │
│  │  国潮侧边栏  │ │  8 routes    │ │  icons   │ │ highlight-  │ │
│  │  7 菜单项    │ │  hash 模式   │ │ RemixIcon│ │ tooltip     │ │
│  └──────────────┘ └──────────────┘ └──────────┘ └─────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   12 功能组件                                │  │
│  │  FileCompare · FileCompareResult · FileUpload              │  │
│  │  PropertyCheck · PropertyCheckResult · ImageCompare        │  │
│  │  BatchCompare · MultiFileUpload · MultiCompareResult       │  │
│  │  HardwareInfo · SystemSettings · RecentRecords             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │             6 Composables (组合式函数层)                      │  │
│  │  useFileParser · useSettings · useAIModel                  │  │
│  │  useComparison · useRecentRecords · useHardwareInfo        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │             7 Utils (工具层)                                 │  │
│  │  textAlgorithms  (SimHash · LCS · Myers diff)              │  │
│  │  compareResultStore (Map 存储 · 自动 ID)                    │  │
│  │  sanitize  (DOMPurify · 高亮属性注入)                       │  │
│  │  ocr  (Tesseract.js 封装)                                  │  │
│  │  imageCompare  (dHash 8×8 · 汉明距离)                       │  │
│  │  watermark  (45+ 中英文正则)                                │  │
│  │  extractImages  (DOCX/PDF 图片提取)                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Web Worker: comparison.worker.ts                          │  │
│  │  → 大文件(>100K)对比卸载到 Worker 线程                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 数据流

```
文件上传 → useFileParser 格式识别
  → mammoth/pdfjs-dist/xlsx 文本提取
  → 预处理：水印移除(watermark.ts) · 子句去重 · 忽略规则
  → 文本较短？→ 主线程执行
  → 文本 > 100K？→ Web Worker 执行
  → 三阶算法(textAlgorithms.ts)：
        1. SimHash 64-bit FNV-1a (滑动窗口 N-gram)
        2. LCS 最长公共子序列 (中等精度)
        3. Myers 差异算法 (精确 diff)
  → 相似片段查找 + 索引映射
  → compareResultStore 存储 (Map<id, result>)
  → 页面渲染：高亮内容 (DOMPurify 安全过滤) + tooltip 悬浮
  → 预览界面：全文展示 + 重复片段高亮
  → AI 分析 (useAIModel → DeepSeek/Qwen/OpenAI)
  → 导出 (docx 库生成 Word / markdown-it 生成 Markdown)
```

### 路由表

| 路径 | 组件 | 标题 |
|------|------|------|
| `/` | → 重定向至 `/file-compare` | 文件对比 |
| `/file-compare` | `\FileCompare\` | 文件对比 |
| `/file-compare-result` | `\FileCompareResult\` | 对比结果 |
| `/property-check` | `\PropertyCheck\` | 属性检查 |
| `/property-check-result` | `\PropertyCheckResult\` | 属性检查结果 |
| `/image-compare` | `\ImageCompare\` | 图片对比 |
| `/batch-compare` | `\BatchCompare\` | 批量对比 |
| `/hardware-info` | `\HardwareInfo\` | 硬件信息 |
| `/settings` | `\SystemSettings\` | 系统设置 |

---

## 📁 项目结构

```
bid-assistant/
├── electron-main.js               # Electron 主进程 (窗口管理 + IPC)
├── preload.cjs                    # 预加载脚本 (contextBridge)
├── package.json                   # 项目配置、依赖、electron-builder
├── vite.config.ts                 # Vite 构建配置 (base: './')
├── tsconfig.json / tsconfig.node.json / tsconfig.app.json
├── index.html                     # HTML 入口
│
├── 📁 src/
│   ├── main.ts                    # Vue 应用引导 (router + plugins + directives)
│   ├── App.vue                    # 根组件 (国潮风格侧边栏导航)
│   │
│   ├── 📁 router/
│   │   └── index.js               # 8 路由配置 (createWebHashHistory)
│   │
│   ├── 📁 components/              # 12 功能组件
│   │   ├── FileCompare.vue         # 核心：双文件对比
│   │   ├── FileCompareResult.vue   # 对比结果：分页 + 全文预览 + AI + 导出
│   │   ├── FileUpload.vue          # 可复用拖拽上传 (文件类型图标)
│   │   ├── PropertyCheck.vue       # 13 字段元数据属性检查
│   │   ├── PropertyCheckResult.vue # 属性结果 (三级筛选 + Word 导出)
│   │   ├── ImageCompare.vue        # 双图 dHash 感知哈希对比
│   │   ├── BatchCompare.vue        # 3-10 文件批量对比
│   │   ├── MultiFileUpload.vue     # 可复用多文件拖拽上传
│   │   ├── MultiCompareResult.vue  # 批量结果 (矩阵 + 导出)
│   │   ├── HardwareInfo.vue        # 三标签硬件信息 (OS/网络/指纹)
│   │   ├── SystemSettings.vue      # 五标签设置面板
│   │   └── RecentRecords.vue       # 可复用历史记录 (类型隔离, 10 条上限)
│   │
│   ├── 📁 composables/             # 6 组合式函数
│   │   ├── useFileParser.ts        # 文档解析：mammoth/pdfjs-dist/xlsx/text
│   │   ├── useComparison.ts        # 对比调度：策略选择 + Worker/主线程 + 进度
│   │   ├── useSettings.ts          # 响应式设置单例 (localStorage 持久化)
│   │   ├── useRecentRecords.ts     # 类型化历史记录管理器
│   │   ├── useAIModel.ts           # AI 模型 API 调用 (DeepSeek/Qwen/OpenAI)
│   │   └── useHardwareInfo.ts       # IPC + Navigator 硬件信息获取
│   │
│   ├── 📁 utils/                   # 7 工具模块
│   │   ├── textAlgorithms.ts        # 核心：SimHash · LCS · Myers diff · 聚簇
│   │   ├── compareResultStore.ts   # Map 存储：ID 生成 · set/get · 大小限制
│   │   ├── sanitize.ts             # DOMPurify 安全过滤 + highlight 属性
│   │   ├── ocr.ts                 # Tesseract.js 封装 (chi_sim+eng, 进度)
│   │   ├── imageCompare.ts         # dHash 算法 (8×8 → 汉明距离 → 相似度%)
│   │   ├── watermark.ts            # 45+ 中英文文档水印正则匹配
│   │   └── extractImages.ts        # DOCX(word/media/) / PDF 图片提取
│   │
│   ├── 📁 workers/
│   │   └── comparison.worker.ts    # Web Worker: 大文件对比卸载
│   │
│   ├── 📁 directives/
│   │   └── highlightTooltip.ts     # v-highlight-tooltip 自定义指令
│   │
│   ├── 📁 plugins/
│   │   └── icons.js               # RemixIcon 全局注册
│   │
│   ├── 📁 types/
│   │   └── electron.d.ts           # window.electronAPI 类型声明
│   │
│   └── 📁 assets/
│       └── styles/
│           └── variables.css       # CSS 自定义属性 (国潮配色 #F8F4E9)
│
├── 📁 public/
│   └── logo-icon.svg               # 应用 logo 源文件 (国潮风格)
│
├── 📁 scripts/
│   └── generate-icon.js            # SVG → PNG / ICO (sharp)
│
├── 📁 docs/                        # 示例文档
│   ├── 1.docx / 2.docx            # Word 对比样例
│   ├── document1.pdf / document2.pdf
│   └── superpowers/               # 技术规格/计划文档
│
└── 📁 release/                     # 打包输出 (构建后生成)
    ├── win-unpacked/
    ├── 文件对对碰 Setup *.exe
    ├── 文件对对碰-*.dmg
    └── 文件对对碰-*.AppImage
```

---

## 🚀 快速开始

### 环境要求

| 项目 | 最低要求 |
|------|----------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| 操作系统 | Windows 10/11, macOS 10.15+, Ubuntu 20.04+ |

### 开发模式

```bash
# 1. 安装依赖
npm install

# 2a. Web 开发模式 (浏览器访问 http://localhost:5173)
npm run dev

# 2b. Electron 桌面模式 (推荐，支持 HMR)
npm run electron:dev
```

### 生产构建

```bash
# 构建前端静态文件 → dist/
npm run build

# 预览生产版本
npm run preview
```

### 桌面应用打包

```bash
# Windows (NSIS 安装包)
npm run electron:build:win
# 输出: release/文件对对碰 Setup *.exe

# macOS (DMG)
npm run electron:build:mac
# 输出: release/文件对对碰-*.dmg

# Linux (AppImage + deb)
npm run electron:build:linux
# 输出: release/文件对对碰-*.AppImage
```

### 图标生成

```bash
# 从 logo-icon.svg 生成 PNG + ICO (集成在打包流程中)
npm run generate-icon
```

---

## ⚙️ 打包配置

`package.json` 中 `build` 字段核心配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `appId` | `com.filecompare.app` | 应用唯一标识 |
| `productName` | 文件对对碰 | 产品名称 |
| `directories.output` | `release` | 打包输出目录 |
| `win.target` | `nsis` | Windows 安装包格式 |
| `nsis.oneClick` | `false` | 非一键安装 |
| `nsis.perMachine` | `true` | 支持为所有用户安装 |
| `nsis.allowToChangeInstallationDirectory` | `true` | 允许自定义安装目录 |
| `nsis.deleteAppDataOnUninstall` | `true` | 卸载时清除数据 |
| `mac.target` | `dmg` | macOS 安装包格式 |
| `linux.target` | `AppImage`, `deb` | Linux 安装包格式 |

### Electron 主进程配置

| 配置项 | 值 |
|--------|-----|
| 默认窗口 | 1600 × 950 |
| 最小窗口 | 1200 × 800 |
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `autoHideMenuBar` | `true` |
| `frame` | `true` |
| `backgroundColor` | `#F8F4E9` |
| `show` | `false` (准备就绪后显示) |

---

## ❓ 常见问题

### Q: 打包后应用白屏/空白？

**A:** 确保 `vite.config.ts` 中 `base` 设置为 `'./'`，并使用 `createWebHashHistory()`。Electron 生产环境使用 `file://` 协议加载文件，需要相对路径和 Hash 路由。

### Q: 图标未显示，显示默认 Electron 图标？

**A:** 图标在 `vite build` 后生成。直接运行 `npm run generate-icon` 或在打包命令前确保 `scripts.generate-icon` 已在 `electron:build` 前置钩子中执行。

### Q: 支持哪些文件格式？

**A:** Word (.docx)、PDF (.pdf)、Excel (.xlsx)、PowerPoint (.pptx)、纯文本 (.txt)、图片 (JPG/PNG/JPEG/GIF/WEBP/BMP)。

### Q: 如何配置 AI 分析？

**A:** 进入「系统设置 → 模型」标签页，选择模型（DeepSeek / 通义千问 / OpenAI），填写 API Key 和 API Endpoint 地址。

### Q: 数据存在哪里？隐私安全吗？

**A:** 所有数据完全本地化：对比结果存储在内存 Map 和 localStorage 中，**仅本浏览器可访问**，不上传任何文件内容到外部服务器。AI 分析功能仅在你主动点击「AI 分析」时才会将对比结果摘要发送到你配置的 API 端点。

### Q: OCR 识别效果不理想？

**A:** 确保对比设置中已开启「启用 OCR」。默认语言为 `chi_sim+eng`（中文简体 + 英文）。如需其他语言支持，可在 `src/utils/ocr.ts` 中调整 `language` 参数。

### Q: 历史记录如何保护隐私？

**A:** 历史记录使用浏览器 localStorage 存储，每个浏览器独立管理，切换浏览器或清除浏览器数据后记录会丢失或被清除。

---

## 📄 许可证

MIT License

---

<p align="center">
  <strong>文件对对碰</strong> · 让文档对比更简单、更精准<br>
  <sub>Built with Vue 3 + TypeScript + Electron</sub>
</p>
