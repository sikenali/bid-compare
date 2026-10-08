# Global Theme Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded CSS colors with CSS variables so theme switching works globally.

**Architecture:** 5 component files + 1 shared CSS file + 1 variables.css have hardcoded colors. Replace them with existing `var(--color-*)` references. Add one new CSS variable for `#2D6A9F` (blue accent used in buttons).

**Tech Stack:** Vue 3, CSS custom properties

## Global Constraints

- Do NOT modify `SystemSettings.vue` (its hardcoded colors are for theme preview cards and are intentional)
- Only replace colors that have CSS variable equivalents (exact or near-exact semantic match)
- Preserve all existing CSS structure and selector specificity

---

### Task 1: Add `--color-blue-accent` variable to variables.css

**Files:**
- Modify: `src/assets/styles/variables.css:137` (before layout section)

- [ ] **Add `--color-blue-accent` to `:root` block**

Insert after line 136 (after `--color-accent-red-dark`) and before the Layout section:

```css
  --color-blue-accent: #2D6A9F;
```

- [ ] **Add dark theme override**

In `[data-theme="dark"]` block, after `--color-accent-red-dark` equivalent:

```css
  --color-blue-accent: #1E4D73;
```

- [ ] **Add paper theme override**

In `[data-theme="paper"]` block:

```css
  --color-blue-accent: #2D6A9F;
```

- [ ] **Verify**

Read the file to confirm all 3 theme blocks have the new variable.

---

### Task 2: Replace hardcoded colors in shared.css

**Files:**
- Modify: `src/assets/styles/shared.css:17,43`

- [ ] **Replace `color: #fff;` with `color: var(--color-white);`**

Two occurrences at lines 17 and 43.

```css
/* Line 17: */
  color: var(--color-white);

/* Line 43: */
  color: var(--color-white);
```

- [ ] **Verify**

```bash
rg '#fff' src/assets/styles/shared.css
```
Expected: 0 matches.

---

### Task 3: Replace hardcoded colors in FileCompare.vue

**Files:**
- Modify: `src/components/FileCompare.vue:1354`

- [ ] **Replace `color: #fff;` with `color: var(--color-white);`**

Single occurrence at line 1354.

```css
  color: var(--color-white);
```

- [ ] **Verify**

```bash
rg '#fff' src/components/FileCompare.vue
```
Expected: 0 matches.

---

### Task 4: Replace hardcoded colors in FileUpload.vue

**Files:**
- Modify: `src/components/FileUpload.vue:71-165`

Replacements:
- Line 71: `background: #F5EFE3;` → `background: var(--color-upload-bg);`
- Line 73: `border: 1px dashed #D4C4A8;` → `border: 1px dashed var(--color-tan-dark);`
- Line 86: `border-color: #C43D3D;` → `border-color: var(--color-accent-red);`
- Line 87: `background: #F0E8D8;` → `background: var(--color-icon-bg);`
- Line 94: `background: #F0E8D8;` → `background: var(--color-icon-bg);`
- Line 103: `color: #C43D3D;` → `color: var(--color-accent-red);`
- Line 109: `color: #3D2B1F;` → `color: var(--color-brown-dark);`
- Line 115: `color: #8B7355;` → `color: var(--color-brown-muted);`
- Line 124: `background: #C43D3D;` → `background: var(--color-accent-red);`
- Line 125: `color: #fff;` → `color: var(--color-white);`
- Line 136: `background: #A83028;` → `background: var(--color-accent-red-dark);`
- Line 149: `color: #8B7355;` → `color: var(--color-brown-muted);`
- Line 156: `color: #8B7355;` → `color: var(--color-brown-muted);`
- Line 165: `color: #C43D3D;` → `color: var(--color-accent-red);`

- [ ] **Replace each hardcoded color** (use `replaceAll` where appropriate)

- [ ] **Verify**

```bash
rg '#(fff|F5EFE3|D4C4A8|C43D3D|F0E8D8|3D2B1F|8B7355|A83028)' src/components/FileUpload.vue
```
Expected: 0 matches.

---

### Task 5: Replace hardcoded colors in PropertyCheckResult.vue

**Files:**
- Modify: `src/components/PropertyCheckResult.vue:337-402`

Replacements:
- Line 337: `background: #F0E8D8;` → `background: var(--color-icon-bg);`
- Line 360: `color: #fff;` → `color: var(--color-white);`
- Line 365: `background: #C43D3D;` → `background: var(--color-accent-red);`
- Line 369: `background: #2D6A9F;` → `background: var(--color-blue-accent);`
- Line 382: `color: #3D2B1F;` → `color: var(--color-brown-dark);`
- Line 390: `color: #8B7355;` → `color: var(--color-brown-muted);`
- Line 397: `background: #E8DCC8;` → `background: var(--color-tan-light);`
- Line 402: `color: #C43D3D;` → `color: var(--color-accent-red);`

- [ ] **Replace each hardcoded color**

- [ ] **Verify**

```bash
rg '#(F0E8D8|fff|C43D3D|2D6A9F|3D2B1F|8B7355|E8DCC8)' src/components/PropertyCheckResult.vue
```
Expected: 0 matches.

---

### Task 6: Replace hardcoded colors in FileCompareResult.vue (largest)

**Files:**
- Modify: `src/components/FileCompareResult.vue`

Replacements organized by color:

**Color replacements `#fff` → `var(--color-white)`:**
Lines: 1224, 1307, 1404, 1529, 1911, also backgrounds at 1335, 1500, 1622, 1733, 1961

**`#C43D3D` → `var(--color-accent-red)`:**
Lines: 1263, 1594, also backgrounds at 1229, 1306, 1357, 1403, 1534, 1910, 1951

**`#A83028` → `var(--color-accent-red-dark)`:**
Line: 1413

**`#3D2B1F` → `var(--color-brown-dark)`:**
Lines: 1245, 1336, 1383, 1388, 1486, 1544, 1881, 1922

**`#8B7355` → `var(--color-brown-muted)`:**
Lines: 1251, 1298, 1327, 1372, 1450, 1455, 1461, 1480, 1552, 1870, 1901

**`#F0E8D8` → `var(--color-icon-bg)`:**
Backgrounds at: 1201, 1287, 1313, 1371, 1389, 1869, 1906

**`#E8DCC8` → `var(--color-tan-light)`:**
Backgrounds at: 1258, 1382, 1880, and color at 1617

**`#D4C4A8` → `var(--color-tan-dark)`:**
Background at 1945, color at 1611

**`#F5EFE3` → `var(--color-upload-bg)`:**
Backgrounds at: 1440, 1511

**`#2D6A9F` → `var(--color-blue-accent)`:**
Backgrounds at: 1233, 1538

**`#2D8A4E` → `var(--color-jade)`:**
Color at 1582, background at 1349

**Diff background colors:**
- `#E8F8F0` → `var(--color-diff-added)` at 1581
- `#FFF8E1` → `var(--color-diff-modified)` at 1587
- `#FDEDEC` → `var(--color-diff-deleted)` at 1593

- [ ] **Replace all `#fff` occurrences**

- [ ] **Replace all `#C43D3D` occurrences**

- [ ] **Replace all `#A83028` occurrences**

- [ ] **Replace all `#3D2B1F` occurrences**

- [ ] **Replace all `#8B7355` occurrences**

- [ ] **Replace all `#F0E8D8` occurrences**

- [ ] **Replace all `#E8DCC8` occurrences**

- [ ] **Replace all `#D4C4A8` occurrences**

- [ ] **Replace all `#F5EFE3` occurrences**

- [ ] **Replace all `#2D6A9F` occurrences**

- [ ] **Replace all `#2D8A4E` occurrences**

- [ ] **Replace diff background colors**

- [ ] **Verify no remaining hardcoded colors**

```bash
rg '#(fff|C43D3D|A83028|3D2B1F|8B7355|F0E8D8|E8DCC8|D4C4A8|F5EFE3|2D6A9F|2D8A4E|E8F8F0|FFF8E1|FDEDEC)' src/components/FileCompareResult.vue
```
Expected: 0 matches.

---

### Task 7: Verify theme switching end-to-end

- [ ] **Run build to check for syntax errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Manual verification checklist**
  1. Start dev server: `npm run dev`
  2. Open app in browser
  3. Navigate to Settings → 主题设置
  4. Switch to 深色 theme - verify FileCompare, FileCompareResult, FileUpload, PropertyCheckResult all adapt
  5. Switch to 白纸 theme - verify same
  6. Switch back to 羊皮纸 - verify default restored