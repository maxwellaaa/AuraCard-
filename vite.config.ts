import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/deepseek-proxy': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/deepseek-proxy/, '')
      },
      '/openai-proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/openai-proxy/, '')
      },
      '/openrouter-proxy': {
        target: 'https://openrouter.ai/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/openrouter-proxy/, '')
      },
      '/dashscope-proxy': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/dashscope-proxy/, '')
      }
    }
  }
})
