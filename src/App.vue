<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { RiExchangeLine, RiQuestionLine, RiSettings3Line } from '@remixicon/vue'

const router = useRouter()
const route = useRoute()

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <div class="app-container">
    <header class="top-nav">
      <div class="nav-left" @click="router.push('/')" style="cursor: pointer">
        <div class="logo-icon">
          <RiExchangeLine class="logo-svg" />
        </div>
        <div class="brand-group">
          <span class="brand-name">文比猩</span>
          <span class="brand-sub">Boomerang</span>
        </div>
      </div>
      <div class="nav-actions">
        <button class="nav-btn" title="帮助">
          <span class="nav-btn-content">
            <RiQuestionLine size="20" />
            <span class="nav-btn-label">帮助</span>
          </span>
        </button>
        <button class="nav-btn" title="设置" @click="router.push('/settings')">
          <span class="nav-btn-content">
            <RiSettings3Line size="20" />
            <span class="nav-btn-label">设置</span>
          </span>
        </button>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-nav-bg);
  font-family: var(--font-ui);
  overflow: hidden;
}

.top-nav {
  height: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--color-nav-bg);
  border-bottom: 1px solid var(--color-tan-light);
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent-red);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-svg {
  font-size: 22px;
  color: #fff;
}

.brand-group {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-brown-dark);
  line-height: 1.2;
}

.brand-sub {
  font-size: 12px;
  color: var(--color-brown-muted);
  line-height: 1.2;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--color-cream-dark);
  border: 0.7px solid var(--color-tan-border);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  white-space: nowrap;
  color: var(--color-brown);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  width: 90px;
  background: var(--color-cinnabar);
  border-color: transparent;
  color: #fff;
}

.nav-btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn-label {
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  display: none;
}

.nav-btn:hover .nav-btn-label {
  display: inline;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: var(--color-nav-bg);
}
</style>