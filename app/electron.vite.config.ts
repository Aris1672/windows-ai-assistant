import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['active-win']
      }
    }
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // Two preload scripts: one for the palette, one for the result window
        input: {
          index:  resolve('src/preload/index.ts'),
          result: resolve('src/preload/result.ts'),
        }
      }
    }
  },

  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        // Two renderer entry points: palette + result window
        input: {
          index:  resolve('src/renderer/index.html'),
          result: resolve('src/renderer/result.html'),
        }
      }
    }
  }
})
