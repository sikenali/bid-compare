import { createRouter, createWebHashHistory } from 'vue-router'
import FileCompare from '../components/FileCompare.vue'
import FileCompareResult from '../components/FileCompareResult.vue'
import PropertyCheck from '../components/PropertyCheck.vue'
import PropertyCheckResult from '../components/PropertyCheckResult.vue'
import HardwareInfo from '../components/HardwareInfo.vue'
import SystemSettings from '../components/SystemSettings.vue'
import BatchCompare from '../components/BatchCompare.vue'

const routes = [
  {
    path: '/',
    redirect: '/file-compare'
  },
  {
    path: '/file-compare',
    name: 'FileCompare',
    component: FileCompare,
    meta: { title: '文件对对碰 - 文件对比' }
  },
  {
    path: '/file-compare-result',
    name: 'FileCompareResult',
    component: FileCompareResult,
    meta: { title: '文件对对碰 - 对比结果' }
  },
  {
    path: '/property-check',
    name: 'PropertyCheck',
    component: PropertyCheck,
    meta: { title: '文件对对碰 - 属性检查' }
  },
  {
    path: '/property-check-result',
    name: 'PropertyCheckResult',
    component: PropertyCheckResult,
    meta: { title: '文件对对碰 - 属性检查结果' }
  },
  {
    path: '/hardware-info',
    name: 'HardwareInfo',
    component: HardwareInfo,
    meta: { title: '文件对对碰 - 硬件信息' }
  },
  {
    path: '/settings',
    name: 'SystemSettings',
    component: SystemSettings,
    meta: {
      title: '文件对对碰 - 系统设置'
    }
  },
  {
    path: '/batch-compare',
    name: 'BatchCompare',
    component: BatchCompare,
    meta: { title: '文件对对碰 - 批量对比' }
  },
  // 404 通配符路由 - 重定向到首页
  {
    path: '/:pathMatch(.*)*',
    redirect: '/file-compare'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
