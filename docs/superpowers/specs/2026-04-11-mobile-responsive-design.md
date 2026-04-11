# 移动端响应式设计规范

## 概述

为"文件对对碰"应用添加移动端响应式支持，确保在 ≤768px 屏幕下提供流畅的竖版布局体验，同时保持桌面端（>1024px）和平板端（769px-1024px）的优化显示。

## 响应式断点

- **移动端**：≤768px，完整竖版布局，汉堡菜单导航
- **平板**：769px-1024px，优化间距和列数，保持侧边栏
- **桌面**：>1024px，保持原有横版布局

## 导航系统

### 桌面端（>768px）
- 保持现有左侧固定侧边栏（250px 宽度）
- 不做任何改动

### 移动端（≤768px）
- 隐藏固定侧边栏
- 顶部固定导航栏（60px 高度，position: fixed）
  - 左侧：汉堡菜单图标（44×44px 触摸区域）
  - 中间：Logo 图标 + 应用标题"文件对对碰"
  - 背景色：rgba(44, 24, 16, 1)（与侧边栏一致）

### 侧边栏交互
- 触发：点击汉堡菜单图标
- 动画：从左侧滑入，宽度 280px
- 遮罩层：半透明黑色背景（opacity 0.5），点击关闭
- 关闭方式：点击遮罩层、点击汉堡菜单、或 ESC 键
- CSS 实现：`transform: translateX(-100%)` → `translateX(0)`，300ms ease
- 内容：与桌面端侧边栏完全一致

## 布局调整

### 文件对比页面（FileCompare.vue）
- **桌面端**：左右并排显示两个 FileUpload 组件（固定 547px）
- **移动端**：
  - 竖版堆叠布局（flex-direction: column）
  - FileUpload 组件宽度改为 100%
  - 对比按钮移至两个上传组件下方居中显示
  - 主内容区 padding：32px → 16px

### 属性检查页面（PropertyCheck.vue）
- 与文件对比页面相同的竖版堆叠策略
- FileUpload 组件全宽显示
- 检查结果区域适配小屏幕

### 文件上传组件（FileUpload.vue）
- **桌面端**：固定宽度 547px
- **移动端**：`width: 100%`，最大宽度可设置 max-width: 547px

### 硬件信息页面（HardwareInfo.vue）
- **桌面端**：2 列网格布局 `grid-template-columns: 1fr 1fr`
- **移动端**：
  - 单列布局 `grid-template-columns: 1fr`
  - 信息字段从 3 列改为 1 列
  - 卡片间距缩小：24px → 16px

### 系统设置页面（SystemSettings.vue）
- **桌面端**：2 列网格布局
- **移动端**：
  - 单列竖版布局 `grid-template-columns: 1fr`
  - 设置卡片全宽显示
  - 底部按钮改为全宽（width: 100%），垂直堆叠
  - 按钮间距：16px → 12px

## 用户体验优化

### 触摸友好
- 所有可点击元素最小触摸区域：44×44px
- 导航菜单项高度 ≥44px
- 设置页面开关和按钮增大触摸目标

### 字体大小调整
- **移动端**：
  - 页面标题：20px → 18px
  - 卡片标题：16px → 15px
  - 正文文本：14px → 13px
  - 辅助文字：12px → 11px

### 间距优化
- **移动端**：
  - 主内容区 padding：32px → 16px
  - 卡片内边距：24px → 16px
  - 卡片间距：20px → 12px
  - 设置行间距：12px → 10px

### 动画性能
- 侧边栏展开：`transition: transform 0.3s ease`
- 遮罩层淡入：`transition: opacity 0.3s ease`
- 使用 `will-change: transform` 启用硬件加速
- 避免使用影响布局的属性（如 width、height）

## 实现文件清单

1. **App.vue** - 添加响应式导航逻辑、汉堡菜单、遮罩层、顶部导航栏
2. **FileCompare.vue** - 响应式布局调整（竖版堆叠）
3. **PropertyCheck.vue** - 响应式布局调整（竖版堆叠）
4. **FileUpload.vue** - 宽度从固定 547px 改为响应式
5. **HardwareInfo.vue** - 网格断点调整（2列→1列）
6. **SystemSettings.vue** - 布局响应式调整（2列→1列，按钮全宽）

## 注意事项

- 保持现有桌面端布局完全不变
- 所有响应式调整使用 CSS media queries 实现
- 不引入额外的 JavaScript 响应式逻辑（保持性能）
- 确保侧边栏内容与桌面端 100% 一致
- 测试断点边界值（768px、769px、1024px）
