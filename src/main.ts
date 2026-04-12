import { createApp } from 'vue'
import './assets/styles/variables.css'
import App from './App.vue'
import router from './router'
import icons from './plugins/icons'
import { vHighlightTooltip } from './directives/highlightTooltip'

// 创建Vue应用实例
const app = createApp(App)

// 使用路由
app.use(router)

// 使用图标插件
app.use(icons)

// 注册自定义指令
app.directive('highlight-tooltip', vHighlightTooltip)

// 挂载应用
app.mount('#app')
