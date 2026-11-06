import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Power Apps code apps expect relative asset paths and the dev server on port 3000.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: '::', port: 3000 },
})
