/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/corrida-do-gustavo/';
const THEME = '#1E88E5';

export default defineConfig({
  base: BASE,
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Os arquivos de public/ já entram pelo globPatterns abaixo.
      includeManifestIcons: false,
      manifest: {
        name: 'Corrida do Gustavo',
        short_name: 'Corrida',
        description: 'Corrida de carrinho em 3 faixas para montar o nome GUSTAVO letra por letra, sem propagandas.',
        lang: 'pt-BR',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: THEME,
        theme_color: THEME,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // O Three.js (3D) sozinho já passa de 500 kB.
  build: { chunkSizeWarningLimit: 800 },
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
