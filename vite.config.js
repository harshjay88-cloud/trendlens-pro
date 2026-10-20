import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Production keeps the /trendlens-pro/ project sub-path. A preview
  // deployment can override it with PREVIEW_BASE so the same bundle is
  // served from a different base URL. Unset (the production case) is
  // unchanged.
  base: process.env.PREVIEW_BASE || '/trendlens-pro/',
  server: {
    proxy: {
      // The frontend never talks to Bybit directly for authenticated calls.
      // Private Bybit Demo requests are relayed through the local demo proxy
      // (see /server), which holds the credentials server-side.
      '/api/bybit': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bybit/, '/api/bybit')
      }
    }
  }
})
