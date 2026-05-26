# 大文件对比性能优化设计

## 目标

支持 500 页 / 750K 字符级别的文件对比，修复现有算法中的数据正确性 Bug，优化解析和对比性能，改进用户进度反馈体验。

## 范围

### 1. 解除硬上限

**现状：** `useComparison.ts` 硬编码 500,000 字符上限，500 页文档（约 750K 字符）直接报错。

**改动：**
- `useComparison.ts` 上限从 500K 提升至 **1,000,000 字符**
- `FileCompare.vue` 警告阈值同步上调至 800K（在接近上限时预警）
- `selectStrategy` 阈值映射更新：MinHash 策略从 ≥100K 调整为 ≥50K，确保大文件始终使用 Worker

### 2. 修复 MinHash 跨块匹配丢失

**现状：** `findSimilarSegmentsMinHash` 以 1000 字符分块，跨块边界的匹配被完全丢弃。且非首块的偏移量计算错误导致 `buildHighlightedHtml` 内容预览错误。

**改动：**
- 分块间增加 **200 字符重叠窗口**（chunk size 1000, overlap 200）
- 对重叠区域产生的重复匹配进行去重合并（按位置去重，保留最长匹配）
- 修正偏移量计算：`findSimilarSegmentsMinHash` 返回的 segment 使用完整文本偏移，而非块内偏移
- 删除 `buildEstimatedPageMap` 的依赖——直接使用传入的 `pageMap1/pageMap2`（本身就是完整文本的页码映射）

### 3. 修复 PDF 解析 O(n²) 字符串拼接

**现状：** `useFileParser.ts` PDF 解析循环中使用 `textContent += pageText + '\n'`，在 JavaScript 中每次迭代创建新字符串，复杂度 O(n²)。

**改动：**
- 改用 `const parts: string[] = []` + `parts.push(pageText)` + `parts.join('\n')`
- 对 DOCX 和 XLSX 解析做同样的优化（可能存在类似模式）

### 4. 提升 PPTX 提取上限

**现状：** `MAX_EXTRACT_SLIDES = 30`，对于包含图表和备注的 PPTX 文件严重不足。

**改动：**
- `MAX_EXTRACT_SLIDES = 30` → **200**
- 添加进度回调，大 PPTX 解析时反馈进度

### 5. 解析阶段可取消

**现状：** `cancelComparison` 只中止 Worker 对比，文件解析阶段无法取消。

**改动：**
- `useFileParser.ts` `parseFile` 函数增加可选的 `AbortSignal` 参数
- 在 PDF 的逐页解析循环、PPTX 的幻灯片提取循环中检查 `signal.aborted`
- `FileCompare.vue` 的取消按钮同时中止解析和对比
- `useComparison.ts` 暴露 `abortController` 供外部中止

### 6. 改进进度报告

**现状：** Worker 每 5000 次迭代报告一次进度（Rabin-Karp），MinHash 仅 3 个固定里程碑。解析阶段无进度。

**改动：**
- Worker 发送周期从 5000 → **500 次迭代**（可通过 `REPORT_INTERVAL` 常量控制）
- MinHash 增加更多进度点：每处理 10 个 chunk pair 报告一次
- 解析阶段通过回调发送进度（如 PDF "正在解析第 X/500 页"）
- `useComparison.ts` 合并解析进度和对比进度计算整体进度

### 7. Worker 取消检查

**现状：** `cancelled` 标志只在循环间隙检查，紧循环内部不检查。

**改动：**
- Rabin-Karp 主循环：每 500 次迭代检查 `cancelled`
- MinHash LSH 候选循环：每处理一个 chunk pair 检查
- MinHash 签名计算循环：每 1000 个 shingle 检查

## 不变的部分

- 策略选择逻辑（LCS / Rabin-Karp / MinHash）保持不变
- Worker 通信协议（START / PROGRESS / RESULT / ERROR / CANCEL）保持不变
- 前端 UI 组件结构不变（仅增强进度显示）
- 对比算法核心逻辑不变（仅修复偏移 Bug 和添加重叠窗口）
- 文件上传限制（50MB）不变

## 风险

- **内存：** 1M 字符的 indexMap 约 8MB，preprocessed 文本约 2MB，总内存 < 50MB，可接受
- **Worker 超时：** 60 秒可能不足以处理 1M 字符的 MinHash 计算。建议对 >500K 字符的文件将超时延长至 120 秒
- **重叠窗口：** 200 字符重叠会产生 2-3 倍于当前的候选段数量，需要更积极的去重合并
