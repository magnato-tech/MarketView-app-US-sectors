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
        },
        middlewareMode: false
      },
      plugins: [
        react(),
        {
          name: 'local-factory-api',
          configureServer(server) {
            server.middlewares.use('/api/factory/run', async (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                return;
              }

              try {
                let body = '';
                req.on('data', (chunk) => {
                  body += chunk.toString();
                });
                await new Promise<void>((resolve) => req.on('end', () => resolve()));
                const parsed = body ? JSON.parse(body) : {};

                const module = await import('./lib/factory/EvolutionCycle.ts');
                const result = await module.runFactoryEvolutionCycle({
                  symbol: parsed.symbol,
                  period: parsed.period,
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: error instanceof Error ? error.message : 'Factory cycle failed',
                  })
                );
              }
            });
          },
        },
      ],
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
