// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Every request starting with /api gets forwarded to your backend
      '/api': {
        target: 'http://localhost:5000',  
        changeOrigin: true,
        secure: false,
      },
    },
  },
});