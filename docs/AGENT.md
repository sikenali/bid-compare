# AGENT.md — bid-platform 统一开发规范

> 适用于 bid-maker、bid-extractor 及后续新建项目。本文档规定 AI 助手（包括 OpenCode/Cursor/Claude）在此 monorepo 内编写/修改代码时的统一约定。

---

## 1. 项目结构约定

每个 bid-* 子项目遵循固定目录布局：

```
bid-<name>/
├── frontend/           # Vue 3 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/        # HTTP 客户端 + 各模块接口函数
│   │   ├── assets/     # global.css（Design Token 唯一来源）
│   │   ├── components/
│   │   │   ├── ui/     # 共享 UI 原子组件（UiInput / UiModal / …）
│   │   │   ├── layout/ # TopNav / MainApp / SettingsModal / …
│   │   │   └── upload/ # UploadCard.vue（跨项目复用）
│   │   ├── constants/
│   │   │   └── brand.ts
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   └── theme.ts
│   │   ├── utils/
│   │   │   ├── toast.ts    ← 所有项目必须拥有此文件
│   │   │   └── icon.ts     ← 所有项目必须拥有此文件
│   │   └── views/
│   │       ├── UploadView.vue
│   │       ├── EditorView.vue 或 ProjectView.vue
│   │       └── settings/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/            # Go (bid-maker) 或 Node+TS (bid-extractor)
├── electron/           # 仅 electron 版本项目有
└── package.json        # 根包，concurrently 启动脚本
```

---

## 2. 图标体系（统一标准）

**使用 `@remixicon/vue` 组件，禁止在模板中写 `<i class="ri-*">` 或 `<span class="icon ri-*">`。**

```vue
<!-- ✅ 正确 -->
<script setup>
import { RiSettings3Line, RiCloseLine } from '@remixicon/vue';
</script>
<template>
  <RiSettings3Line />
</template>
```

```vue
<!-- ❌ 禁止 -->
<i class="ri-settings-3-line"></i>
<span class="icon ri-close-line"></span>
```

已在 `frontend/src/utils/icon.ts` 中导出 `riToCompName()`，供 `SettingsModal` 等通过字符串动态渲染图标场景使用。

### 例外：UiModal / UiInput 的 icon prop 仍传字符串

`UiModal`、`UiInput` 这类通用组件的 `icon` prop 约定传 `"ri-xxx-line"` 字符串，组件**内部**用 `<component :is="riToCompName(icon)" />` 渲染。调用方不要改成传组件：

```vue
<!-- ✅ 正确：调用方继续传字符串 -->
<UiModal v-model="show" title="编辑提取内容" icon="ri-edit-line" />
<UiInput v-model="kw" prefix-icon="ri-search-line" />

<!-- UiModal 内部实现（已统一，勿改回 <i :class>） -->
<div class="ui-modal-icon">
  <component :is="riToCompName(icon)" />
</div>
```

---

## 3. Toast 消息（统一标准）

**所有项目统一使用 `@/utils/toast.ts` 中的封装，禁止直接 import `element-plus` 的 `ElMessage`。**

```ts
// ✅ 正确
import { ElMessage } from '@/utils/toast';
ElMessage.success('已保存');
ElMessage.error('操作失败');
ElMessage.warning('请上传文件');
ElMessage.info('正在处理…');

// ❌ 禁止
import { ElMessage } from 'element-plus';
```

`toast.ts` 内部自动注入 `__toast_container__` 元素，覆盖全局 CSS 变量主题色，支持四种类型（success / error / warning / info）。

---

## 4. 上传页面规范

### 4.1 页面骨架

每个项目的上传页必须遵循相同结构：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import TopNav from '@/components/layout/TopNav.vue';
import PageFooter from '@/components/layout/PageFooter.vue';
import UploadCard from '@/components/upload/UploadCard.vue';
import CreditQualificationModal from '@/components/layout/CreditQualificationModal.vue';
import BiddingSitesModal from '@/components/layout/BiddingSitesModal.vue';
import { ElMessage } from '@/utils/toast';

const router = useRouter();
const showCreditModal = ref(false);
const showBiddingModal = ref(false);

// 上传成功 → 跳转到产品专属详情/编辑页
function handleSuccess(/* productIdOrSessionId */) {
  router.replace({ path: /* 产品路由 */ });
}

function handleReplace() {
  ElMessage.info('已清除文件，请重新选择');
}
</script>

<template>
  <div class="upload-view">
    <TopNav title="智能标书解决方案平台-<产品名>" :show-back="false" />
    <div class="upload-body">
      <UploadCard @success="handleSuccess" @replace="handleReplace" />
    </div>
    <PageFooter @credit-query="showCreditModal = true" @bidding-sites="showBiddingModal = true" />
    <CreditQualificationModal v-model:visible="showCreditModal" />
    <BiddingSitesModal v-model:visible="showBiddingModal" />
  </div>
</template>

<style scoped>
.upload-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-main, #FAF7F2);
}
.upload-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 32px;
}
</style>
```

### 4.2 UploadCard.vue 行为约定

| 功能 | 规范 |
|------|------|
| 拖拽高亮 | `dragover` 时加 `.dragging` 类，`dragleave` 需判断 `relatedTarget` 避免误触 |
| 文件格式限制 | `.doc` 禁止，其它：docx/pdf/md/txt/xlsx/csv/html |
| 文件大小上限 | 50MB |
| 上传流程 | ① 创建会话/任务 ② 上传文件 ③ **轮询等待**（最多 120s）④ emit success |
| 替换按钮 | 右上角圆形按钮，hover 旋转 120°，uploading 状态禁用 |
| StepStrip | 上传完成后显示步骤进度，按钮文案由 `btnLabel` computed 控制 |

### 4.3 轮询任务状态（异步任务必选）

```ts
// 轮询解析任务: completed→通过, failed→抛错, 120s 超时
async function waitTaskDone(taskId: string): Promise<void> {
  const deadline = Date.now() + 120000;
  for (;;) {
    await sleep(1500);
    let task: any = null;
    try {
      const res = await getTaskStatus(taskId);
      task = res.data;
    } catch {
      continue; // 网络抖动直接重试，不计为失败
    }
    if (!task || ['running', 'pending', 'started'].includes(task.status)) {
      if (Date.now() > deadline) throw new Error('解析超时，请重试');
      continue;
    }
    if (task.status === 'failed') {
      throw new Error(task.error || '解析失败，请检查文件格式后重试');
    }
    return; // completed
  }
}
```

---

## 5. 设置页面规范

### 5.1 路由约定

设置中心采用**弹窗内嵌路由子视图**模式，主路由 `/settings` 进入后展示 SettingsModal，内部通过 `<component :is>` 切换子视图：

```ts
// router/index.ts
{ path: '/settings', component: () => import('@/views/SettingsView.vue') },
{ path: '/settings/theme',     component: () => import('@/views/settings/ThemeSettingsView.vue') },
{ path: '/settings/template',  component: () => import('@/views/settings/TemplateSettingsView.vue') },
{ path: '/settings/skill',     component: () => import('@/views/settings/SkillSettingsView.vue') },
{ path: '/settings/api-key',   component: () => import('@/views/settings/ApiKeySettingsView.vue') },
{ path: '/settings/export',    component: () => import('@/views/settings/ExportSettingsView.vue') },
{ path: '/settings/about',     component: () => import('@/views/settings/AboutSettingsView.vue') },
```

### 5.2 SettingsModal.vue 结构（统一）

```vue
<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="settings-panel">
          <div class="panel-header">
            <div class="header-left">
              <div class="header-icon">
                <RiSettings3Line />
              </div>
              <div class="header-text">
                <h2 class="panel-title">设置中心</h2>
                <p class="panel-subtitle">选择要进入的设置界面</p>
              </div>
            </div>
            <button class="close-btn" @click="close">
              <RiCloseLine />
            </button>
          </div>
          <div class="panel-body">
            <nav class="nav-list">
              <div v-for="item in menuItems" :key="item.key" class="nav-item"
                   :class="{ active: activeKey === item.key }"
                   @click="selectTab(item.key)">
                <component :is="riToCompName(item.icon)" class="icon" />
                <span class="label">{{ item.label }}</span>
              </div>
            </nav>
            <div class="panel-content">
              <component :is="activeComponent" :key="activeKey" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
```

`menuItems` 固定配置（新设菜单项按字母/逻辑顺序追加）：

| key | label | icon |
|-----|-------|------|
| theme | 主题管理 | ri-palette-line |
| template | 模板管理 | ri-file-list-2-line |
| skill | 技能管理 | ri-git-branch-line |
| model | 模型管理 | ri-cpu-line |
| export | 导出管理 | ri-download-2-line |
| about | 关于 | ri-information-line |

> 产品特有菜单（如 profile 个性设置）可在此基础之上追加，key 不重复即可。

### 5.3 SettingsView.vue（入口）

```vue
<template>
  <MainApp>
    <SettingsModal :visible="true" />
  </MainApp>
</template>
<script setup lang="ts">
import MainApp from '@/components/layout/MainApp.vue';
import SettingsModal from '@/components/layout/SettingsModal.vue';
</script>
```

### 5.4 ThemeSettingsView.vue 规范

设置项包含三块，**每块独立 Card**（`.section-card`），顶部必须有面包屑头卡（`.page-header-card`）：

1. **外观主题** — 浅色/深色卡片预览（色块模拟），点击切换
2. **强调色** — 圆形色盘选择，5 种预设（朱红/鎏金/玉绿/云蓝/黛墨）
3. **布局切换** — 顶栏 / 侧边栏 mockup，切换后刷新页面

`resetAll()` 函数始终恢复：theme=parchment / accent=vermilion / layout=topbar。

---

## 6. 设计 Token 体系

**`frontend/src/assets/global.css` 是所有项目 Design Token 的唯一来源。** 新建项目时直接复制该文件，不得自行添加新 Token。

### 6.1 颜色 Token 命名规范

```
--color-{语义}-{变体}
```

| 语义 | 变体 | 示例 |
|------|------|------|
| primary | -soft | `--color-primary: #C0392B` |
| bg | main / secondary / card / white | `--color-bg-main: #FAF7F2` |
| text | primary / body / secondary / muted / faint | `--color-text-muted: #8A8578` |
| border | - / -soft / -hover | `--color-border: #E5DFD3` |
| functional | success / info / warning / error（各有 -soft 变体） | `--color-success: #4E9B7A` |

### 6.2 字体族约定

```css
--font-family: 'Inter', 'SourceHanSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-cn: 'SourceHanSans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

中文内容强制使用 `--font-family-cn`，英文/数字使用 `--font-family`。

### 6.3 圆角与间距

- 圆角：`--radius-sm/md/lg/xl/2xl/full`（6/10/14/18/24/9999px）
- 间距：`--spacing-1~16`（4px 步进，0/4/8/12/16/20/24/32/40/48/64px）
- 按钮高度：`--btn-height-sm/md/lg`（36/44/52px）

---

## 7. 主题系统

主题通过 `stores/theme.ts`（Pinia）管理，**禁止在 CSS 中写 `[data-theme="dark"]` 覆盖块**，主题切换统一由 JS 执行：

```ts
// theme.ts applyTheme()
function applyTheme(theme: ThemeType) {
  const root = document.documentElement;
  root.dataset.theme = theme;           // 保留 attr 供调试
  const tokens = themeTokens[theme];
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value); // JS 直写，覆盖 CSS 默认值
  }
  // 强调色持久化
  const accent = localStorage.getItem(ACCENT_KEY);
  if (accent) root.style.setProperty('--color-primary', accent);
}
```

**`global.css` 中只保留 `:root` 默认值，不加任何 `[data-theme]` 块。**

---

## 8. 命名与路由约定

允许两种路由形态，新项目任选其一（选定后全项目保持一致）：

**A. 扁平式（bid-maker）** — 页面各自独立，`MainApp` 仅为透传壳：

```ts
{ path: '/', component: () => import('@/views/UploadView.vue') },
{ path: '/editor/:id', component: () => import('@/views/EditorView.vue'), props: true },
{ path: '/settings', component: () => import('@/views/SettingsView.vue') },
```

**B. 嵌套式（bid-extractor）** — 所有页面挂在 `MainApp` 之下，根路径重定向到上传页：

```ts
{
  path: '/',
  component: () => import('@/components/layout/MainApp.vue'),
  children: [
    { path: '', redirect: '/upload' },
    { path: 'upload', component: () => import('@/views/UploadView.vue') },
    { path: 'result', component: () => import('@/views/ProjectView.vue') },
  ],
},
```

| 项目 | 上传页路由 | 详情页路由 |
|------|-----------|-----------|
| bid-maker（扁平） | `/` | `/editor/:id` |
| bid-extractor（嵌套） | `/upload`（`/` 重定向过去） | `/result`（query 传 jobId） |
| 新建项目 | 二选一 | `/<feature-name>/:id` 或 `/result` |

**硬性规则：`TopNav` 的品牌点击与返回按钮，必须指向本产品的上传页路由。**
反面案例：bid-maker 曾从 extractor 复制 `TopNav`，里面写死 `router.push('/upload')`，
而 maker 路由表里根本没有 `/upload`，导致点品牌 Logo 跳空白页——已修复为 `/`。

---

## 9. 禁止事项

| ❌ 禁止 | ✅ 替代方案 |
|---------|-----------|
| 直接 `import { ElMessage } from 'element-plus'` | `import { ElMessage } from '@/utils/toast'` |
| `<i class="ri-*">` / `<span class="icon ri-*">` | `<RiXxxLine />` 或 `<component :is="riToCompName(...)">` |
| CSS 中写 `[data-theme="dark"]` 覆盖 | 由 `theme.ts` 的 `applyTheme()` 通过 JS 写入 |
| 在 `global.css` 外定义新 Token | 新增 Token 必须加入 `global.css :root` |
| UploadView 中手写上传逻辑 | 复用 `UploadCard.vue`，只实现 `handleSuccess` |
| 设置页使用独立路由不带 Modal | 统一使用 SettingsModal 内嵌模式 |
| 布局切换后不刷新（新布局不生效） | 成功 toast + `setTimeout(() => window.location.reload(), 800)` 刷新生效 |
