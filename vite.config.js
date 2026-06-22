import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use './' so assets resolve correctly whether hosted at a custom domain
  // (e.g. demo.yourdomain.com) or the default github.io/repo-name path.
  base: './',
})
