import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@napi-rs/canvas': path.resolve(__dirname, 'src/shims/napi-canvas.ts')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5105,
    // Wujie 微前端通过 fetch 拉取子应用资源，必须放行跨域
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
})
