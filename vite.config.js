import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/slides': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/slide-images': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: path.resolve(__dirname, 'frontend'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
    }
  },
  root: './frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});

