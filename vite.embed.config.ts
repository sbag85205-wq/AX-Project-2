// 냥대리 화면 안(iframe)에 넣는 Knowly 화면 빌드: knowly-embed.html → public/knowly/index.html
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { pdfjsAssets } from './vite.config.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** 냥대리가 /knowly/index.html로 여므로, 빌드한 knowly-embed.html을 index.html 이름으로 낸다 (watch 빌드에서도) */
function embedIndexHtml(): Plugin {
  return {
    name: 'knowly-embed-index-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const page = bundle['knowly-embed.html'];
      if (page) page.fileName = 'index.html';
    }
  };
}

export default defineConfig({
  base: '/knowly/', publicDir: false,
  plugins: [react(), pdfjsAssets(), embedIndexHtml()],
  build: {
    outDir: 'public/knowly', emptyOutDir: true,
    rollupOptions: {
      input: { index: here('./knowly-embed.html'), attach: here('./src/embed/attach.ts') },
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: chunk => chunk.name === 'attach' ? 'attach.js' : 'assets/[name]-[hash].js' }
    }
  }
});
