<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RiExchangeLine, RiFileLine, RiSearchLine, RiSettings3Line, RiCpuLine } from '@remixicon/vue'

const route = useRoute()
const router = useRouter()

// 计算当前激活的菜单
const activeMenu = computed(() => {
  if (route.path === '/file-compare' || route.path === '/file-compare-result') return 'file-compare'
  if (route.path === '/property-check' || route.path === '/property-check-result') return 'property-check'
  if (route.path === '/hardware-info') return 'hardware-info'
  if (route.path === '/settings') return 'system-settings'
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
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 侧边导航栏 -->
    <aside class="sidebar">
      <!-- Logo区域 -->
      <div class="logo-section">
        <div class="logo-icon">
          <div class="logo-seal">
            <span class="seal-text">对对碰</span>
          </div>
        </div>
        <h1 class="logo-title">文件对对碰</h1>
        <p class="logo-subtitle">智能文档比对工具</p>
      </div>

      <!-- 导航菜单 -->
      <nav class="nav-menu">
        <!-- 核心功能 -->
        <div class="nav-group">
          <div class="nav-group-title">核心功能</div>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'file-compare' }"
            @click="handleMenuClick('file-compare')"
          >
            <RiFileLine class="nav-icon" />
            <span class="nav-text">文件对比</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeMenu === 'property-check' }"
            @click="handleMenuClick('property-check')"
          >
            <RiSearchLine class="nav-icon" />
            <span class="nav-text">属性检查</span>
          </button>
        </div>

        <!-- 系统功能 -->
        <div class="nav-group">
          <div class="nav-group-title">系统功能</div>
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
        </div>
      </nav>

      <!-- 底部版本信息 -->
      <div class="version-info">
        <p>V1.0.0</p>
      </div>
    </aside>

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
  width: 250px;
  height: 100%;
  background-color: rgba(44, 24, 16, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}

/* Logo区域 */
.logo-section {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
}

.logo-icon {
  margin-bottom: 12px;
}

.logo-seal {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(196, 30, 58, 1) 0%, rgba(139, 0, 0, 1) 100%);
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

.seal-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 1);
  font-family: SourceHanSans-Bold;
}

.logo-title {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  margin: 0 0 4px 0;
  font-family: SourceHanSans-Bold;
  letter-spacing: 2px;
}

.logo-subtitle {
  font-size: 12px;
  color: rgba(216, 191, 156, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
  letter-spacing: 1px;
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.nav-group {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-group-title {
  padding: 0 8px 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(166, 124, 82, 1);
  font-family: SourceHanSans-SemiBold;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(166, 124, 82, 0.2);
  margin-bottom: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
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
  font-size: 20px;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  font-weight: 500;
}

/* 底部版本信息 */
.version-info {
  padding: 20px;
  border-top: 1px solid rgba(166, 124, 82, 0.2);
  text-align: center;
}

.version-info p {
  font-size: 12px;
  color: rgba(166, 124, 82, 1);
  margin: 0;
  font-family: SourceHanSans-Regular;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
  background-color: rgba(248, 244, 233, 1);
  position: relative;
}
</style>
