import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the board is served by Vite and /api is proxied to the
// FastAPI backend, so the browser sees one origin — the same shape nginx
// gives it in Docker and Azure.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Bound to 127.0.0.1 explicitly, with strictPort: on Windows a server on
  // ::1 can share a port with another app listening on ::, and the browser
  // then reaches the other app. Fail loudly instead of sharing a port.
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
    proxy: { '/api': { target: process.env.API_ORIGIN || 'http://localhost:8000', changeOrigin: true } },
  },
  preview: {
    host: '127.0.0.1',
    port: 5191,
    strictPort: true,
    proxy: { '/api': { target: process.env.API_ORIGIN || 'http://localhost:8000', changeOrigin: true } },
  },
})
