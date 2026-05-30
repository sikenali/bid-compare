<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RiExchangeLine, RiFileLine, RiFileInfoLine, RiSettings3Line, RiCpuLine, RiFileExcelLine } from '@remixicon/vue'

const route = useRoute()
const router = useRouter()

// 移动端菜单状态
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

// 检测屏幕尺寸
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

// 切换移动端菜单
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 关闭菜单
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// ESC 键关闭菜单
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

// 生命周期钩子
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeydown)
})

// 计算当前激活的菜单
const activeMenu = computed(() => {
  if (route.path === '/file-compare' || route.path === '/file-compare-result') return 'file-compare'
  if (route.path === '/property-check' || route.path === '/property-check-result') return 'property-check'
  if (route.path === '/hardware-info') return 'hardware-info'
  if (route.path === '/settings') return 'system-settings'
  if (route.path === '/batch-compare') return 'batch-compare'
  return 'file-compare'
})

// 处理菜单点击事件，跳转到对应路由
const handleMenuClick = (menu: string) => {
  switch (menu) {
    case 'file-compare':
      router.push('/file-compare')
      break
    case 'property-check':
      router.push('/property-check')
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
  // 移动端点击菜单后自动关闭
  closeMobileMenu()
}
</script>

<template>
  <div class="app-container">
    <!-- 移动端顶部导航栏 -->
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
        <span class="mobile-title">文件对对碰</span>
      </div>
      <div class="mobile-header-spacer"></div>
    </header>

    <!-- 遮罩层 -->
    <Transition name="overlay">
      <div v-if="isMobile && isMobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
    </Transition>

    <!-- 侧边导航栏 -->
    <Transition name="sidebar">
      <aside v-show="isMobile ? isMobileMenuOpen : true" class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
        <!-- 移动端关闭按钮 -->
        <button v-if="isMobile" class="mobile-close-btn" @click="closeMobileMenu" aria-label="关闭菜单">
          <span class="close-icon">×</span>
        </button>

        <!-- Logo区域 -->
        <div class="logo-section">
          <div class="logo-icon">
            <div class="logo-seal">
              <RiExchangeLine class="logo-icon-svg" />
            </div>
          </div>
          <h1 class="logo-title">文件对对碰</h1>
          <p class="logo-subtitle">智能文档比对工具</p>
        </div>

        <!-- 导航菜单 -->
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

        <!-- 底部版本信息 -->
        <div class="version-info">
          <p class="version-title">@2026 sikenali</p>
          <p class="version-subtitle">Vibe Coding</p>
        </div>
      </aside>
    </Transition>

    <!-- 主内容区域 -->
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
  font-family: SourceHanSans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: rgba(248, 244, 233, 1);
  overflow: hidden;
}

/* 侧边导航栏 */
.sidebar {
  width: 220px;
  height: 100%;
  background-color: rgba(44, 24, 16, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Logo区域 */
.logo-section {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.logo-icon {
  margin-bottom: 8px;
}

.logo-seal {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(139, 0, 0, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
  position: relative;
}

.logo-seal::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.logo-icon-svg {
  font-size: 28px;
  color: rgba(255, 255, 255, 1);
}

.logo-seal:hover {
  box-shadow: 0 6px 20px rgba(139, 0, 0, 0.4);
  transform: scale(1.1);
}

.logo-title {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  margin: 0 0 4px 0;
  font-family: SourceHanSans-Bold;
  letter-spacing: 1px;
}

.logo-subtitle {
  font-size: 13px;
  color: rgba(139, 100, 60, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
  letter-spacing: 0.5px;
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  text-align: left;
  font-family: SourceHanSans-Medium;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
}

.nav-item.active {
  background-color: rgba(139, 0, 0, 1);
  color: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.3);
}

.nav-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部版本信息 */
.version-info {
  padding: 16px 12px;
  border-top: 1px solid rgba(166, 124, 82, 0.2);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-SemiBold;
}

.version-subtitle {
  font-size: 12px;
  color: rgba(166, 124, 82, 0.8);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  background-color: rgba(248, 244, 233, 1);
  padding: 24px;
  padding-left: 24px;
  display: block;
}

/* 移动端顶部导航栏 */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: rgba(44, 24, 16, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  background-color: rgba(255, 255, 255, 1);
  border-radius: 1px;
  transition: all 0.3s ease;
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: center;
}

.mobile-logo-seal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(139, 0, 0, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-logo-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 1);
}

.mobile-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  font-family: SourceHanSans-Bold;
  letter-spacing: 1px;
}

.mobile-header-spacer {
  width: 44px;
  flex-shrink: 0;
}

/* 遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 侧边栏移动端样式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-100%);
    z-index: 1001;
    transition: transform 0.3s ease;
    will-change: transform;
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
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .mobile-close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-icon {
    font-size: 24px;
    color: rgba(255, 255, 255, 1);
    line-height: 1;
  }

  .main-content {
    padding-top: 60px;
    padding-left: 16px;
    padding-right: 16px;
  }
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 24px;
  }
}

/* 导航菜单项移动端优化 */
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

/* Transition 动画 */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
