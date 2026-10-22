import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const BACKEND = process.env.VITE_DEV_API ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a new service worker waits until the app is next opened. It must never reload the page
      // under someone in the middle of a review.
      registerType: 'prompt',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Flashcards',
        short_name: 'Flashcards',
        description: 'Learn French vocabulary with spaced repetition.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF8F5',
        theme_color: '#2F5BEA',
        categories: ['education'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // Client-side routes fall back to the cached shell, but the API is never intercepted or cached:
        // its responses are per-user and must always come from the server.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/health/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // In development the API is proxied, so the app is same-origin there too (no CORS needed).
  server: { proxy: { '/api': BACKEND, '/health': BACKEND } },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
});
