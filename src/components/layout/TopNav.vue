<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { RiExchangeLine, RiArrowLeftSLine, RiSettings3Line } from '@remixicon/vue'
import SettingsModal from './SettingsModal.vue'

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
        <RiExchangeLine class="tool-logo" />
      </div>
      <span class="brand-cn">{{ brand || '文比猩' }}</span>
      <span class="divider"></span>
      <span class="page-title">{{ title || '' }}</span>
    </div>
    <div class="nav-right">
      <button v-if="showBack" class="nav-btn" @click="router.back()" title="返回">
        <RiArrowLeftSLine class="icon" />
      </button>
      <button class="nav-btn" @click="showSettingsModal = true" title="设置">
        <RiSettings3Line class="icon" />
      </button>
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

.nav-left:hover .brand-cn {
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

.brand-cn {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary, var(--color-brown-dark, #1F1D1A));
  font-family: var(--font-ui);
  line-height: 1.2;
  transition: color 0.25s ease;
}

.divider {
  width: 2px;
  height: 20px;
  background-color: var(--color-border, var(--color-tan-border, #E5DFD3));
}

.page-title {
  font-size: 16px;
  color: var(--color-text-secondary, var(--color-brown-muted, #6E6A60));
  font-family: var(--font-ui);
  line-height: 1.2;
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
  font-size: 14px;
  color: var(--color-text-secondary, var(--color-brown-muted, #6E6A60));
  transition: color 0.25s ease;
}

.nav-btn:hover .icon {
  color: #fff;
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

  .brand-cn {
    font-size: 16px;
  }

  .tool-logo {
    font-size: 22px;
  }
}
</style>
