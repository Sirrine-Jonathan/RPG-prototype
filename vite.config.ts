import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'level-editor': resolve(__dirname, 'sandbox/level-editor/index.html')
      }
    }
  },
  server: {
    port: 4200,
    open: '/'
  }
})