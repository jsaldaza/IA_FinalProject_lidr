/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Backend corriendo en puerto 3000
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  optimizeDeps: {
    include: ['hoist-non-react-statics'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
          tanstack: ['@tanstack/react-query'],
          recharts: ['recharts'],
          axios: ['axios'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
