import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Relative base so the build works from any path (GitHub Pages project
// subpath, a custom domain, or even opened directly from disk).
export default defineConfig({
  plugins: [react()],
  base: './',
})
