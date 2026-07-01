import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/verify-review':    { target: 'http://localhost:8001', changeOrigin: true },
      '/analyze-batch':    { target: 'http://localhost:8001', changeOrigin: true },
      '/upload-csv':       { target: 'http://localhost:8001', changeOrigin: true },
      '/product-trust':    { target: 'http://localhost:8001', changeOrigin: true },
      '/simulate-bombing': { target: 'http://localhost:8001', changeOrigin: true },
      '/dashboard-stats':  { target: 'http://localhost:8001', changeOrigin: true },
      '/health':           { target: 'http://localhost:8001', changeOrigin: true },
      '/ws':               { target: 'ws://localhost:8001',   changeOrigin: true, ws: true },
    }
  }
})
