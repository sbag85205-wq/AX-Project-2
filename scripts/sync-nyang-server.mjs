// 냥대리 규칙 코드(nyang-frontend/lib, public)를 서버 함수(supabase/functions/_shared/nyang)로 복사한다.
// Edge Function은 supabase/functions 아래 파일만 배포되므로 복사본이 필요하다.
//   node scripts/sync-nyang-server.mjs          복사본을 새로 만든다
//   node scripts/sync-nyang-server.mjs --check  복사본이 원본과 같은지만 확인한다(다르면 실패)
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const out = new URL('supabase/functions/_shared/nyang/', root);
const note = (from) => `// 자동 복사본입니다. 직접 고치지 말고 ${from} 를 고친 뒤 \`npm run sync:nyang-server\`를 실행하세요.\n`;
// [원본, 복사본 이름]. 가져오는 경로를 복사본끼리 가리키도록 바꾸고, 브라우저용 버전 표시(?v=)는 뗀다.
const files = [
  ['nyang-frontend/lib/demo-account.mjs', 'demo-account.mjs'],
  ['nyang-frontend/lib/community.mjs', 'community.mjs'],
  ['nyang-frontend/public/companion.js', 'companion.mjs'],
  ['nyang-frontend/public/core.js', 'core.mjs'],
  ['nyang-frontend/public/shared.js', 'shared.mjs']
];
const rewrite = (text) => text.replace(/'(?:\.\.\/public|\.)\/(companion|core|shared)\.js(?:\?v=[0-9a-f]+)?'/g, "'./$1.mjs'");
let stale = 0;
for (const [from, name] of files) {
  const next = note(from) + rewrite(fs.readFileSync(new URL(from, root), 'utf8'));
  const target = new URL(name, out);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== next) { console.error(`복사본이 원본과 달라요: supabase/functions/_shared/nyang/${name} (원본 ${from})`); stale++; }
  } else fs.writeFileSync(target, next);
}
if (stale) { console.error('`npm run sync:nyang-server`를 실행해 주세요.'); process.exit(1); }
