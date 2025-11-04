import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sandbox: resolve(__dirname, 'sandbox/index.html'),
        'ai-indicator': resolve(__dirname, 'sandbox/ai-indicator/index.html'),
        conversation: resolve(__dirname, 'sandbox/conversation/index.html'),
        'police-station': resolve(__dirname, 'sandbox/police-station/index.html'),
        'tool-system': resolve(__dirname, 'sandbox/tool-system/index.html'),
        'idle-behavior': resolve(__dirname, 'sandbox/idle-behavior/index.html'),
        'player-mechanics': resolve(__dirname, 'sandbox/player-mechanics/index.html')
      }
    }
  },
  server: {
    port: 4200,
    open: '/'
  }
})