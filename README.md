# 文比星 — 文档智能对比平台

<p align="center">
  <strong>精准识别文档差异 · AI 智能分析 · 跨平台桌面应用</strong>
</p>

<p align="center">
  <img src="public/logo-icon.svg" width="120" height="120" alt="文比星 Logo">
</p>

<p align="center">
  <img alt="Vue" src="https://img.shields.io/badge/Vue_3-3.5-4FC08D?logo=vue.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件介绍

文比星是一款专业文档对比工具，专为招投标文件、合同审阅、版本文档差异检测等场景设计。基于 Vue 3 + TypeScript + Vite 构建，支持多种文档格式的精准对比分析，并集成 AI 大模型辅助差异解读。

**核心功能**

| 功能 | 说明 |
|------|------|
| 文件对比 | 精准识别两个版本文档之间的内容差异、相似片段和结构变更 |
| 属性检查 | 13 项文档元数据字段全面比对，三级状态一目了然 |
| 图像对比 | dHash 感知哈希算法，精准计算图片相似度 |
| 批量对比 | 3-10 文件全两两比较，相似度矩阵可视化 |
| AI 分析 | 集成 DeepSeek / 通义千问 / OpenAI，一键生成差异分析报告 |
| OCR 识别 | Tesseract.js 浏览器端 OCR，识别图片中的文字内容 |

## 技术实现

### 差异识别 → 相似度矩阵 → AI 解读

系统采用纯前端计算模型：文本差异基于 LCS 与分块哈希，图像差异使用 dHash 感知哈希，属性差异通过 13 项元数据逐项比对。批量对比场景下，主线程负责 I/O 与 UI，`comparison.worker.ts` 独立执行差异计算，保证流畅交互。AI 分析在用户主动触发时才将结果摘要发送至用户配置的 API 端点。

### 前端架构

Vue 3 + TypeScript + Vite 单页应用，组件按功能拆分（FileCompare / PropertyCheck / ImageCompare / BatchCompare 等），配合 `composables/` 组织 `useFileParser`、`useComparison`、`useSettings`、`useAIModel` 等逻辑。样式基于 CSS 变量 + 主题系统，支持主题与强调色自定义。

### 桌面客户端

基于 Electron 构建 Windows / macOS / Linux 三平台原生应用。

```bash
# 安装依赖
npm install

# 开发模式（启动 Vite + Electron，热更新）
npm run electron:dev

# 打包当前平台
npm run electron:build

# 仅打包 Windows (exe)
npm run electron:build:win

# 仅打包 macOS (dmg, x64+arm64)
npm run electron:build:mac

# 仅打包 Linux (AppImage)
npm run electron:build:linux
```

产物输出至 `release/` 目录，构建完成后可通过 GitHub Actions 自动发布 Release。

---

## 声明

1. **使用目的**：本工具旨在辅助文档对比与分析，用户应自行核对最终结论的准确性。
2. **文档安全**：所有文档处理均在浏览器本地完成，不上传至任何服务器。AI 分析仅在用户主动触发时，将对比结果摘要发送至用户配置的 API 端点。
3. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证。作者或版权持有人不对因使用本工具而产生的任何索赔、损害或其他责任负责。

## License

[MIT](./LICENSE)
