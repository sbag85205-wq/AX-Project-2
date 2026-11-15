import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stampAssets} from '../stamp-assets.mjs';

const source=fileURLToPath(new URL('../public/',import.meta.url));

test('원본에는 해시가 없고, 복사본에만 모든 모듈·스타일 경로에 내용 해시가 붙는다', t=>{
 for(const f of fs.readdirSync(source).filter(f=>f.endsWith('.js')).concat('cat/index.html'))
  assert.doesNotMatch(fs.readFileSync(path.join(source,f),'utf8'),/\?v=[a-f0-9]+/,f);
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'nyang-stamp-'));
 t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 fs.cpSync(source,out,{recursive:true,filter:p=>!p.includes(`${path.sep}knowly`)});
 const {app}=stampAssets(out);
 assert.match(app,/^[a-f0-9]{12}$/);
 // app.js에서 닿는 모든 상대 import가 있는 파일을 가리키고 해시가 붙어 있다.
 const seen=new Set(),queue=[path.join(out,'app.js')];
 while(queue.length){
  const file=queue.pop();if(seen.has(file))continue;seen.add(file);
  for(const [,rel,stamp] of fs.readFileSync(file,'utf8').matchAll(/from\s*['"](\.\.?\/[^'"?]+\.js)(\?v=[a-f0-9]{12})?['"]/g)){
   const dep=path.resolve(path.dirname(file),rel);
   assert.ok(stamp,`${path.basename(file)} → ${rel} 해시 없음`);assert.ok(fs.existsSync(dep),`${rel} 없음`);queue.push(dep);
  }
 }
 assert.ok(seen.size>10);
 const html=fs.readFileSync(path.join(out,'cat/index.html'),'utf8');
 assert.match(html,new RegExp(`<script type="module" src="\\.\\./app\\.js\\?v=${app}"></script>`));
 for(const [,href] of html.matchAll(/(?:href|src)="(\.\.\/[^"]+\.(?:css|js)[^"]*)"/g))assert.match(href,/\?v=[a-f0-9]{12}$/,href);
});
