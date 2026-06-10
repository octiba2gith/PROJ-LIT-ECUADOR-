import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-catalog' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const { books, designConfig } = JSON.parse(body);
                const fs = await import('fs');
                const path = await import('path');

                if (books && Array.isArray(books)) {
                  const fileContent = `import { Book } from './types';\n\nexport const INITIAL_BOOKS: Book[] = ${JSON.stringify(books, null, 2)};\n`;
                  fs.writeFileSync(path.resolve('./src/data.ts'), fileContent, 'utf-8');
                }

                if (designConfig) {
                  const typesPath = path.resolve('./src/types.ts');
                  let typesContent = fs.readFileSync(typesPath, 'utf-8');
                  const regex = /(export const defaultDesignConfig: LayoutDesignConfig = )\{[\s\S]*?\};/;
                  typesContent = typesContent.replace(regex, `$1${JSON.stringify(designConfig, null, 2)};`);
                  fs.writeFileSync(typesPath, typesContent, 'utf-8');
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: '¡Datos de libros y diseño persistidos como predeterminados del servidor!' }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err?.message || 'Error guardando datos en servidor' }));
              }
            });
            return;
          }
          next();
        });
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
