# 全局主题修复设计

## 问题

主题切换页面是一个假页面：设置页的 `handleThemeChange` 确实设置了 `document.documentElement.dataset.theme`，CSS 变量也确实按 `[data-theme]` 选择器切换了值。但大量 Vue 组件中的 `<style>` 使用了**硬编码十六进制颜色**，而非 CSS 变量，导致主题切换全局不生效。

## 范围

替换以下文件中硬编码颜色为 CSS 变量：

| 文件 | 替换数 |
|------|:------:|
| `src/components/FileCompareResult.vue` | ~65 |
| `src/components/FileUpload.vue` | ~13 |
| `src/components/PropertyCheckResult.vue` | ~8 |
| `src/components/FileCompare.vue` | ~1 |
| `src/assets/styles/shared.css` | ~2 |
| **合计** | **~89** |

## 变量映射

| 硬编码 | CSS 变量 |
|:------:|:---------:|
| `#fff` / `#FFFFFF` | `var(--color-white)` |
| `#C43D3D` | `var(--color-accent-red)` |
| `#A83028` | `var(--color-accent-red-dark)` |
| `#3D2B1F` | `var(--color-brown-dark)` |
| `#8B7355` | `var(--color-brown-muted)` |
| `#F5EFE3` | `var(--color-upload-bg)` |
| `#F0E8D8` | `var(--color-icon-bg)` |
| `#E8DCC8` | `var(--color-tan-light)` |
| `#D4C4A8` | `var(--color-tan-dark)` |
| `#E8F8F0` / `#FFF8E1` / `#FDEDEC` | `var(--color-diff-added/modified/deleted)` |
| `#2D8A4E` | `var(--color-jade)` |
| `#5C4A3A` | `var(--color-brown)` |

## 新增变量

为 `#2D6A9F`（FileCompareResult 和 PropertyCheckResult 中用作蓝色操作按钮）新增 CSS 变量，以便主题化：

```css
--color-blue-accent: #2D6A9F
```

在所有三个主题中覆盖该变量（dark/paper 中变暗/变亮）。

## 不做

- 不在导航栏添加快速切换入口（用户确认不需要）
- 不替换 `SystemSettings.vue` 中的硬编码色（预览卡片的颜色是故意固定的）
- `#D4842A`、`#5C4A3A`（某些特殊情境）视情况判断，若无适当变量则保持硬编码