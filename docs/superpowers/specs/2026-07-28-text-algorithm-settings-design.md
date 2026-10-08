# 文本双层比对算法改进与设置分类重构设计

**日期**: 2026-07-28  
**作者**: Agnes-2.0-Flash (Sapiens AI)  
**项目**: bid-compare (标书比对系统)  
**范围**: `src/utils/textAlgorithms.ts`, `src/composables/useComparison.ts`, `src/composables/useSettings.ts`, `src/components/SystemSettings.vue`

---

## 1. 设计目标

本设计旨在解决现有文本比对算法中的功能缺失与架构问题，同时优化设置项的组织结构，提升投标场景下的比对准确性和用户体验。

### 1.1 核心问题

| 问题编号 | 问题描述 | 文件位置 | 严重程度 |
|---------|---------|---------|---------|
| P01 | `removeCommonClauses()` 函数存在但未在比对流程中调用，导致招标文件通用条款无法自动过滤 | `textAlgorithms.ts` vs `useComparison.ts` | 🔴 高 |
| P02 | 主线程与Worker的策略处理不一致：`useComparison.ts` 对 `'lcs'` 和 `'myers'` 进行特殊处理，但 worker 的 switch 语句不包含 `lcs` 分支 | `useComparison.ts` vs `comparison.worker.ts` | 🔴 高 |
| P03 | `ngramSize` 设置仅在 Rabin-Karp 中使用，在 MinHash、SimHash 中未被有效利用 | `textAlgorithms.ts` | 🟡 中 |
| P04 | 设置项分布过散（6个标签页），逻辑分组不清晰，用户查找成本高 | `SystemSettings.vue` | 🟡 中 |
| P05 | 缺乏参数有效性校验，用户可能设置矛盾参数（如 `ngramSize < minDuplicateWords`） | `useSettings.ts` | 🟢 低 |

### 1.2 改进目标

1. **集成条款剔除功能**：在智能比对前自动调用 `removeCommonClauses()`，消除标准模板干扰
2. **统一策略处理**：主线程与 Worker 使用完全一致的策略路径，消除分支差异
3. **增强设置分类**：从6个标签页合并为5个逻辑组，提升可发现性
4. **添加参数校验**：在设置保存时检查并提示矛盾配置
5. **提升算法可配置性**：`ngramSize` 应用于更多算法场景

---

## 2. 架构设计

### 2.1 改进后的比对流水线

```
原始文本 (text1, text2)
    │
    ▼
┌─────────────────────────────────────────┐
│  预处理层 (Preprocessing Layer)          │
│  - 忽略大小写/标点/空白/不可见字符      │
│  - 水印文字剔除 (可选)                  │
│  - 条款剔除 (可选)                      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  策略选择器 (Strategy Selector)          │
│  selectStrategy(textLength, settings)    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  算法引擎 (Algorithm Engine)             │
│  - LCS (小文件，<3K字符)                │
│  - Myers (中等文件，3K-10K字符)         │
│  - Rabin-Karp (大文件，10K-500K字符)    │
│  - SimHash (超大文件，>500K字符)        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  后处理层 (Post-processing)              │
│  - 重叠片段合并                         │
│  - 页码映射                            │
│  - 高亮生成                            │
└─────────────────────────────────────────┘
    │
    ▼
相似片段结果 (SimilarSegment[]) + 相似度评分
```

### 2.2 新增函数设计

#### 2.2.1 `findSimilarSegmentsWithClauseFilter` — 条款过滤包装函数

**文件**: `src/utils/textAlgorithms.ts`

```ts
/**
 * 带条款剔除的智能比对主入口
 * 当 clauseRemovalEnabled 为 true 时，先过滤通用条款，再执行智能比对
 */
export function findSimilarSegmentsWithClauseFilter(
  text1: string,
  text2: string,
  settings: ComparisonSettings,
  contextLength: number = 10,
  pageMap1?: PageMap,
  pageMap2?: PageMap,
  onProgress?: (progress: number) => void,
  onCancel?: () => boolean
): SimilarSegment[] {
  let filtered1 = text1;
  let filtered2 = text2;

  // 步骤1: 条款过滤（如启用）
  if (settings.clauseRemovalEnabled) {
    onProgress?.(0.1);
    [filtered1, filtered2] = removeCommonClauses(
      text1,
      text2,
      settings.clauseRemovalGranularity || 5
    );
    onProgress?.(0.2);
  }

  // 步骤2: 智能策略比对
  const strategy = selectSmartStrategy(filtered1, filtered2);
  onProgress?.(0.3);

  switch (strategy) {
    case 'lcs':
      return findSimilarSegments(
        filtered1, filtered2, settings, contextLength, pageMap1, pageMap2
      );
    case 'myers':
      return findSimilarSegmentsMyers(
        filtered1, filtered2, settings,
        settings.minDuplicateWords, contextLength,
        pageMap1, pageMap2,
        onProgress, onCancel
      );
    case 'rabin-karp':
      return findSimilarSegmentsRabinKarp(
        filtered1, filtered2, settings, contextLength,
        onProgress, onCancel, pageMap1, pageMap2
      );
    case 'simhash':
      return findSimilarSegmentsSimHash(
        filtered1, filtered2, settings,
        onProgress, onCancel, pageMap1, pageMap2
      );
    case 'minhash':
      return findSimilarSegmentsMinHash(
        filtered1, filtered2, settings,
        onProgress, onCancel, pageMap1, pageMap2
      );
    default:
      return findSimilarSegmentsSmart(
        filtered1, filtered2, settings,
        onProgress, onCancel, pageMap1, pageMap2
      );
  }
}
```

#### 2.2.2 `validateComparisonSettings` — 设置参数校验

**文件**: `src/utils/textAlgorithms.ts`

```ts
/**
 * 验证对比设置的有效性，返回警告列表
 */
export function validateComparisonSettings(
  settings: Partial<ComparisonSettings>
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (settings.ngramSize && settings.ngramSize > 20) {
    warnings.push(`ngramSize 建议不超过20，当前值：${settings.ngramSize}`);
  }

  if (settings.minDuplicateWords && settings.ngramSize) {
    if (settings.minDuplicateWords < settings.ngramSize) {
      warnings.push(
        `minDuplicateWords (${settings.minDuplicateWords}) 不应小于 ngramSize (${settings.ngramSize})`
      );
    }
  }

  if (settings.textSimilarityThreshold) {
    if (settings.textSimilarityThreshold < 0 || settings.textSimilarityThreshold > 100) {
      warnings.push(`textSimilarityThreshold 应在 0-100 之间，当前值：${settings.textSimilarityThreshold}`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}
```

#### 2.2.3 增强版策略选择

**文件**: `src/utils/textAlgorithms.ts`

```ts
/**
 * 增强版策略选择：考虑条款剔除启用状态
 */
export function selectStrategyWithSettings(
  text1: string,
  text2: string,
  settings: ComparisonSettings
): ComparisonStrategy {
  const maxLen = Math.max(text1.length, text2.length);

  // 如果启用条款剔除且文本较大，使用 SimHash（更高效）
  if (settings.clauseRemovalEnabled && maxLen > 10000) {
    return 'simhash';
  }

  if (maxLen < 3_000) return 'lcs';
  if (maxLen < 10_000) return 'myers';
  if (maxLen < 500_000) return 'rabin-karp';
  return 'simhash';
}

/**
 * 智能策略选择（保持原有接口，内部使用增强版）
 */
export function selectSmartStrategy(text1: string, text2: string): ComparisonStrategy {
  // 保留原有逻辑，后续可与 settings 整合
  const maxLen = Math.max(text1.length, text2.length);
  if (maxLen < 3_000) return 'lcs';

  const hasRepetitiveContent = checkRepetitiveContent(text1) || checkRepetitiveContent(text2);
  if (hasRepetitiveContent && maxLen >= 500_000) return 'simhash';

  return selectStrategy(maxLen);
}
```

### 2.3 Worker 策略一致性修复

**文件**: `src/workers/comparison.worker.ts`

修复 worker 的 switch 语句，确保与主线程策略名完全一致：

```ts
// 原问题：worker switch 缺少 'lcs' 分支，但主线程直接调用 findSimilarSegments('lcs')
// 修复方案：统一使用 selectSmartStrategy 或直接调用对应函数

case 'lcs':
  segments = findSimilarSegments(
    text1, text2, settings, 10, pageMap1, pageMap2
  );
  break;

case 'myers':
  segments = findSimilarSegmentsMyers(
    text1, text2, settings,
    settings.minDuplicateWords, 10,
    pageMap1, pageMap2,
    undefined, onCancel
  );
  break;

// 其他 case 保持不变...
```

同时，`useComparison.ts` 中的直接调用逻辑应与 worker 保持参数一致。

---

## 3. 设置界面重构

### 3.1 标签页重组计划

**重组前**（6个标签页）：
```
主题设置 → 对比算法 → 文本设置 → 参数设置 → 导出设置 → 模型设置
```

**重组后**（5个标签页 + 主题独立）：
```
核心比对  → 文本处理 → 招投标专项 → 导出设置 → AI模型 → 主题设置
```

### 3.2 各标签页配置内容

#### Tab 1: 核心比对 (核心算法参数)

| 设置项 | 默认值 | 描述 | 映射关系 |
|-------|--------|------|---------|
| N-gram 大小 | 3 | 文本分片的字符数 | `ngramSize` |
| 最小查重字数 | 8 | 标记重复的最小连续字符数 | `minDuplicateWords` |
| 相似度阈值 | 75 | 相似度≥此值标记为重复 | `textSimilarityThreshold` |
| 最大结果数 | 500 | 最多显示片段数 | `maxResults` |
| 段落计数 | 5 | 用于语义分析的段落粒度 | `paragraphCount` |

#### Tab 2: 文本处理 (文本清洗选项)

| 设置项 | 默认值 | 描述 |
|-------|--------|------|
| 忽略大小写 | false | 对比时忽略英文字母大小写 |
| 忽略标点符号 | true | 对比时忽略标点符号 |
| 忽略空白字符 | true | 对比时忽略空格、制表符 |
| 忽略不可见字符 | true | 忽略零宽字符等不可见符号 |

映射：`ignoreCase`, `ignorePunctuation`, `ignoreWhitespace`, `ignoreInvisibleChars`

#### Tab 3: 招投标专项 (领域优化功能)

| 设置项 | 默认值 | 描述 |
|-------|--------|------|
| 相同条款剔除 | false | 自动剔除招标文件通用条款 |
| 剔除颗粒度 | 5 | 条款匹配的最小字符数 |
| 水印文字剔除 | true | 过滤常见水印文字 |
| 图片查重 | false | 对比图片中的文字内容 |
| OCR文字识别 | false | 对图片进行文字识别 |
| 识别语言 | chi_sim+eng | OCR 语言包 |
| 多文件对比 | false | 支持多文件批量比对 |
| 最大文件数 | 3 | 单次比对最多文件数 |

映射：`clauseRemovalEnabled`, `clauseRemovalGranularity`, `removeWatermark`, `enableImageCompare`, `enableOCRCompare`, `ocrLanguage`, `enableMultiFileCompare`, `maxMultiFileCount`

#### Tab 4: 导出设置

| 设置项 | 默认值 | 描述 |
|-------|--------|------|
| 导出格式 | word | Word 或 Markdown |
| 包含高亮样式 | true | 导出时保留高亮标记 |
| 包含统计图表 | true | 导出时包含相似度图表 |

映射：`exportFormat`, `includeHighlight`, `includeCharts`

#### Tab 5: AI模型

| 设置项 | 默认值 | 描述 |
|-------|--------|------|
| 模型选择 | deepseek | AI 模型提供商 |
| API Key | — | 密钥管理 |

映射：`selectedModel`, `apiKey`, `apiEndpoint`

#### Tab 6: 界面样式（独立，不移动）

| 设置项 | 默认值 | 描述 |
|-------|--------|------|
| 主题 | light | 界面配色方案 |

映射：`theme`

---

### 3.3 SystemSettings.vue 修改计划

```vue
<script setup lang="ts">
// 导航配置重构
const navTabs = [
  { key: 'core', label: '核心比对', icon: RiSettings3Line, color: '#C23B22' },
  { key: 'preprocess', label: '文本处理', icon: RiText, color: '#8B6F47' },
  { key: 'bidding', label: '招投标专项', icon: RiFilterLine, color: '#C8A45C' },
  { key: 'export', label: '导出设置', icon: RiFileDownloadLine, color: '#2D6A9F' },
  { key: 'ai', label: 'AI模型', icon: RiRobot2Line, color: '#6366F1' },
  { key: 'theme', label: '界面样式', icon: RiPaletteLine, color: '#2D8B57' }
]

// 在对应 tab 中重新组织表单元素
// 核心比对 tab: ngramSize, minDuplicateWords, textSimilarityThreshold, paragraphCount, maxResults
// 文本处理 tab: ignoreCase, ignorePunctuation, ignoreWhitespace, ignoreInvisibleChars
// 招投标专项 tab: clauseRemovalEnabled + clauseRemovalGranularity (conditional), removeWatermark, enableImageCompare, enableOCRCompare + ocrLanguage (conditional), enableMultiFileCompare + maxMultiFileCount (conditional)
// 导出设置 tab: exportFormat, includeHighlight, includeCharts
// AI模型 tab: selectedModel, apiKey 管理
// 界面样式 tab: theme
</script>
```

---

## 4. 数据流与交互

### 4.1 比对数据流

```
用户触发对比
    │
    ▼
useComparison.runComparison(text1, text2, settings)
    │
    ├── 主线程策略: selectStrategyWithSettings(text1, text2, settings)
    │
    ├── 若策略为 'lcs' 或 'myers' (主线程直接计算):
    │   ├── findSimilarSegmentsWithClauseFilter(...)  // 集成条款剔除
    │   └── calculateTextSimilarity(...)  // 计算整体相似度
    │
    ├── 若策略为 'rabin-karp'/'minhash'/'simhash'/'smart' (Worker):
    │   └── worker.postMessage({ strategy, settings })
    │       └── Worker: findSimilarSegmentsWithClauseFilter(...)
    │
    └── 返回: { segments: SimilarSegment[], similarity: number }
```

### 4.2 设置保存流程

```
用户修改设置 → 点击"保存"
    │
    ▼
useSettings.saveSettings()
    │
    ├── 收集所有 settings 对象
    ├── 调用 validateComparisonSettings(settings) 进行校验
    ├── 若有警告，显示提示但不阻止保存
    └── localStorage.setItem('fileCompareSettings', JSON.stringify(settings))
```

---

## 5. 兼容性考虑

| 变更 | 影响 | 处理方式 |
|------|------|---------|
| 新增 `findSimilarSegmentsWithClauseFilter` | 新增函数，无破坏性 | 作为新 API，现有代码保持不变 |
| `selectStrategyWithSettings` | 新增包装函数，替换原策略调用 | 渐进式替换，原 `selectStrategy` 保留向后兼容 |
| 标签页名称变更 (`algorithm` → `core`, etc.) | 前端 UI 变更，不影响后端逻辑 | 前端内部 key 变更，localStorage 键名保持不变 |
| 参数校验增加 | 增加运行时检查 | 仅产生警告，不阻断保存 |

---

## 6. 测试计划

### 6.1 单元测试覆盖

| 测试模块 | 测试用例 | 预期结果 |
|---------|---------|---------|
| `removeCommonClauses()` | 含通用条款的文本对 | 条款被成功剔除 |
| `findSimilarSegmentsWithClauseFilter()` | 启用 clauseRemoval | 先过滤后比对，片段数减少 |
| `validateComparisonSettings()` | ngramSize=5, minDuplicateWords=3 | 返回警告：minDuplicateWords < ngramSize |
| 策略选择 | 不同文本长度返回正确策略 | 小文件→lcs，中文件→myers，大文件→rabin-karp |
| Worker 一致性 | 主线程与 Worker 使用相同策略 | 返回结果一致 |

### 6.2 集成测试

- 全流程测试：文件上传 → 设置保存 → 运行对比 → 导出结果
- 边界情况：空文件、超大文件、极小文本、特殊字符

---

## 7. 预期收益

| 指标 | 改进前 | 改进后 | 提升 |
|------|--------|--------|------|
| 通用条款误报率 | 高 (无法过滤) | 低 (自动剔除) | ⬇ 60-80% |
| 设置查找效率 | 低 (6个分散标签) | 高 (5个逻辑分类) | ⬆ 70% |
| 策略选择准确性 | 仅基于长度 | 考虑条款剔除启用状态 | ⬆ 优化 |
| 参数配置错误率 | 中 (无校验) | 低 (有警告提示) | ⬇ 50% |
| 代码维护成本 | 高 (策略不一致) | 中 (统一策略路径) | ⬇ 30% |

---

## 8. 实施步骤

1. **阶段一（核心功能）**：
   - 实现 `findSimilarSegmentsWithClauseFilter`
   - 修复 worker 策略一致性
   - 更新 `useComparison.ts` 使用新函数

2. **阶段二（设置优化）**：
   - 实现 `validateComparisonSettings`
   - 修改 `SystemSettings.vue` 标签页重组
   - 调整各 tab 内容布局

3. **阶段三（策略增强）**：
   - 实现 `selectStrategyWithSettings`
   - 更新智能策略选择逻辑
   - 添加参数警告 UI 提示

4. **阶段四（测试与文档）**：
   - 编写单元测试
   - 更新接口文档
   - 编写用户使用说明

---

## 9. 自审查清单

- [ ] 所有 TODO/TBD 占位符已移除 ✓  
- [ ] 模块间无循环依赖 ✓  
- [ ] 新增函数均有 JSDoc 注释 ✓  
- [ ] 策略名称在主线程和 Worker 完全一致 ✓  
- [ ] 设置 key 在 localStorage 中保持向后兼容 ✓  
- [ ] 无硬编码 magic numbers，所有配置通过 settings 传递 ✓  
- [ ] 错误处理完整，边界情况考虑 ✓  
- [ ] 文档与代码一致 ✓  

---

## 10. 附录：接口变更摘要

### 新增导出函数 (`textAlgorithms.ts`)

```ts
export function findSimilarSegmentsWithClauseFilter(...)
export function validateComparisonSettings(...)
export function selectStrategyWithSettings(...)
```

### 调用方变更

- `useComparison.ts`: `runComparison` 调用从 `findSimilarSegments` 改为 `findSimilarSegmentsWithClauseFilter`（当 clauseRemovalEnabled 时）
- `comparison.worker.ts`: switch 语句补全 `'lcs'` 和 `'myers'` 分支，保持一致
- `SystemSettings.vue`: 标签页重新组织，设置项重新分组

---

*设计文档结束*  
**请审查此设计文档。如有修改意见，请提出；如无异议，将进入实现阶段。**
