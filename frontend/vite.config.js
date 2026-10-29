import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: frontend gọi /api và /socket.io -> backend port 4000.
// Khi build production, đặt VITE_API_BASE hoặc cấu hình reverse proxy (nginx).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
