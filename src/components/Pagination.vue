<script setup lang="ts">
/**
 * Pagination — 标准分页组件
 *
 * @example
 * <Pagination
 *   :total="filteredItems.length"
 *   :page-size="PAGE_SIZE"
 *   :current="currentPage"
 *   @update:current="currentPage = $event"
 * />
 */
const props = withDefaults(defineProps<{
  /** 总条数 */
  total: number;
  /** 每页条数，默认 10 */
  pageSize?: number;
  /** 当前页码（从 1 开始） */
  current?: number;
  /** 最多显示多少个页码按钮，默认 7 */
  maxVisible?: number;
}>(), {
  pageSize: 10,
  current: 1,
  maxVisible: 7,
});

const emit = defineEmits<{
  (e: 'update:current', page: number): void;
}>();

import { computed } from 'vue';

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  emit('update:current', page);
}

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = props.current;
  const max = props.maxVisible;
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(max / 2));
  const end = Math.min(total, start + max - 1);
  start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});
</script>

<template>
  <div v-if="totalPages > 1" class="pagination">
    <span class="page-info">
      共 {{ total }} 条 · 每页 {{ pageSize }} 条 · 第 {{ current }} / {{ totalPages }} 页
    </span>
    <div class="page-controls">
      <button class="page-btn" :disabled="current <= 1" @click="goToPage(current - 1)">
        <RiArrowLeftSLine class="icon" />
      </button>
      <button
        v-for="p in visiblePages"
        :key="p"
        class="page-btn"
        :class="{ active: current === p }"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="current >= totalPages" @click="goToPage(current + 1)">
        <RiArrowRightSLine class="icon" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.page-info {
  font-size: 14px;
  color: var(--color-text-muted, #8A8578);
  font-family: "SourceHanSans-Regular", var(--font-family-cn);
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-card, #FCFBF8);
  color: var(--color-text-secondary, #6E6A60);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-family: "SourceHanSans-Medium", var(--font-family-cn);
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: var(--color-bg-secondary, #F7F3EA);
}
.page-btn.active {
  background: var(--color-success, #4E9B7A);
  color: #fff;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-btn .icon {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  font-size: 16px;
}
</style>
