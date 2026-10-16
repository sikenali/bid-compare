<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { RiTargetLine, RiArrowLeftSLine, RiSettings3Line } from '@remixicon/vue'
import SettingsModal from './SettingsModal.vue'
import { BRAND_NAME } from '../../constants/brand'

withDefaults(defineProps<{
  title?: string
  brand?: string
  showBack?: boolean
}>(), {
  showBack: false,
})

const router = useRouter()
const showSettingsModal = ref(false)
</script>

<template>
  <header class="top-nav">
    <div class="nav-left" @click="router.push('/')">
      <div class="tool-mark">
        <RiTargetLine class="tool-logo" />
      </div>
      <span class="page-title">{{ title || BRAND_NAME }}</span>
    </div>
    <div class="nav-right">
      <div class="nav-btn-wrap" v-if="showBack">
        <button class="nav-btn" @click="router.back()">
          <RiArrowLeftSLine class="icon" />
        </button>
        <span class="nav-tip">返回</span>
      </div>
      <div class="nav-btn-wrap">
        <button class="nav-btn" @click="showSettingsModal = true">
          <RiSettings3Line class="icon" />
        </button>
        <span class="nav-tip">设置</span>
      </div>
    </div>
    <SettingsModal v-model:visible="showSettingsModal" />
  </header>
</template>

<style scoped>
.top-nav {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-bg-white, #FFFFFF);
  border-bottom: 0.7px solid var(--color-border-soft, #EDE9E0);
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.nav-left:hover .page-title {
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
}

.tool-mark {
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-logo {
  font-size: 26px;
  line-height: 1;
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary, var(--color-brown-dark, #1F1D1A));
  font-family: var(--font-ui);
  line-height: 1.2;
  transition: color 0.25s ease;
}

.nav-left:hover .page-title {
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background-color: var(--color-bg-white, #FFFFFF);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.nav-btn:hover {
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
}

.nav-btn .icon {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  font-size: 14px;
  color: var(--color-text-secondary, var(--color-brown-muted, #6E6A60));
  transition: color 0.25s ease;
}

.nav-btn:hover .icon {
  color: #fff;
}

.nav-btn-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-tip {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 50%;
  transform: translateX(-50%) scale(0.96);
  padding: 7px 12px;
  border-radius: 9px;
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, #E5DFD3);
  color: var(--color-text-body, #3A3A3A);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  font-family: var(--font-ui);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease, transform 0.16s ease;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 100;
}

.nav-tip::after {
  content: '';
  position: absolute;
  top: calc(100% - 4px);
  left: calc(50% - 3.5px);
  width: 7px;
  height: 7px;
  background-color: inherit;
  transform: rotate(45deg);
}

.nav-btn-wrap:hover .nav-tip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

@media (max-width: 768px) {
  .top-nav {
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  .top-nav {
    padding: 0 10px;
    height: 56px;
  }

  .page-title {
    font-size: 16px;
  }

  .tool-logo {
    font-size: 22px;
  }
}
</style>
