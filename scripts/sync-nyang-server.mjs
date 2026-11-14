import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const out = new URL('supabase/functions/_shared/nyang/', root);
for (const name of ['demo-account', 'community']) {
  fs.writeFileSync(new URL(name+'.mjs', out), fs.readFileSync(new URL('nyang-frontend/lib/'+name+'.mjs', root), 'utf8').replace("'../public/companion.js'", "'./companion.mjs'"));
}
fs.writeFileSync(new URL('companion.mjs', out), fs.readFileSync(new URL('nyang-frontend/public/companion.js', root), 'utf8').replace(/'\.\/core.js[^']*'/, "'./core.mjs'"));
fs.copyFileSync(new URL('nyang-frontend/public/core.js', root), new URL('core.mjs', out));
