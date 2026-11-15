// 냥대리 화면 준비(npm run build·dev 전에 실행):
// 1) 원본 nyang-frontend/public을 public/nyang(생성물, 커밋하지 않음)으로 복사한다.
// 2) 복사본에만 내용 해시(?v=)를 붙인다. 원본 파일은 바꾸지 않는다.
// 3) 루트 index.html(생성물, 커밋하지 않음)을 복사본의 cat/index.html로 만들고, app.js 대신 /src/nyang/main.ts를 넣는다.
//    main.ts는 <meta name="nyang-app">에 적힌 해시 붙은 주소로 /nyang/app.js를 불러온다.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stampAssets } from '../nyang-frontend/stamp-assets.mjs';

const root = resolve(import.meta.dirname, '..');
const source = `${root}/nyang-frontend/public`;
const out = `${root}/public/nyang`;

// 지운 원본 파일이 남지 않도록 복사본을 새로 만든다. knowly/는 build:nyang-embed가 public/knowly에 따로 만든다.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(source, out, { recursive: true, filter: p => !p.includes('/knowly') && !p.includes('\\knowly') });
const { app } = stampAssets(out);

const fail = (message) => { throw new Error(`prepare-nyang: ${message}`); };
let html = readFileSync(`${out}/cat/index.html`, 'utf8');
// cat/ 기준 상대 경로(../style.css 등)를 루트 기준 /nyang/ 경로로 바꾼다(속성 값만).
html = html.replace(/((?:href|src)=")\.\.\//g, '$1/nyang/');
const appTag = /<script type="module" src="\/nyang\/app\.js\?v=[a-f0-9]+"><\/script>/g;
const found = html.match(appTag)?.length ?? 0;
if (found !== 1) fail(`cat/index.html에서 app.js <script type="module"> 태그를 1개 찾아야 하는데 ${found}개예요. 태그 모양이 바뀌었으면 이 스크립트도 고쳐 주세요.`);
if (html.split('</head>').length !== 2) fail('cat/index.html에 </head>가 1개 있어야 해요.');
html = html
  .replace(appTag, '<script type="module" src="/src/nyang/main.ts"></script>')
  .replace('</head>', `<meta name="nyang-app" content="/nyang/app.js?v=${app}"></head>`);
writeFileSync(`${root}/index.html`, html);
console.log(`prepare-nyang: public/nyang 준비, index.html 생성 (app.js?v=${app})`);
