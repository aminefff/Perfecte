
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'المتميز التعليمي',
        short_name: 'المتميز',
        description: 'رفيقك الذكي للنجاح في البكالوريا',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://i.ibb.co/bjLDwBbd/IMG-20250722-114332.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://i.ibb.co/bjLDwBbd/IMG-20250722-114332.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 3000
  }
});
