# 文比猩 — 文档智能对比平台

<p align="center">
  <strong>精准识别文档差异 · AI 智能分析 · 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文比猩 Logo">
</p>

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue_3-3.5-4FC08D?logo=vue.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件介绍

文比猩是一款专业文档对比工具，专为招投标文件、合同审阅、版本文档差异检测等场景设计。基于 Vue 3 + TypeScript + Vite 构建，支持多种文档格式的精准对比分析，并集成 AI 大模型辅助差异解读。

**核心功能**

| 功能 | 说明 |
|------|------|
| 文件对比 | 精准识别两个版本文档之间的内容差异、相似片段和结构变更 |
| 属性检查 | 13 项文档元数据字段全面比对，三级状态一目了然 |
| 图像对比 | dHash 感知哈希算法，精准计算图片相似度 |
| 批量对比 | 3-10 文件全两两比较，相似度矩阵可视化 |
| AI 分析 | 集成 DeepSeek / 通义千问 / OpenAI，一键生成差异分析报告 |
| OCR 识别 | Tesseract.js 浏览器端 OCR，识别图片中的文字内容 |

## 代码架构

```
bid-compare/
├── electron/
│   ├── main.ts                 # Electron 主进程
│   ├── preload.ts              # 预加载脚本
│   └── tsconfig.json           # Electron TS 配置
├── src/
│   ├── main.ts                 # Vue 应用引导
│   ├── App.vue                 # 根组件
│   ├── router/index.js         # 路由配置
│   ├── components/             # 功能组件
│   │   ├── FileCompare.vue
│   │   ├── FileCompareResult.vue
│   │   ├── FileUpload.vue
│   │   ├── PropertyCheck.vue
│   │   ├── PropertyCheckResult.vue
│   │   ├── ImageCompare.vue
│   │   ├── BatchCompare.vue
│   │   ├── MultiFileUpload.vue
│   │   ├── MultiCompareResult.vue
│   │   ├── SystemSettings.vue
│   │   └── RecentRecords.vue
│   ├── composables/            # 组合式函数
│   │   ├── useFileParser.ts
│   │   ├── useComparison.ts
│   │   ├── useSettings.ts
│   │   ├── useRecentRecords.ts
│   │   ├── useAIModel.ts
│   ├── utils/                  # 工具模块
│   │   ├── textAlgorithms.ts
│   │   ├── compareResultStore.ts
│   │   ├── sanitize.ts
│   │   ├── ocr.ts
│   │   ├── imageCompare.ts
│   │   ├── watermark.ts
│   │   └── extractImages.ts
│   ├── workers/comparison.worker.ts
│   ├── directives/highlightTooltip.ts
│   └── assets/styles/variables.css
├── public/logo-icon.svg
└── vite.config.ts
```

## 部署说明

### Web 部署

构建产物为纯静态文件，可部署到任意 Web 服务器。

```bash
npm install
npm run build        # 产物输出到 dist/
```

**Nginx 配置**

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

## 桌面客户端

基于 Electron，支持 Windows、macOS、Linux 三平台打包发布。

### 本地开发

```bash
npm install
npm run electron:dev      # 启动开发模式（热更新）
```

### 本地打包

```bash
npm run electron:build    # 打包当前平台
npm run electron:build:win    # 仅打包 Windows (exe)
npm run electron:build:mac    # 仅打包 macOS (dmg, x64+arm64)
npm run electron:build:linux  # 仅打包 Linux (deb)
```

产物输出至 `release/` 目录。

### 自动生成 Release（GitHub Actions）

推送 Git tag 自动触发 CI/CD，在三平台并行构建并发布到 GitHub Releases。

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin dev --tags
```

构建完成后自动发布，下载地址：https://github.com/sikenali/bid-compare/releases

## 声明

1. **使用目的**：本工具旨在辅助文档对比与分析，用户应自行核对最终结论的准确性。
2. **文档安全**：所有文档处理均在浏览器本地完成，不上传至任何服务器。AI 分析仅在用户主动触发时，将对比结果摘要发送至用户配置的 API 端点。
3. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证。作者或版权持有人不对因使用本工具而产生的任何索赔、损害或其他责任负责。

## License

[MIT](./LICENSE)