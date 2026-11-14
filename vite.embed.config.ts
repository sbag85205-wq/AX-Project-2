// Reuse main's pages and its individual Supabase Auth session inside Nyang.
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import base from './vite.config.ts';
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pdfjsAssets = (base as { plugins: Plugin[] }).plugins.find(p => p && p.name === 'pdfjs-assets');
export default defineConfig({
  base: '/knowly/', publicDir: false,
  plugins: [react(), pdfjsAssets!],
  build: {
    outDir: 'public/knowly', emptyOutDir: true,
    rollupOptions: {
      input: { index: here('./knowly-embed.html'), attach: here('./src/embed/attach.ts') },
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: chunk => chunk.name === 'attach' ? 'attach.js' : 'assets/[name]-[hash].js' }
    }
  }
});
