import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This forwards frontend '/api' calls to your running backend server port
      '/api': {
        target: 'http://localhost:5000', // <-- Replace 5000 with your actual backend port!
        changeOrigin: true,
        secure: false,
      },
    },
  },
});