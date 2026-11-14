import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
execFileSync(process.execPath, [`${root}/nyang-frontend/stamp-assets.mjs`]);
mkdirSync(`${root}/public/nyang`, { recursive: true });
cpSync(`${root}/nyang-frontend/public`, `${root}/public/nyang`, { recursive: true, filter: p => !p.includes('/knowly') && !p.includes('\\knowly') });
// The original frontend remains the source of truth; generated public files are ignored.
const html = readFileSync(`${root}/nyang-frontend/public/cat/index.html`, 'utf8')
  .replaceAll('../', '/nyang/')
  .replace(/<script type="module" src="[^"]*app.js[^"]*"><\/script>/, '<script type="module" src="/src/nyang/main.ts"></script>');
writeFileSync(`${root}/index.html`, html);
