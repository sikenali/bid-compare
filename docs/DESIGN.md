# DESIGN.md — bid-platform 统一设计规范

> 本文档定义 bid-maker、bid-extractor 及后续产品的**视觉规范与页面模板**，重点是上传页和设置页，供设计师和前端开发直接使用。

---

## 1. 设计语言总览

| 维度 | 规范 |
|------|------|
| **主题基调** | Parchment（羊皮纸）浅色 + 可选 Dark（墨夜）深色 |
| **强调色** | 朱红 `#C0392B`（默认），可选鎏金/玉绿/云蓝/黛墨 |
| **字体族** | 中文：SourceHanSans / PingFang SC / Microsoft YaHei；英文/数字：Inter |
| **网格** | 8px 基准网格（4/8/12/16/20/24/32/40/48/64px 步进） |
| **圆角体系** | sm=6 / md=10 / lg=14 / xl=18 / 2xl=24 / full=9999 |
| **边框** | 0.7px solid（极细边框，视觉精致感） |
| **阴影** | xs→xl 五级，最大 xl = `0 12px 40px rgba(0,0,0,0.2)` |
| **过渡** | fast=150ms / base=200ms / slow=300ms，一律 ease |

---

## 2. 上传页面（UploadView）

### 2.1 整体布局

```
┌─────────────────────────────────────────────┐
│  TopNav（品牌 Logo + 标题 + 设置按钮）         │
├─────────────────────────────────────────────┤
│                                             │
│              [UploadCard]                   │
│              （居中，大尺寸拖拽区域）            │
│                                             │
│              [StepStrip]                    │
│              （上传完成后出现）                 │
│                                             │
├─────────────────────────────────────────────┤
│  PageFooter（ Credits | 招标网站 ）            │
└─────────────────────────────────────────────┘
```

### 2.2 UploadCard 组件规范

**尺寸**
- 宽度：`875px`（桌面），响应式 `min(875px, calc(100vw - 64px))`（移动端/小屏）
- 高度：`345px`
- 背景：`var(--color-bg-white)`
- 边框：`0.7px solid var(--color-border)` → 拖拽时变为 `var(--color-primary)`
- 圆角：`14px`
- 内边距：`40px 32px`

**空态（未选择文件）**
```
[ 📤 上传图标 circle 80px ]
上传提示文字（18px Medium，居中对齐）
格式标签行：[W] [X] [P] [PDF] [MD] [TX]
```

格式标签色板：
| 扩展名 | 背景色 |
|--------|--------|
| .docx / .w | #2B579A |
| .xlsx / .csv / .x | #217346 |
| .pdf / .html / .p | #C0392B（主色） |
| .md | #4A6FA5 |
| .txt / .tx | #5A5750 |

**选中态（已选择文件）**
```
[✕ 替换按钮 右上角，圆形 36px，hover 旋转 120°]
[ 📄 文件图标 60×60，颜色同扩展名 ]
文件名（16px Medium，单行截断）
文件大小（14px Muted）
```

**上传进行中**
- 卡片锁定，不响应点击
- 下方 StepStrip 显示进度步骤（`步骤1: 文档解析` → `步骤2: 规则抽取` → `步骤3: 智能增强`）
- 底部按钮文案变为 `提取中…` / `制作中…`（disabled 状态）

### 2.3 StepStrip 组件规范

```
[ ① 文档解析 ]═══[ ② 规则抽取 ]═══[ ③ 智能增强 ]
                    [ 一键提取  /  提取中… ]
```

- 步骤节点：圆形编号，当前进行中高亮主色，已完成显示 ✓
- 连接线：`0.7px` 实线，未完成时虚线
- 按钮：`height: 52px`，`padding: 0 32px`，圆角 `12px`
- 主按钮：`background: var(--color-primary)`，白色文字
- 禁用态：`opacity: 0.6`，`cursor: not-allowed`

### 2.4 TopNav 顶栏与 PageFooter 页脚（上传页标配）

**TopNav**
| 属性 | 值 |
|------|-----|
| 高度 | `72px`，左右内边距 `24px` |
| 背景 | `var(--color-bg-white)`，底部 `0.7px` 浅边框 |
| 左侧 | 品牌图标（`RiTargetLine`，`26px`，主色）+ 品牌中文（`20px Bold`）+ 分隔竖线（`2×20px`）+ 页面标题（`16px`，Secondary 色） |
| 左侧整体可点击 | 跳**本产品上传页路由**（maker 为 `/`，extractor 为 `/upload`），hover 时品牌文字变主色 |
| 右侧按钮 | 圆形 `28×28`，图标 `14px`，Secondary 色；hover 时背景变主色、图标变白、上浮 `2px` |
| 右侧按钮 | 返回（`showBack=true` 时显示）+ 设置（打开设置中心弹窗） |

**PageFooter**
| 属性 | 值 |
|------|-----|
| 高度 | `58px`，左右内边距 `32px` |
| 背景 | 白→次级背景纵向渐变，顶部 `1px` 浅边框 |
| 左侧 | 品牌图标（`20px`，主色）+ “回旋标工具系列”（`14px Medium`） |
| 居中 | 企业信用 + 招标网站两个圆形图标按钮（`28×28`，图标 `14px`，hover 效果同顶栏按钮） |
| 右侧 | `© 年份 品牌名 Powered by LightOS`（`14px`，Muted 色，主色链接） |

---

## 3. 设置页面（SettingsView + SettingsModal）

### 3.1 弹窗整体尺寸

| 属性 | 值 |
|------|-----|
| 宽度 | `1320px`，最大 `94vw` |
| 高度 | `86vh`，最大 `900px` |
| 背景 | `var(--color-bg-secondary, #F7F3EA)` |
| 圆角 | `16px` |
| 阴影 | `0 8px 40px rgba(0,0,0,0.1)` |
| 内边距 | `28px 32px` |

### 3.2 弹窗头部

```
┌───────────────────────────────────────────────────┐
│  [⚙ 图标圆 48px]  设置中心                          │
│                 选择要进入的设置界面                   │  [✕ 圆形按钮 40px]
└───────────────────────────────────────────────────┘
```

- 图标圆：`48×48`，主色背景 soft，主色图标
- 标题：`22px Bold`，文本主色
- 副标题：`13px`，Muted 色

### 3.3 导航侧栏

| 属性 | 值 |
|------|-----|
| 宽度 | `240px` |
| 背景 | `var(--color-bg-white)` |
| 圆角 | `16px` |
| 内边距 | `16px` |
| 条目高度 | `52px` |
| 图标 | RemixIcon，`20px`，Body 色 |
| 文字 | `15px`，Body 色 |
| 激活态 | 背景 `var(--color-primary-soft)`，图标和文字变主色，fontWeight=500 |

**菜单项顺序（固定）**
1. 主题管理 `ri-palette-line`
2. 模板管理 `ri-file-list-2-line`
3. 技能管理 `ri-git-branch-line`
4. 模型管理 `ri-cpu-line`
5. 导出管理 `ri-download-2-line`
6. 关于 `ri-information-line`

### 3.4 内容区

右侧内容区 `flex: 1`，垂直滚动，隐藏嵌入视图自带 header 卡：

```css
.panel-content :deep(.page-header-card) { display: none; }
```

---

## 4. ThemeSettingsView（主题管理页）

### 4.1 页面头部 Card

```
首页 / 设置中心 / 主题管理          [恢复默认 按钮]
主题管理
统一切换外观底色、强调色与导航布局模式，修改即时生效
```

- 背景：白色，圆角 16px，内边距 20px 24px
- 面包屑分隔符：`/`，Faint 色
- 标题：`30px Bold`，`letter-spacing: -0.5px`
- 描述：`15px`，Secondary 色
- 恢复默认按钮：`height: 48px`，outline 样式

### 4.2 外观主题 Card

两个主题预览卡并列：

| 主题 | 预览背景 | 描述 |
|------|---------|------|
| 浅色主题·羊皮纸 | `#F7EED4` | 当前默认，长时间阅读标书不易疲劳 |
| 深色主题·墨夜 | `#333A45` | 夜间或暗光环境投标作业更护眼 |

卡片结构：
```
[ ✓ 勾选徽标 右上角 ]
[ 预览缩略图 100%×128px ]
  └─ 顶部条 28px高
  └─ 内容区 54px高
[ 主题名称 16px Medium ]
[ 描述 14px Muted ]
```

激活态：背景 `var(--color-primary-soft)`，边框 `var(--color-primary)`

### 4.3 强调色 Card

5 个圆形色盘横排，间距 40px：

| 名称 | 色值 |
|------|------|
| 朱红·默认 | #BE3B2E |
| 鎏金 | #D3A93F |
| 玉绿 | #3E8C6E |
| 云蓝 | #4A72A8 |
| 黛墨 | #2F3640 |

- 直径：`80px`
- 选中：内部显示白色 `✓` 图标
- 名称：选中时 Bold，未选中时 Regular

### 4.4 布局切换 Card

两个 mockup 预览卡并列：

| 布局 | 描述 |
|------|------|
| 顶栏模式·居中导航 | 六大模块在顶栏居中排布，右上角统一为返回与设置 |
| 侧边栏模式·左侧导航 | 六大模块在左侧竖列居中，顶栏不显示图标文字 |

Mockup 高度：`150px`，内部用色块模拟顶部导航和侧边栏布局示意。

切换后行为：保存 layout 到 localStorage，弹出成功 toast，**800ms 后 `window.location.reload()`** 刷新页面生效。

---

## 5. 颜色速查表

### Light (Parchment)

```
--color-primary        #C0392B   朱红（强调色）
--color-primary-soft   #FBE9E7   浅朱红背景
--color-bg-main        #FAF7F2   页面主背景（米白）
--color-bg-secondary   #F7F3EA   次级背景（卡片区）
--color-bg-card        #FCFBF8   卡片背景（近白）
--color-bg-white       #FFFFFF   纯白
--color-text-primary   #1F1D1A   主文本
--color-text-body      #3A3A3A   正文
--color-text-secondary #6E6A60   次要文本
--color-text-muted     #8A8578   提示文本
--color-text-faint     #A7A296   极淡文本
--color-border         #E5DFD3   边框
--color-border-soft    #EDE9E0   浅边框
--color-border-hover   #D9D2C2   悬停边框
--color-success        #4E9B7A   成功绿
--color-info           #4A72A8   信息蓝
--color-warning        #F39C12   警告橙
--color-error          #E74C3C   错误红
```

### Dark (墨夜)

```
--color-primary        #E05050
--color-primary-soft   #3A2323
--color-bg-main        #17171A
--color-bg-secondary   #1C1C1F
--color-bg-card        #232324
--color-bg-white       #232324
--color-text-primary   #F2F3F5
--color-text-body      #DDE0E6
--color-text-secondary #C9CDD4
--color-text-muted     #A7AEB9
--color-text-faint     #86909C
--color-border         #2A2B2E
--color-border-soft    #2A2B2E
--color-border-hover   #3A3B3F
--color-success        #5CB98C
--color-info           #82AEDD
--color-warning        #F2B23E
--color-error          #E86A5A
```

---

## 6. 通用组件规范

### 6.1 UiModal

- 使用 `<teleport to="body">` 挂载
- 遮罩：`rgba(0,0,0,0.4)`
- 动画：`opacity` 0.3s ease 进入/离开
- 最大宽度：`600px`，高度：`calc(100vh - 40px)`，垂直水平居中
- 圆角：`18px`，阴影：`0 12px 40px rgba(0,0,0,0.2)`

### 6.2 UiInput

- 高度：`42px`（md）
- 边框：`0.7px solid var(--color-border)`
- 背景：`var(--color-bg-secondary)`，focus 时变 `var(--color-bg-white)` + 主色边框
- 圆角：`10px`
- Placeholder：`var(--color-text-muted)`

### 6.3 UiCheck

- 自定义复选框徽标，用于卡片激活状态指示
- 尺寸通过 `size` prop 控制（默认 18px）
- 勾选时显示 ✓，颜色为主题主色

### 6.4 UiSwitch

- Toggle 开关，用于 boolean 配置项
- 开启状态：主色背景，白色滑块
- 关闭状态：Secondary 色背景，灰色滑块

### 6.5 UiSelect / UiSelectCard

- Select：下拉选择器，同 Input 风格
- SelectCard：网格卡片选择，激活卡添加主色边框和 ✓ 徽标

---

## 7. 新建产品快速上手 Checklist

开发一个新 bid-* 产品时，按以下顺序执行：

- [ ] 复制 `bid-maker/frontend/src/assets/global.css` 作为新项目的 CSS Token 文件
- [ ] 复制 `frontend/src/utils/toast.ts` 和 `icon.ts`
- [ ] 安装 `@remixicon/vue`，并在 `main.ts` 全局注册所有图标（照抄 maker 的注册循环）
- [ ] 复制 `frontend/src/stores/theme.ts`（Pinia Store）
- [ ] 复制 `frontend/src/components/ui/` 全部原子组件（`UiModal` 的 `icon` prop 传 `"ri-xxx"` 字符串，内部已用 `riToCompName` 转组件）
- [ ] 复制 `frontend/src/components/layout/TopNav.vue`、`PageFooter.vue`、`SettingsModal.vue`
- [ ] 复制 `frontend/src/components/upload/UploadCard.vue` 作为上传页基础
- [ ] 在 `router/index.ts` 中添加新产品路由（扁平式入口 `/`，或嵌套式 `/upload`）
- [ ] 把 `TopNav` 的品牌点击与返回按钮指向本产品的上传页路由（禁止跨项目照抄路径）
- [ ] 创建 `views/UploadView.vue`，套用标准骨架
- [ ] 实现产品专属 `handleSuccess` 回调（跳转至产品详情/编辑页）
- [ ] 运行 `npm run dev` 验证上传→跳转→设置全流程
