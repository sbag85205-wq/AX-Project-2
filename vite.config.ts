import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * pdf.js가 한국어 표준 글꼴(CMap)·기본 글꼴·이미지 디코더를 읽을 수 있도록
 * node_modules/pdfjs-dist의 자료를 /pdfjs/ 아래에 배포한다. (없으면 한글 PDF에서 글자가 비어 나온다)
 */
function pdfjsAssets(): Plugin {
  const root = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));
  const dirs = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const rel = normalize(decodeURIComponent((req.url ?? '').split('?')[0])).replace(/^[/\\]+/, '');
        const file = join(root, rel);
        if (!dirs.includes(rel.split(/[/\\]/)[0]) || !file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const dir of dirs) {
        const abs = join(root, dir);
        if (!existsSync(abs)) continue;
        for (const name of readdirSync(abs)) {
          if (!statSync(join(abs, name)).isFile()) continue;
          this.emitFile({ type: 'asset', fileName: `pdfjs/${dir}/${name}`, source: readFileSync(join(abs, name)) });
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), pdfjsAssets()],
  test: { include: ['tests/**/*.test.ts'] }
} as never);
