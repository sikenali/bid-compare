# 文比猩 — 专业文档对比工具

<p align="center">
  <strong>🎯 精准识别文档差异 · 🤖 AI 智能分析 · 📦 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文比猩 Logo">
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

## 项目介绍

**文比猩**是一款专业的文档对比桌面工具，专为招投标文件、合同审阅、版本文档差异检测等场景设计。基于 Vue 3 + TypeScript + Electron 构建，支持多种文档格式的精准对比分析，并集成 AI 大模型辅助差异解读。

### 核心功能

| 功能 | 说明 |
|------|------|
| **文件对比** | 精准识别两个版本文档之间的内容差异、相似片段和结构变更 |
| **属性检查** | 13 项文档元数据字段全面比对，三级状态一目了然 |
| **图像对比** | dHash 感知哈希算法，精准计算图片相似度 |
| **批量对比** | 3-10 文件全两两比较，相似度矩阵可视化 |
| **AI 分析** | 集成 DeepSeek / 通义千问 / OpenAI，一键生成差异分析报告 |
| **OCR 识别** | Tesseract.js 浏览器端 OCR，识别图片中的文字内容 |

---

## 代码架构

```
bid-assistant/
├── electron-main.js               # Electron 主进程 (窗口管理 + IPC)
├── preload.cjs                    # 预加载脚本 (contextBridge)
├── package.json                   # 项目配置、依赖、electron-builder
├── vite.config.ts                 # Vite 构建配置 (base: './')
├── index.html                     # HTML 入口
│
├── src/
│   ├── main.ts                    # Vue 应用引导 (router + plugins + directives)
│   ├── App.vue                    # 根组件 (国潮风格侧边栏导航)
│   │
│   ├── router/
│   │   └── index.js               # 8 路由配置 (createWebHashHistory)
│   │
│   ├── components/                # 12 功能组件
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
│   ├── composables/               # 6 组合式函数
│   │   ├── useFileParser.ts        # 文档解析：mammoth/pdfjs-dist/xlsx/text
│   │   ├── useComparison.ts        # 对比调度：策略选择 + Worker/主线程 + 进度
│   │   ├── useSettings.ts          # 响应式设置单例 (localStorage 持久化)
│   │   ├── useRecentRecords.ts     # 类型化历史记录管理器
│   │   ├── useAIModel.ts           # AI 模型 API 调用 (DeepSeek/Qwen/OpenAI)
│   │   └── useHardwareInfo.ts       # IPC + Navigator 硬件信息获取
│   │
│   ├── utils/                     # 7 工具模块
│   │   ├── textAlgorithms.ts        # 核心：SimHash · LCS · Myers diff · 聚簇
│   │   ├── compareResultStore.ts   # Map 存储：ID 生成 · set/get · 大小限制
│   │   ├── sanitize.ts             # DOMPurify 安全过滤 + highlight 属性
│   │   ├── ocr.ts                 # Tesseract.js 封装 (chi_sim+eng, 进度)
│   │   ├── imageCompare.ts         # dHash 算法 (8×8 → 汉明距离 → 相似度%)
│   │   ├── watermark.ts            # 45+ 中英文文档水印正则匹配
│   │   └── extractImages.ts        # DOCX(word/media/) / PDF 图片提取
│   │
│   ├── workers/
│   │   └── comparison.worker.ts    # Web Worker: 大文件对比卸载
│   │
│   ├── directives/
│   │   └── highlightTooltip.ts     # v-highlight-tooltip 自定义指令
│   │
│   ├── plugins/
│   │   └── icons.js               # RemixIcon 全局注册
│   │
│   ├── types/
│   │   └── electron.d.ts           # window.electronAPI 类型声明
│   │
│   └── assets/
│       └── styles/
│           └── variables.css       # CSS 自定义属性 (国潮配色)
│
├── public/
│   └── logo-icon.svg               # 应用 logo 源文件
│
├── docs/                           # 示例文档
└── release/                        # 打包输出 (构建后生成)
```

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

---

## 实现原理

### 三阶智能对比算法

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

#### 算法详解

| 算法 | 原理 | 用途 |
|------|------|------|
| **SimHash** | 64-bit FNV-1a 指纹，滑动窗口 N-gram 分词 | 快速筛查相似文档，O(1) 比较 |
| **LCS** | 最长公共子序列动态规划 | 中等精度定位相似片段 |
| **Myers Diff** | 最优差异计算算法 | 精确到字符级别的增删改标注 |
| **dHash** | 8×8 灰度缩放 + 64-bit 差异哈希 | 图片感知哈希，汉明距离计算相似度 |

#### 水印移除

45+ 正则表达式匹配中英文常见文档水印，包括：
- 保密标识（内部资料、机密、秘密、绝密）
- 版权声明（未经授权不得转载、版权所有）
- 版本标记（草稿、修订版、版本号 Vx.x）
- 英文水印（CONFIDENTIAL、PROPRIETARY、DO NOT COPY）

### 文档解析

| 格式 | 解析库 | 原理 |
|------|--------|------|
| **.docx** | mammoth + JSZip | 解压 ZIP 包，提取 word/text.xml 文本内容 |
| **.pdf** | pdfjs-dist | 渲染页面提取文本，支持图片提取（页面渲染） |
| **.xlsx** | xlsx | 解析工作表单元格数据 |
| **.txt** | 原生读取 | 直接读取纯文本 |
| **图片** | Tesseract.js | 浏览器端 OCR 文字识别（chi_sim+eng） |

### 状态管理

- **Composables 模式**：Vue 3 组合式函数替代 Vuex/Pinia，每个功能模块独立管理状态
- **localStorage 持久化**：设置项、历史记录自动保存到浏览器本地存储
- **Map 存储对比结果**：`compareResultStore` 使用 Map 结构管理对比结果，自动 ID 生成和大小限制

### Web Worker 多线程

大文件（>100K 字符）对比自动卸载到 `comparison.worker.ts` Worker 线程，避免阻塞 UI 主线程，确保界面流畅响应。

### 设备指纹

基于 CPU/主板/MAC/磁盘序列号 SHA-256 哈希生成唯一设备标识，用于文档溯源和设备识别。

---

## 声明

1. **使用目的**：本工具旨在辅助文档的内容对比与分析，不保证识别结果完全满足任何特定行业或机构的标准要求。用户应自行核对最终结论的准确性。

2. **字体授权**：本工具不包含任何字体文件的嵌入或分发。文档渲染依赖用户系统中已安装的字体。使用的 Google Fonts 网络字体（Source Han Sans SC / Noto Serif SC / Ma Shan Zheng）遵循其各自的 SIL Open Font License。

3. **文档安全**：所有用户文档处理均在浏览器本地完成，不上传至任何服务器。对比引擎和导出功能均为纯前端实现，用户文件数据不离开本地设备。AI 分析功能仅在用户主动点击「AI 分析」时，将对比结果摘要发送至用户配置的 API 端点。

4. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证，包括但不限于适销性、特定用途适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对因使用本工具而产生的任何索赔、损害或其他责任负责。

5. **开源许可**：本项目基于 MIT 许可证开源，详情见 [LICENSE](./LICENSE) 文件。

---

## License

[MIT](./LICENSE)
