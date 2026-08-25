import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Geto Student',
        short_name: 'Geto',
        description: 'Malazi ya wanafunzi yanayothibitishwa Tanzania',
        theme_color: '#1a4b8f',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['education', 'lifestyle'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
          {
            urlPattern: /^\/uploads\//,
            handler: 'CacheFirst',
            options: { cacheName: 'uploads-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api':      { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads':  { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
