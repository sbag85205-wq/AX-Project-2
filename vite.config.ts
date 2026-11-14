import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * pdf.js가 한국어 표준 글꼴(CMap)·기본 글꼴·이미지 디코더를 읽을 수 있도록
 * node_modules/pdfjs-dist의 자료를 <base>/pdfjs/ 아래에 배포한다. (없으면 한글 PDF에서 글자가 비어 나온다)
 * PDF를 다루는 Knowly 화면은 embed 빌드(vite.embed.config.ts, /knowly/pdfjs/)에만 있으므로 거기서만 쓴다.
 */
export function pdfjsAssets(): Plugin {
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

// 사이트 첫 화면(냥대리, index.html → src/nyang/main.ts) 빌드와 단위 테스트 설정.
// 냥대리는 pdf.js를 쓰지 않으므로 /pdfjs/ 자료(약 4MB)를 배포하지 않는다.
export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] }
});
