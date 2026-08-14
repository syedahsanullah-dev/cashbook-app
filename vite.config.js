import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // 1. Import the plugin

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // 2. Add the configuration
      registerType: 'autoUpdate', // Automatically updates the app when you push code changes
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'CashBook Ledger',
        short_name: 'CashBook',
        description: 'Manage your daily expenses and income ledger',
        theme_color: '#1e3a8a', // Matches your Brand Blue
        background_color: '#f3f4f6', // Matches your Main Background
        display: 'standalone', // Hides browser UI to make it look like a native app
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Vital for clean circle/square icons on Android
          }
        ]
      }
    })
  ]
});