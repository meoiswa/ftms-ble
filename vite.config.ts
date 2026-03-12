import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // BASE_PATH is injected by the GitHub Actions configure-pages step.
  // It resolves to '/' when a custom domain is active, or '/repo-name/' otherwise.
  base: process.env.BASE_PATH ?? '/',
})
