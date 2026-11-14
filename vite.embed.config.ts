// 냥대리(nyang-frontend) 안에 넣는 Knowly 화면 빌드: npm run build:nyang-embed
// Knowly 화면 코드는 그대로 쓰고, 로그인 모듈(lib/supabase·lib/auth)만 냥대리 세션을 쓰는 src/embed 버전으로 바꾼다.
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import base from './vite.config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const SWAP: Record<string, string> = {
  [here('./src/lib/supabase.ts')]: here('./src/embed/supabase.ts'),
  [here('./src/lib/auth.tsx')]: here('./src/embed/auth.tsx')
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
    rollupOptions: {
      input: { index: here('./knowly-embed.html'), attach: here('./src/embed/attach.ts') },
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: (chunk) => (chunk.name === 'attach' ? 'attach.js' : 'assets/[name]-[hash].js') }
    }
  }
});
