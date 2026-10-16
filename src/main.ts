import { createApp } from 'vue'
import './assets/styles/variables.css'
import './assets/styles/shared.css'
import App from './App.vue'
import router from './router'
import icons from './plugins/icons'
import { vHighlightTooltip } from './directives/highlightTooltip'

// 全局错误处理
const handleError = (err: Error, instance: any, info: string) => {
  console.error('[全局错误]', err, info)
  // 可以在这里添加错误上报或用户提示
}

// 创建Vue应用实例
const app = createApp(App)

// 设置全局错误处理器
app.config.errorHandler = handleError

// 使用路由
app.use(router)

// 使用图标插件
app.use(icons)

// 注册自定义指令
app.directive('highlight-tooltip', vHighlightTooltip)

// 挂载应用
app.mount('#app')

// 捕获未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('[未处理的Promise拒绝]', event.reason)
})
