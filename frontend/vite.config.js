import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// În dev, cererile către /api merg la FastAPI (uvicorn main:app --reload, portul 8000).
// Pentru alt server, setează VITE_API_URL în .env (ex: VITE_API_URL=http://localhost:8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
});
