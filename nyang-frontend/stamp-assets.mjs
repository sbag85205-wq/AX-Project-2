// Version local scripts/styles by content so a newly loaded page uses matching assets.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const base=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
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
stampModule(path.join(base,'app.js'));
const entry=path.join(base,'cat/index.html');
const old=fs.readFileSync(entry,'utf8');
const next=old.replace(/((?:href|src)=")(\.\.\/[^"]+\.(?:css|js))(?:\?v=[a-f0-9]+)?"/g,(_,prefix,relative)=>`${prefix}${relative}?v=${digest(path.resolve(path.dirname(entry),relative))}"`);
if(next!==old)fs.writeFileSync(entry,next);
console.log('Versioned local scripts, module imports, and stylesheets.');
