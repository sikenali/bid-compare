import { createRouter, createWebHistory } from 'vue-router'
import UploadView from '../views/UploadView.vue'
import FileCompare from '../components/FileCompare.vue'
import FileCompareResult from '../components/FileCompareResult.vue'
import PropertyCheck from '../components/PropertyCheck.vue'
import PropertyCheckResult from '../components/PropertyCheckResult.vue'
import ImageCompare from '../components/ImageCompare.vue'
import BatchCompare from '../components/BatchCompare.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/',
    component: UploadView,
    meta: { title: '文比星 - 文档智能对比平台' }
  },
  {
    path: '/file-compare',
    name: 'FileCompare',
    component: FileCompare,
    meta: { title: '文比星 - 文件对比' }
  },
  {
    path: '/file-compare-result/:resultId',
    name: 'FileCompareResult',
    component: FileCompareResult,
    meta: { title: '文比星 - 对比结果' }
  },
  {
    path: '/property-check',
    name: 'PropertyCheck',
    component: PropertyCheck,
    meta: { title: '文比星 - 属性检查' }
  },
  {
    path: '/property-check-result/:resultId',
    name: 'PropertyCheckResult',
    component: PropertyCheckResult,
    meta: { title: '文比星 - 属性检查结果' }
  },
  {
    path: '/image-compare',
    name: 'ImageCompare',
    component: ImageCompare,
    meta: { title: '文比星 - 图片对比' }
  },
  {
    path: '/batch-compare',
    name: 'BatchCompare',
    component: BatchCompare,
    meta: { title: '文比星 - 批量对比' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { title: '文比星 - 设置中心' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
