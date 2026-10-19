import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/trendlens-pro/',
  server: {
    proxy: {
      '/bybit-demo': {
        target: 'https://api-demo.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-demo/, '')
      },
      '/bybit-testnet': {
        target: 'https://api-testnet.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-testnet/, '')
      },
      '/bybit-main': {
        target: 'https://api.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-main/, '')
      }
    }
  }
})
