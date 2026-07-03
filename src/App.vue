<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RiExchangeLine, RiFileLine, RiFileInfoLine, RiSettings3Line, RiCpuLine, RiFileExcelLine, RiImageLine } from '@remixicon/vue'
import { useSettings } from './composables/useSettings'

const route = useRoute()
const router = useRouter()
const { settings } = useSettings()

const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeydown)
})

const activeMenu = computed(() => {
  if (route.path === '/file-compare' || route.path === '/file-compare-result') return 'file-compare'
  if (route.path === '/property-check' || route.path === '/property-check-result') return 'property-check'
  if (route.path === '/image-compare') return 'image-compare'
  if (route.path === '/hardware-info') return 'hardware-info'
  if (route.path === '/settings') return 'system-settings'
  if (route.path === '/batch-compare') return 'batch-compare'
  return 'file-compare'
})

const handleMenuClick = (menu: string) => {
  switch (menu) {
    case 'file-compare':
      router.push('/file-compare')
      break
    case 'property-check':
      router.push('/property-check')
      break
    case 'image-compare':
      router.push('/image-compare')
      break
    case 'hardware-info':
      router.push('/hardware-info')
      break
      case 'system-settings':
        router.push('/settings')
        break
      case 'batch-compare':
        router.push('/batch-compare')
        break
    }
  closeMobileMenu()
}
</script>

<template>
  <div class="app-container">
    <header v-if="isMobile" class="mobile-header">
      <button class="hamburger-btn" @click="toggleMobileMenu" aria-label="切换菜单">
        <span class="hamburger-icon">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </span>
      </button>
      <div class="mobile-logo">
        <div class="mobile-logo-seal">
          <RiExchangeLine class="mobile-logo-icon" />
        </div>
        <span class="mobile-title">墨墨梧文</span>
      </div>
      <div class="mobile-header-spacer"></div>
    </header>

    <Transition name="overlay">
      <div v-if="isMobile && isMobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
    </Transition>

    <Transition name="sidebar">
      <aside v-show="isMobile ? isMobileMenuOpen : true" class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
        <button v-if="isMobile" class="mobile-close-btn" @click="closeMobileMenu" aria-label="关闭菜单">
          <span class="close-icon">×</span>
        </button>

        <div class="sidebar-top-accent"></div>

        <div class="logo-section">
          <div class="logo-seal">
            <RiExchangeLine class="logo-icon-svg" />
          </div>
          <h1 class="logo-title">墨墨梧文</h1>
          <p class="logo-subtitle">投标文件智能比对</p>
        </div>

        <nav class="nav-menu">
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'file-compare' }"
            @click="handleMenuClick('file-compare')"
          >
            <RiExchangeLine class="nav-icon" />
            <span class="nav-text">文件对比</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'property-check' }"
            @click="handleMenuClick('property-check')"
          >
            <RiFileInfoLine class="nav-icon" />
            <span class="nav-text">属性检查</span>
          </button>
          <button
            v-if="settings.enableImageCompare"
            class="nav-item"
            :class="{ active: activeMenu === 'image-compare' }"
            @click="handleMenuClick('image-compare')"
          >
            <RiImageLine class="nav-icon" />
            <span class="nav-text">图片对比</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'hardware-info' }"
            @click="handleMenuClick('hardware-info')"
          >
            <RiCpuLine class="nav-icon" />
            <span class="nav-text">硬件信息</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'system-settings' }"
            @click="handleMenuClick('system-settings')"
          >
            <RiSettings3Line class="nav-icon" />
            <span class="nav-text">系统设置</span>
          </button>
        </nav>

        <div class="version-info">
          <p class="version-title">© 2026 sikenali</p>
          <p class="version-subtitle">LightOS Walk Coding</p>
        </div>
      </aside>
    </Transition>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  font-family: var(--font-ui);
  background: var(--color-parchment);
  overflow: hidden;
}

/* ========== Sidebar ========== */
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--color-cream);
  display: flex;
  flex-direction: column;
  box-shadow: 1px 0 0 var(--color-tan-light);
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.sidebar-top-accent {
  height: 4px;
  background: var(--color-cinnabar);
  flex-shrink: 0;
}

/* ========== Logo Section ========== */
.logo-section {
  padding: var(--spacing-6) var(--spacing-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px solid var(--color-tan-light);
}

.logo-seal {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: var(--color-cinnabar);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-cinnabar);
  margin-bottom: var(--spacing-3);
  position: relative;
}

.logo-seal::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  right: 3px;
  bottom: 3px;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: calc(var(--radius-lg) - 3px);
}

.logo-icon-svg {
  font-size: 28px;
  color: #fff;
}

.logo-title {
  font-size: 24px;
  font-weight: 400;
  color: var(--color-brown-dark);
  margin: 0 0 2px 0;
  font-family: var(--font-calligraphy);
  letter-spacing: 2px;
}

.logo-subtitle {
  font-size: var(--text-caption);
  color: var(--color-brown-muted);
  margin: 0;
  font-family: var(--font-ui);
  letter-spacing: 1px;
}

/* ========== Navigation ========== */
.nav-menu {
  flex: 1;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-brown);
  transition: all var(--transition-normal);
  text-align: left;
  font-family: var(--font-ui);
}

.nav-item:hover {
  background: var(--color-cream-dark);
  color: var(--color-brown-dark);
}

.nav-item.active {
  background: var(--color-cinnabar);
  color: #fff;
  box-shadow: var(--shadow-cinnabar);
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== Version Info ========== */
.version-info {
  padding: var(--spacing-4) var(--spacing-3);
  border-top: 1px solid var(--color-tan-light);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.version-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-brown-muted);
  margin: 0;
  font-family: var(--font-ui);
}

.version-subtitle {
  font-size: var(--text-micro);
  color: var(--color-brown-muted);
  margin: 0;
  opacity: 0.7;
  font-family: var(--font-ui);
}

/* ========== Main Content ========== */
.main-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  background: var(--color-parchment);
  padding: var(--spacing-6);
}

/* ========== Mobile Header ========== */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--navbar-height);
  background: var(--color-cream);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
  z-index: 999;
  box-shadow: 0 1px 0 var(--color-tan-light);
  border-bottom: 3px solid var(--color-cinnabar);
}

.hamburger-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.hamburger-icon {
  width: 24px;
  height: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger-line {
  width: 100%;
  height: 2px;
  background: var(--color-brown);
  border-radius: 1px;
  transition: all var(--transition-normal);
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.mobile-logo-seal {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-cinnabar);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-logo-icon {
  font-size: 20px;
  color: #fff;
}

.mobile-title {
  font-size: 20px;
  font-weight: 400;
  color: var(--color-brown-dark);
  font-family: var(--font-calligraphy);
  letter-spacing: 2px;
}

.mobile-header-spacer {
  width: 44px;
  flex-shrink: 0;
}

/* ========== Overlay ========== */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

/* ========== Mobile Sidebar ========== */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    z-index: 1001;
    transition: transform var(--transition-slow);
    will-change: transform;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .mobile-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--color-cream-dark);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .mobile-close-btn:hover {
    background: var(--color-cream-darker);
  }

  .close-icon {
    font-size: 24px;
    color: var(--color-brown);
    line-height: 1;
  }

  .main-content {
    padding-top: var(--navbar-height);
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
  }
}

/* ========== Tablet ========== */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: var(--spacing-6);
  }
}

/* ========== Mobile Nav Items ========== */
@media (max-width: 768px) {
  .nav-item {
    min-height: 48px;
    padding: 14px 16px;
  }

  .nav-icon {
    font-size: 22px;
    width: 22px;
    height: 22px;
  }

  .nav-text {
    font-size: 15px;
  }
}

/* ========== Transitions ========== */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform var(--transition-slow);
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity var(--transition-slow);
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
