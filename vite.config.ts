import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY ?? '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/yahoo': {
            target: 'https://query1.finance.yahoo.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/yahoo/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
