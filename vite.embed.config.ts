// 냥대리(nyang-frontend) 안에 넣는 Knowly 화면 빌드: npm run build:nyang-embed
// Knowly 화면 코드는 그대로 쓰고, Supabase 주소·키를 빌드 환경 변수 대신 냥대리 서버에서 받는 lib/supabase만 src/embed 버전으로 바꾼다.
// client.js: 냥대리 화면이 쓰는 Knowly 로그인·질문·평가·첨부 기능 (Knowly 코드 그대로).
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import base from './vite.config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const SWAP: Record<string, string> = {
  [here('./src/lib/supabase.ts')]: here('./src/embed/supabase.ts')
};

function swapAuth(): Plugin {
  return {
    name: 'knowly-embed-swap-auth',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || Object.values(SWAP).includes(importer.split('?')[0])) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && SWAP[resolved.id] ? SWAP[resolved.id] : null;
    }
  };
}

const pdfjsAssets = (base as { plugins: Plugin[] }).plugins.find((p) => p && p.name === 'pdfjs-assets');

export default defineConfig({
  base: '/knowly/',
  publicDir: false,
  plugins: [swapAuth(), react(), pdfjsAssets!],
  build: {
    outDir: 'nyang-frontend/public/knowly',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: { index: here('./knowly-embed.html'), client: here('./src/embed/client.ts') },
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: (chunk) => (chunk.name === 'client' ? 'client.js' : 'assets/[name]-[hash].js') }
    }
  }
});
