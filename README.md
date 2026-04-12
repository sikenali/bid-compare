# 文件对对碰 - 专业文档对比工具

<p align="center">
  <strong>🎯 精准识别文档差异 · 💡 智能分析辅助决策 · 📦 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文件对对碰 Logo">
</p>

---

## 📖 工具介绍

**文件对对碰**是一款专业的文档对比工具，基于现代 Web 技术栈（Vue 3 + TypeScript + Electron）构建，支持多种文档格式的精准对比分析。

### 🌟 核心优势

- **🔍 精准对比**：智能文本匹配算法，快速定位文档差异
- **📊 属性检查**：完整解析文档元数据，快速识别属性差异
- **🤖 AI 分析**：集成大语言模型，提供智能差异解读
- **📦 桌面应用**：基于 Electron 的跨平台桌面应用，开箱即用
- **🎨 优雅界面**：国潮古风设计，操作流畅直观

---

## ✨ 功能说明

### 1️⃣ 文件对比

精准识别两个版本文档之间的内容差异、相似片段和结构变更。

| 功能项 | 说明 |
|--------|------|
| **多格式支持** | 支持 Word (.docx)、PDF (.pdf)、Excel (.xlsx)、PPT (.pptx)、文本 (.txt) |
| **智能对比** | 自动提取文本内容，识别相似和差异片段 |
| **高亮显示** | 相同内容金色高亮标注，差异内容清晰区分 |
| **相似度统计** | 实时计算文本重复率和相似片段数量 |
| **AI 辅助分析** | 一键调用大模型，生成差异分析报告和建议 |
| **导出报告** | 支持导出完整的 Word 格式对比报告，方便存档分享 |
| **历史记录** | 本地保存最近 10 条对比记录，支持快速回溯查看 |

#### 使用流程

```
上传左侧文件 → 上传右侧文件 → 点击「一键对比」→ 查看对比结果 → 导出报告
```

#### 对比设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 最小匹配字数 | 5 | 判定为雷同的最小连续字符数 |
| 相似度阈值 | 75% | 标记为高相似度的最低百分比 |
| 忽略大小写 | ✅ 开启 | 对比时忽略大小写差异 |
| 忽略标点符号 | ❌ 关闭 | 对比时忽略标点符号 |
| 忽略空格 | ✅ 开启 | 对比时忽略空格差异 |

---

### 2️⃣ 属性检查

对比两个文档的基础属性信息，快速识别文件元数据差异。

| 功能项 | 说明 |
|--------|------|
| **属性解析** | 自动提取作者、修改时间、修订号、公司名称等 13 项属性 |
| **差异标注** | 匹配/不匹配/警告三级状态标识，一目了然 |
| **实时统计** | 显示匹配、不匹配、警告属性数量 |
| **导出报告** | 支持导出属性对比报告 |

#### 检查属性列表

| 属性字段 | 说明 |
|----------|------|
| 文件名称 | 文档文件名 |
| 文件大小 | 文件体积对比 |
| 文件类型 | 文档格式类型 |
| 作者 | 文档创建作者 |
| 最后一次保存者 | 最后编辑人员 |
| 修订号 | 文档修订版本号 |
| 版本号 | 应用程序版本号 |
| 程序名称 | 创建/编辑该文档的程序 |
| 公司 | 所属公司信息 |
| 创建时间 | 文档首次创建时间 |
| 修改时间 | 文档最后修改时间 |
| 页数 | 文档总页数 |
| 文件字数 | 文档文本内容长度 |

---

### 3️⃣ 硬件信息

查看系统硬件和网络信息，快速了解运行环境。

| 信息类别 | 包含内容 |
|----------|----------|
| 操作系统信息 | 用户名、系统版本、CPU、内存、运行时间等 |
| 网络信息 | IPv4 地址、MAC 地址、子网掩码、默认网关等 |
| 设备指纹 | 基于硬件特征生成的唯一设备标识 |

---

### 4️⃣ 系统设置

自定义应用参数，适配不同使用场景。

| 设置项 | 说明 |
|--------|------|
| 对比参数 | 调整最小匹配字数、相似度阈值等 |
| 忽略规则 | 开关大小写、标点符号、空格忽略 |
| AI 模型配置 | 配置 API 密钥和端点地址 |
| 导出格式 | 选择报告导出格式（Word/Markdown） |

---

## 🛠️ 技术架构

### 技术栈总览

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Vue 3 | ^3.5.24 | 组合式 API，响应式数据流 |
| **开发语言** | TypeScript | ~5.9.3 | 类型安全，提升代码质量 |
| **构建工具** | Vite | ^7.2.4 | 极速热更新，按需编译 |
| **路由管理** | Vue Router | ^4.6.3 | 客户端路由，页面导航 |
| **图标库** | Remix Icon | ^4.7.0 | 矢量图标，统一视觉风格 |
| **桌面框架** | Electron | ^41.2.0 | 跨平台桌面应用运行时 |
| **打包工具** | electron-builder | ^26.8.1 | 应用分发和安装包生成 |

### 文档处理库

| 库 | 用途 | 支持格式 |
|---|------|----------|
| **mammoth** | Word 文档解析 | .docx |
| **pdfjs-dist** | PDF 文档解析 | .pdf |
| **xlsx** | Excel 文档解析 | .xls, .xlsx |
| **docx** | Word 报告生成 | .docx |
| **jszip** | 压缩包处理 | .zip（Office 文件底层） |

### 架构设计

```
┌──────────────────────────────────────────────────────────┐
│                    Electron 主进程                         │
│                  (electron-main.js)                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  窗口管理 · IPC 通信 · 硬件信息获取                    │ │
│  └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                    渲染进程 (Vue 3)                        │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ │
│  │ FileCompare│ │PropertyChk │ │Hardware  │ │ Settings │ │
│  │  文件对比   │ │  属性检查   │ │  硬件信息  │ │  系统设置 │ │
│  └────────────┘ └────────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────────────────────┤
│                    Composables 层                          │
│  ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐ │
│  │useFileParser │ │useSettings │ │useAIModel│ │useComp │ │
│  │  文件解析     │ │  设置管理   │ │ AI 模型   │ │ 对比调度│ │
│  └──────────────┘ └────────────┘ └──────────┘ └────────┘ │
├──────────────────────────────────────────────────────────┤
│                    Utils 工具层                            │
│              textAlgorithms.ts (文本对比算法)               │
│           compareResultStore.ts (结果存储管理)              │
└──────────────────────────────────────────────────────────┘
```

### 数据流

```
文件上传 → 格式识别 → 文本提取 → 预处理
  → 相似度计算 → 匹配片段查找 → 索引映射 → 高亮渲染
  → 结果展示 → 报告导出
```

---

## 📦 打包部署

### 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| 操作系统 | Windows 10/11, macOS 10.15+, Ubuntu 20.04+ |

### 开发环境

#### 1. 安装依赖

```bash
npm install
```

#### 2. 启动开发服务器

```bash
# Web 开发模式（浏览器访问）
npm run dev
# 访问 http://localhost:5173

# Electron 桌面应用模式（推荐）
npm run electron:dev
# 直接启动 Electron 窗口，支持热更新
```

### 生产环境构建

#### 1. 构建前端静态文件

```bash
npm run build
# 输出目录：dist/
```

#### 2. 预览生产版本

```bash
npm run preview
```

### 桌面应用打包

#### Windows 平台

```bash
# 构建 Windows 安装包
npm run electron:build:win

# 输出目录：release/
# 生成文件：
#   - release/win-unpacked/             # 解压版（直接运行）
#   - release/文件对对碰 Setup 1.0.0.exe  # NSIS 安装包
```

#### macOS 平台

```bash
npm run electron:build:mac

# 输出目录：release/
# 生成文件：release/文件对对碰-1.0.0.dmg
```

#### Linux 平台

```bash
npm run electron:build:linux

# 输出目录：release/
# 生成文件：release/文件对对碰-1.0.0.AppImage
```

#### 图标生成

应用图标从 `public/logo-icon.svg` 自动生成：

```bash
npm run generate-icon
# 自动生成 dist/logo.png 和 dist/favicon.ico
```

> **提示**：图标生成已集成到打包流程中，运行 `electron:build:*` 时会自动执行。

### 打包配置说明

在 `package.json` 的 `build` 字段中配置：

```json
{
  "build": {
    "appId": "com.filecompare.app",
    "productName": "文件对对碰",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": ["nsis"],
      "icon": "dist/logo.png"
    },
    "nsis": {
      "oneClick": false,                    // 禁用一键安装
      "perMachine": true,                   // 为所有用户安装
      "allowToChangeInstallationDirectory": true,  // 允许选择安装目录
      "deleteAppDataOnUninstall": true,     // 卸载时删除数据
      "createDesktopShortcut": true,        // 创建桌面快捷方式
      "createStartMenuShortcut": true,      // 创建开始菜单快捷方式
      "shortcutName": "文件对对碰"          // 快捷方式名称
    }
  }
}
```

### Web 部署

```bash
# 构建静态文件
npm run build

# 将 dist/ 目录部署到 Web 服务器
```

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📁 项目结构

```
bid-assistant/
├── electron-main.js              # Electron 主进程
├── preload.js                    # 预加载脚本（安全 IPC 通信）
├── package.json                  # 项目配置和依赖
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json                 # TypeScript 配置
│
├── 📁 public/                    # 静态资源
│   └── logo-icon.svg             # 应用图标源文件
│
├── 📁 src/
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件（侧边栏导航）
│   │
│   ├── 📁 components/            # 功能组件
│   │   ├── FileCompare.vue       # 文件对比主组件
│   │   ├── FileCompareResult.vue # 对比结果展示
│   │   ├── PropertyCheck.vue     # 属性检查组件
│   │   ├── PropertyCheckResult.vue # 属性检查结果
│   │   ├── FileUpload.vue        # 文件上传组件
│   │   ├── HardwareInfo.vue      # 硬件信息组件
│   │   ├── SystemSettings.vue    # 系统设置组件
│   │   └── RecentRecords.vue     # 最近记录组件
│   │
│   ├── 📁 composables/           # 组合式函数（业务逻辑）
│   │   ├── useFileParser.ts      # 文件解析逻辑
│   │   ├── useComparison.ts      # 对比算法调度
│   │   ├── useSettings.ts        # 设置管理
│   │   ├── useRecentRecords.ts   # 记录管理
│   │   ├── useAIModel.ts         # AI 模型集成
│   │   └── useHardwareInfo.ts    # 硬件信息获取
│   │
│   ├── 📁 utils/                 # 工具函数
│   │   ├── textAlgorithms.ts     # 核心文本对比算法
│   │   ├── compareResultStore.ts # 对比结果存储
│   │   └── sanitize.ts           # 内容安全过滤
│   │
│   └── 📁 router/                # 路由配置
│       └── index.js
│
└── 📁 release/                   # 打包输出目录（构建后生成）
```

---

## 🔧 常见问题

### Q: 打包后应用主页显示空白？

**A:** 确保使用 `app.getAppPath()` 获取应用根目录，而非 `__dirname`。生产环境中 `__dirname` 指向 ASAR 包内部路径。

### Q: 应用图标未显示，使用默认 Electron 图标？

**A:** 图标文件需要在 `vite build` 后重新生成。运行 `npm run generate-icon` 或执行 `npm run electron:build:*` 自动处理。

### Q: 支持哪些文档格式？

**A:** 目前支持 Word (.docx)、PDF (.pdf)、Excel (.xlsx)、PPT (.pptx) 和纯文本 (.txt) 格式。

### Q: 如何配置 AI 分析功能？

**A:** 在系统设置中配置 API 端点和密钥。支持 OpenAI、Claude、通义千问等兼容 OpenAI 格式的 API。

---

## 📄 许可证

MIT License

---

<p align="center">
  <strong>文件对对碰</strong> · 让文档对比更简单、更精准
</p>
