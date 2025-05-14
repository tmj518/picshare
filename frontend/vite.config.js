import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upload': 'http://localhost:3000',
      '/api': 'http://localhost:3000'
    },
    // 由于Windows环境可能存在CORS问题，启用CORS配置
    cors: true
  },
  // 确保环境变量可以正确访问
  define: {
    'process.env': {}
  }
}) 