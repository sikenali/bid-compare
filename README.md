# 文比猩 — 专业文档对比工具

<p align="center">
  <strong>🎯 精准识别文档差异 · 🤖 AI 智能分析 · 📦 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文比猩 Logo">
</p>

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue_3-3.5.24-4FC08D?logo=vue.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Deno" src="https://img.shields.io/badge/Deno-2.9-000000?logo=deno&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Win%20|%20Mac%20|%20Linux-lightgrey">
</p>

---

## 软件说明

**文比猩**是一款专业的文档对比工具，专为招投标文件、合同审阅、版本文档差异检测等场景设计。基于 Vue 3 + TypeScript + Vite 构建，支持多种文档格式的精准对比分析，并集成 AI 大模型辅助差异解读。

**核心功能**

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
├── desktop/
│   └── desktop.ts                    # Deno 桌面客户端入口 (WebView + HTTP 子进程)
├── deno.json                         # Deno 项目配置与 JSR 导入映射
├── package.json                      # Node.js 项目配置与 Vite 构建脚本
├── vite.config.ts                    # Vite 构建配置
├── index.html                        # HTML 入口
│
├── src/
│   ├── main.ts                       # Vue 应用引导 (router + plugins + directives)
│   ├── App.vue                       # 根组件 (国潮风格侧边栏导航)
│   │
│   ├── router/
│   │   └── index.js                  # 8 路由配置 (createWebHashHistory)
│   │
│   ├── components/                   # 12 功能组件
│   │   ├── FileCompare.vue            # 核心：双文件对比
│   │   ├── FileCompareResult.vue      # 对比结果：分页 + 全文预览 + AI + 导出
│   │   ├── FileUpload.vue             # 可复用拖拽上传 (文件类型图标)
│   │   ├── PropertyCheck.vue          # 13 字段元数据属性检查
│   │   ├── PropertyCheckResult.vue    # 属性结果 (三级筛选 + Word 导出)
│   │   ├── ImageCompare.vue           # 双图 dHash 感知哈希对比
│   │   ├── BatchCompare.vue           # 3-10 文件批量对比
│   │   ├── MultiFileUpload.vue        # 可复用多文件拖拽上传
│   │   ├── MultiCompareResult.vue     # 批量结果 (矩阵 + 导出)
│   │   ├── HardwareInfo.vue           # 三标签硬件信息 (OS/网络/指纹)
│   │   ├── SystemSettings.vue         # 五标签设置面板
│   │   └── RecentRecords.vue          # 可复用历史记录 (类型隔离, 10 条上限)
│   │
│   ├── composables/                  # 6 组合式函数
│   │   ├── useFileParser.ts           # 文档解析：mammoth/pdfjs-dist/xlsx/text
│   │   ├── useComparison.ts           # 对比调度：策略选择 + Worker/主线程 + 进度
│   │   ├── useSettings.ts             # 响应式设置单例 (localStorage 持久化)
│   │   ├── useRecentRecords.ts        # 类型化历史记录管理器
│   │   ├── useAIModel.ts              # AI 模型 API 调用 (DeepSeek/Qwen/OpenAI)
│   │   └── useHardwareInfo.ts         # Navigator 浏览器硬件信息获取
│   │
│   ├── utils/                        # 7 工具模块
│   │   ├── textAlgorithms.ts          # 核心：SimHash · LCS · Myers diff · 聚簇
│   │   ├── compareResultStore.ts      # Map 存储：ID 生成 · set/get · 大小限制
│   │   ├── sanitize.ts                # DOMPurify 安全过滤 + highlight 属性
│   │   ├── ocr.ts                     # Tesseract.js 封装 (chi_sim+eng, 进度)
│   │   ├── imageCompare.ts            # dHash 算法 (8×8 → 汉明距离 → 相似度%)
│   │   ├── watermark.ts               # 45+ 中英文文档水印正则匹配
│   │   └── extractImages.ts           # DOCX(word/media/) / PDF 图片提取
│   │
│   ├── workers/
│   │   └── comparison.worker.ts       # Web Worker: 大文件对比卸载
│   │
│   ├── directives/
│   │   └── highlightTooltip.ts        # v-highlight-tooltip 自定义指令
│   │
│   ├── plugins/
│   │   └── icons.js                   # RemixIcon 全局注册
│   │
│   └── assets/
│       └── styles/
│           └── variables.css          # CSS 自定义属性 (国潮配色)
│
├── public/
│   └── logo-icon.svg                  # 应用 logo 源文件
│
└── docs/                              # 示例文档
```

### 架构层次

```
┌──────────────────────────────────────────────────────────────────┐
│                      Deno 桌面客户端 (desktop/desktop.ts)         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  WebView 原生窗口 (webkit2gtk / WKWebView / WebView2)     │  │
│  │  HTTP 子进程: Deno.serve + serveDir 静态文件托管           │  │
│  │  JS Bridge: webview.bind / webview.init 双向通信          │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                    SPA 渲染 — Vue 3 应用                           │
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

## 部署实施

### Web 方式

以标准静态网站部署，无需 Node.js 或 Deno 运行时环境。

**开发**

```bash
npm run dev
```

在 `http://localhost:5173` 启动开发服务器，支持 HMR 热更新。

**构建**

```bash
npm run build
```

产物输出到 `dist/` 目录，可直接部署到任意静态 Web 服务器（Nginx、Apache、OSS 等）。

**Nginx 配置要点**

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/dist;
  index index.html;

  # SPA 路由回退
  location / {
    try_files $uri $uri/ /index.html;
  }

  # 静态资源缓存
  location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

---

### 客户端方式

使用 Deno 2 + WebView 将 Web 应用打包为原生桌面窗口，提供类似 Electron 的桌面体验，但体积更小、启动更快。

**前置条件**

- [Deno](https://deno.com/) ≥ 2.0
- Linux: `sudo apt install libwebkitgtk-6.0-4`
  - macOS / Windows: WebView 由系统内置，无需额外安装

**运行**

```bash
# 构建前端 + 启动桌面窗口
npm run build && npm run desktop

# 或分步执行
npm run build
npm run desktop
```

**编译为单文件二进制**

```bash
npm run desktop:compile
```

产物为 `./bid-compare` 可执行文件，可直接分发运行（需目标系统已安装 libwebkitgtk-6.0-4）。

**工作原理**

```
npm run build  →  dist/ (静态资源)
                      ↓
desktop/desktop.ts  →  Deno.Command 子进程
                           ↓
                    Deno.serve + serveDir
                    (HTTP 静态文件服务, 端口 51730)
                           ↓
                    WebView 原生窗口
                    (webkit2gtk / WKWebView / WebView2)
                    navigate → http://localhost:51730/
```

`webview.run()` 会阻塞主线程运行 GTK 事件循环，因此 HTTP 服务以子进程方式独立运行，确保请求处理不被阻塞。

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
