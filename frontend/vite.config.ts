import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '5175'),
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
