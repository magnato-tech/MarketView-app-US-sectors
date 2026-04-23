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
            const parseBody = async (req: any) => {
              let body = '';
              req.on('data', (chunk: any) => {
                body += chunk.toString();
              });
              await new Promise<void>((resolve) => req.on('end', () => resolve()));
              return body ? JSON.parse(body) : {};
            };

            const handleRoute = async (req: any, res: any, handlerPath: string) => {
              try {
                const body = req.method === 'POST' || req.method === 'PATCH' ? await parseBody(req) : {};
                
                // Use Vite's ssrLoadModule to handle TypeScript and relative imports correctly
                // We use a path relative to the config file which Vite handles best
                const module = await server.ssrLoadModule(handlerPath);
                const handler = module.default;
                
                const vercelRes = {
                  status: (code: number) => {
                    res.statusCode = code;
                    return vercelRes;
                  },
                  json: (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  }
                };

                await handler({ method: req.method, body }, vercelRes);
              } catch (error) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }));
              }
            };

            server.middlewares.use('/api/factory/run', (req, res) => handleRoute(req, res, './api/factory/run.ts'));
            server.middlewares.use('/api/factory/components', (req, res) => handleRoute(req, res, './api/factory/components.ts'));
            server.middlewares.use('/api/factory/drafts', (req, res) => handleRoute(req, res, './api/factory/drafts.ts'));
            server.middlewares.use('/api/factory/published', (req, res) => handleRoute(req, res, './api/factory/published.ts'));
            server.middlewares.use('/api/factory/publish', (req, res) => handleRoute(req, res, './api/factory/publish.ts'));
            server.middlewares.use('/api/factory/deployments', (req, res) => handleRoute(req, res, './api/factory/deployments.ts'));
            server.middlewares.use('/api/factory/clone-to-draft', (req, res) => handleRoute(req, res, './api/factory/clone-to-draft.ts'));
            server.middlewares.use('/api/factory/send-to-factory', (req, res) => handleRoute(req, res, './api/factory/send-to-factory.ts'));
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
