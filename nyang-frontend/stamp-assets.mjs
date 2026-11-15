// Version local scripts/styles by content so a newly loaded page uses matching assets.
// 원본 파일은 해시 없이(import './x.js') 두고, 배포용 복사본 폴더에만 ?v=<내용 해시>를 붙인다.
//   통합 앱: scripts/prepare-nyang.mjs가 public/nyang(커밋하지 않는 복사본)에 대해 stampAssets()를 부른다.
//   독립 프로토타입: `node stamp-assets.mjs [폴더]` (폴더를 주지 않으면 nyang-frontend/public을 그 자리에서 바꾼다)
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);

/**
 * base/app.js에서 시작해 가져오는 모든 모듈의 import 경로에, 그리고 base/cat/index.html의 css·js 경로에
 * 내용 해시를 붙인다. 아래쪽 모듈부터 붙이므로 깊은 곳 파일이 바뀌어도 위쪽 해시가 함께 바뀐다.
 * @returns {{app:string}} app.js 자체의 해시(통합 앱의 index.html이 이 주소로 app.js를 불러온다)
 */
export function stampAssets(base){
 const visited=new Set();
 function stampModule(file){
  if(visited.has(file))return;
  visited.add(file);
  const old=fs.readFileSync(file,'utf8');
  const next=old.replace(/(from\s*['"])(\.\.?\/[^'"]+\.js)(?:\?v=[a-f0-9]+)?(['"])/g,(_,prefix,relative,end)=>{
   const dep=path.resolve(path.dirname(file),relative);stampModule(dep);
   return `${prefix}${relative}?v=${digest(dep)}${end}`;
  });
  if(next!==old)fs.writeFileSync(file,next);
 }
 const app=path.join(base,'app.js');
 stampModule(app);
 const entry=path.join(base,'cat/index.html');
 const old=fs.readFileSync(entry,'utf8');
 const next=old.replace(/((?:href|src)=")(\.\.\/[^"?]+\.(?:css|js))(?:\?v=[a-f0-9]+)?"/g,(_,prefix,relative)=>`${prefix}${relative}?v=${digest(path.resolve(path.dirname(entry),relative))}"`);
 if(next!==old)fs.writeFileSync(entry,next);
 return {app:digest(app)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'public'));
 stampAssets(base);
 console.log('Versioned local scripts, module imports, and stylesheets in '+base);
}
