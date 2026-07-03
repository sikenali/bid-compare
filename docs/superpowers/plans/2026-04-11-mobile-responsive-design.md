# 移动端响应式设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为"文比猩"应用添加移动端响应式支持，实现汉堡菜单导航和竖版布局优化

**架构：** 通过 CSS media queries 实现三档响应式断点（移动端 ≤768px、平板 769-1024px、桌面 >1024px），在 App.vue 添加汉堡菜单和顶部导航栏，各页面组件调整布局为响应式

**技术栈：** Vue 3 Composition API、CSS Media Queries、CSS Transitions

---

## 文件结构

```
src/
├── App.vue                          # 修改：添加汉堡菜单、顶部导航栏、侧边栏响应式显示
├── components/
│   ├── FileCompare.vue              # 修改：竖版堆叠布局响应式调整
│   ├── FileUpload.vue               # 修改：宽度从固定改为响应式
│   ├── PropertyCheck.vue            # 修改：竖版堆叠布局响应式调整
│   ├── HardwareInfo.vue             # 修改：网格布局响应式断点
│   └── SystemSettings.vue           # 修改：单列布局和按钮全宽
docs/
└── superpowers/
    └── specs/
        └── 2026-04-11-mobile-responsive-design.md  # 已存在
```

---

## 任务 1：App.vue 添加汉堡菜单和顶部导航栏

**文件：**
- 修改：`src/App.vue`

### 步骤 1：分析现有 App.vue 结构

当前 App.vue 包含：
- 固定侧边栏（250px 宽度，始终显示）
- 主内容区域（flex: 1）
- 侧边栏包含 Logo、导航菜单、版本信息

### 步骤 2：添加响应式状态管理和汉堡菜单

在 `<script setup>` 中添加：

```typescript
import { ref, onMounted, onUnmounted } from 'vue'

// 移动端菜单状态
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

// 检测屏幕尺寸
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

// 监听窗口大小变化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 切换移动端菜单
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 关闭菜单
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// ESC 键关闭菜单
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeydown)
})
```

### 步骤 3：添加顶部导航栏模板

在 `<template>` 中添加顶部导航栏（在 app-container 内部，侧边栏之前）：

```vue
<template>
  <div class="app-container">
    <!-- 移动端顶部导航栏 -->
    <header v-if="isMobile" class="mobile-header">
      <button class="hamburger-btn" @click="toggleMobileMenu" aria-label="切换菜单">
        <span class="hamburger-icon">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </span>
      </button>
      <div class="mobile-logo">
        <div class="mobile-logo-seal">
          <RiExchangeLine class="mobile-logo-icon" />
        </div>
        <span class="mobile-title">文比猩</span>
      </div>
      <div class="mobile-header-spacer"></div>
    </header>

    <!-- 遮罩层 -->
    <Transition name="overlay">
      <div v-if="isMobile && isMobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
    </Transition>

    <!-- 侧边导航栏 -->
    <Transition name="sidebar">
      <aside v-show="isMobile ? isMobileMenuOpen : true" class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
        <!-- 移动端关闭按钮 -->
        <button v-if="isMobile" class="mobile-close-btn" @click="closeMobileMenu" aria-label="关闭菜单">
          <span class="close-icon">×</span>
        </button>

        <!-- Logo区域 -->
        <div class="logo-section">
          <div class="logo-icon">
            <div class="logo-seal">
              <RiExchangeLine class="logo-icon-svg" />
            </div>
          </div>
          <h1 class="logo-title">文比猩</h1>
          <p class="logo-subtitle">智能文档比对工具</p>
        </div>

        <!-- 导航菜单 -->
        <nav class="nav-menu">
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'file-compare' }"
            @click="handleMenuClick('file-compare'); closeMobileMenu()"
          >
            <RiExchangeLine class="nav-icon" />
            <span class="nav-text">文件对比</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'property-check' }"
            @click="handleMenuClick('property-check'); closeMobileMenu()"
          >
            <RiFileInfoLine class="nav-icon" />
            <span class="nav-text">属性检查</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'hardware-info' }"
            @click="handleMenuClick('hardware-info'); closeMobileMenu()"
          >
            <RiCpuLine class="nav-icon" />
            <span class="nav-text">硬件信息</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'system-settings' }"
            @click="handleMenuClick('system-settings'); closeMobileMenu()"
          >
            <RiSettings3Line class="nav-icon" />
            <span class="nav-text">系统设置</span>
          </button>
        </nav>

        <!-- 底部版本信息 -->
        <div class="version-info">
          <p>@2026 sikenali</p>
        </div>
      </aside>
    </Transition>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
```

### 步骤 4：添加移动端样式

在 `<style scoped>` 末尾添加：

```css
/* 移动端顶部导航栏 */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: rgba(44, 24, 16, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.hamburger-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.hamburger-icon {
  width: 24px;
  height: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger-line {
  width: 100%;
  height: 2px;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 1px;
  transition: all 0.3s ease;
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: center;
}

.mobile-logo-seal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(139, 0, 0, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-logo-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 1);
}

.mobile-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  font-family: SourceHanSans-Bold;
  letter-spacing: 1px;
}

.mobile-header-spacer {
  width: 44px;
  flex-shrink: 0;
}

/* 遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 侧边栏移动端样式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    z-index: 1001;
    transition: transform 0.3s ease;
    will-change: transform;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .mobile-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .mobile-close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-icon {
    font-size: 24px;
    color: rgba(255, 255, 255, 1);
    line-height: 1;
  }

  .main-content {
    padding-top: 60px;
    padding-left: 16px;
    padding-right: 16px;
  }
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 24px;
  }
}

/* 导航菜单项移动端优化 */
@media (max-width: 768px) {
  .nav-item {
    min-height: 48px;
    padding: 14px 16px;
  }

  .nav-icon {
    font-size: 22px;
    width: 22px;
    height: 22px;
  }

  .nav-text {
    font-size: 15px;
  }
}

/* Transition 动画 */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
```

### 步骤 5：验证构建

运行命令：
```bash
npm run build
```

预期：构建成功，无错误

### 步骤 6：测试移动端导航

1. 运行开发服务器：`npm run dev`
2. 打开浏览器开发者工具，切换到移动端视图（≤768px）
3. 验证：
   - 侧边栏隐藏，顶部导航栏显示
   - 点击汉堡菜单，侧边栏从左侧滑入
   - 点击遮罩层，侧边栏关闭
   - 点击菜单项，跳转到对应页面并关闭菜单
   - 按 ESC 键关闭菜单

### 步骤 7：Commit

```bash
git add src/App.vue
git commit -m "feat: 添加移动端汉堡菜单和顶部导航栏"
```

---

## 任务 2：FileUpload.vue 宽度响应式调整

**文件：**
- 修改：`src/components/FileUpload.vue`

### 步骤 1：修改容器宽度为响应式

找到 `.file-upload-container` 样式，将固定宽度改为响应式：

```css
.file-upload-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 547px;
  height: 344px;
}

@media (max-width: 768px) {
  .file-upload-container {
    max-width: 100%;
    height: auto;
    min-height: 280px;
  }
}
```

### 步骤 2：调整上传区域响应式

在 `.upload-area` 后添加：

```css
@media (max-width: 768px) {
  .upload-placeholder {
    padding: 16px;
  }

  .upload-icon-wrapper {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }

  .upload-icon {
    font-size: 32px;
  }

  .upload-main-text {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .format-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .format-icon-svg {
    font-size: 18px;
  }
}
```

### 步骤 3：Commit

```bash
git add src/components/FileUpload.vue
git commit -m "feat: FileUpload 组件宽度改为响应式"
```

---

## 任务 3：FileCompare.vue 竖版堆叠布局

**文件：**
- 修改：`src/components/FileCompare.vue`

### 步骤 1：修改上传区域为竖版布局

找到 `.upload-section` 样式，添加响应式规则：

```css
.upload-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

@media (max-width: 768px) {
  .upload-section {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
}
```

### 步骤 2：调整对比按钮位置

找到 `.compare-btn-wrapper` 样式，添加移动端优化：

```css
@media (max-width: 768px) {
  .compare-btn-wrapper {
    order: 3;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .compare-main-btn {
    width: 100%;
    max-width: 320px;
    height: 48px;
  }
}
```

### 步骤 3：调整页面头部和主内容区

在样式末尾添加：

```css
@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }

  .page-subtitle {
    font-size: 12px;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
```

### 步骤 4：调整结果展示区域

找到雷同片段列表和分页组件，添加移动端样式：

```css
@media (max-width: 768px) {
  .content-display {
    flex-direction: column;
  }

  .content-box {
    width: 100%;
  }

  .pagination {
    flex-wrap: wrap;
    gap: 8px;
  }
}
```

### 步骤 5：Commit

```bash
git add src/components/FileCompare.vue
git commit -m "feat: 文件对比页面竖版堆叠布局"
```

---

## 任务 4：PropertyCheck.vue 竖版布局调整

**文件：**
- 修改：`src/components/PropertyCheck.vue`

### 步骤 1：修改上传区域为竖版布局

与 FileCompare.vue 类似的策略：

```css
.upload-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(166, 124, 82, 0.2);
}

@media (max-width: 768px) {
  .upload-section {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .check-btn-wrapper {
    order: 3;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .start-check-btn {
    width: 100%;
    max-width: 320px;
    height: 48px;
  }
}
```

### 步骤 2：调整属性检查结果展示

```css
@media (max-width: 768px) {
  .property-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    width: 100%;
  }

  .property-details-list {
    gap: 12px;
  }
}
```

### 步骤 3：Commit

```bash
git add src/components/PropertyCheck.vue
git commit -m "feat: 属性检查页面竖版布局"
```

---

## 任务 5：HardwareInfo.vue 网格断点调整

**文件：**
- 修改：`src/components/HardwareInfo.vue`

### 步骤 1：修改信息卡片网格布局

找到 `.info-cards` 和 `.info-multi-columns` 样式，添加移动端断点：

```css
.info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .info-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .info-card {
    padding: 16px;
  }

  .info-multi-columns {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .card-title {
    font-size: 18px;
  }

  .page-title {
    font-size: 18px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .info-cards {
    gap: 20px;
  }

  .info-multi-columns {
    gap: 20px;
  }
}
```

### 步骤 2：Commit

```bash
git add src/components/HardwareInfo.vue
git commit -m "feat: 硬件信息页面网格断点优化"
```

---

## 任务 6：SystemSettings.vue 单列布局和按钮全宽

**文件：**
- 修改：`src/components/SystemSettings.vue`

### 步骤 1：修改设置表单网格布局

找到 `.settings-form` 样式，添加响应式规则：

```css
.settings-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .settings-form {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .settings-card {
    padding: 16px;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .setting-input {
    width: 100%;
  }

  .setting-input.api-input {
    width: 100%;
  }

  .radio-group {
    width: 100%;
    justify-content: flex-start;
  }

  .page-title {
    font-size: 18px;
  }

  .card-title {
    font-size: 15px;
  }

  .setting-label {
    font-size: 14px;
  }

  .setting-desc {
    font-size: 12px;
  }
}
```

### 步骤 2：修改操作按钮为全宽

```css
.action-buttons {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  padding-bottom: 20px;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    gap: 12px;
    padding-bottom: 16px;
  }

  .btn {
    width: 100%;
    height: 48px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .settings-form {
    gap: 16px;
  }
}
```

### 步骤 3：Commit

```bash
git add src/components/SystemSettings.vue
git commit -m "feat: 系统设置页面单列布局和按钮全宽"
```

---

## 任务 7：全局样式优化和测试

**文件：**
- 修改：`src/assets/styles/variables.css`（可选）

### 步骤 1：添加全局响应式工具类（可选）

如果需要在多个组件中复用，可在 variables.css 中添加：

```css
@media (max-width: 768px) {
  :root {
    --spacing-page: 16px;
    --spacing-card: 16px;
    --font-size-title: 18px;
    --font-size-body: 13px;
    --font-size-small: 11px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    --spacing-page: 24px;
    --spacing-card: 20px;
  }
}

@media (min-width: 1025px) {
  :root {
    --spacing-page: 32px;
    --spacing-card: 24px;
  }
}
```

### 步骤 2：完整测试

运行开发服务器并测试所有断点：

```bash
npm run dev
```

测试清单：
- [ ] 移动端（375px）：导航、所有页面布局、按钮触摸区域
- [ ] 平板（768px、1024px）：间距优化、列数调整
- [ ] 桌面（1280px+）：原有布局不变
- [ ] 侧边栏动画流畅性
- [ ] ESC 键关闭菜单
- [ ] 遮罩层点击关闭
- [ ] 菜单项点击后自动关闭

### 步骤 3：构建验证

```bash
npm run build
```

预期：构建成功，无错误

### 步骤 4：最终 Commit

```bash
git add .
git commit -m "chore: 移动端响应式优化完成"
```

---

## 自检清单

对照设计文档 `docs/superpowers/specs/2026-04-11-mobile-responsive-design.md`：

- [x] 导航系统：汉堡菜单、顶部导航栏、侧边栏交互 ✓ 任务 1
- [x] 文件对比页面：竖版堆叠布局 ✓ 任务 3
- [x] 属性检查页面：竖版堆叠布局 ✓ 任务 4
- [x] 文件上传组件：响应式宽度 ✓ 任务 2
- [x] 硬件信息页面：网格断点调整 ✓ 任务 5
- [x] 系统设置页面：单列布局、按钮全宽 ✓ 任务 6
- [x] 触摸友好：最小 44px 触摸区域 ✓ 所有任务
- [x] 字体大小调整：移动端缩小 ✓ 所有任务
- [x] 间距优化：移动端紧凑 ✓ 所有任务
- [x] 动画性能：transform + will-change ✓ 任务 1
- [x] 响应式断点：768px、769-1024px、>1024px ✓ 所有任务

所有需求已覆盖，无占位符，无遗漏。
