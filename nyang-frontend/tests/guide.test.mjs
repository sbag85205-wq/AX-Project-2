import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GUIDE_STEPS,GUIDE_VERSION,guideText} from '../public/guide-steps.js';
import {placeBubble,shouldAutoStart} from '../public/guide.js';
import {esc} from '../public/shared.js';

test('가이드는 5~7단계이고 정해진 순서(인사→질문→답변→모를 때→피드백→메뉴→재미)를 따른다',()=>{
 assert.ok(GUIDE_STEPS.length>=5&&GUIDE_STEPS.length<=7);
 assert.deepEqual(GUIDE_STEPS.map(s=>s.id),['hello','ask','answer','unknown','feedback','menus','fun']);
 assert.ok(Number.isInteger(GUIDE_VERSION)&&GUIDE_VERSION>=1);
});

test('모든 단계는 제목이 있고 냥대리 말투(~냥)로 쓰였다',()=>{
 for(const s of GUIDE_STEPS){
  assert.ok(s.title,s.id);
  const lines=[s.body,...(s.points||[])].filter(Boolean);
  assert.ok(lines.length,s.id+': 본문이나 목록이 있어야 한다');
  for(const line of lines)assert.match(line,/냥[.!]?(\*\*)?$/,`${s.id}: "${line}"`);
 }
});

test('꼭 들어가야 할 안내가 빠지지 않았다',()=>{
 const all=GUIDE_STEPS.map(s=>[s.title,s.body,...(s.points||[])].join(' ')).join(' ');
 for(const word of ['사내 문서에 있는 내용만 근거로','분야 변경','질문 예시','출처','중요한 건 꼭 출처에서 확인','등록된 근거가 부족해요','지어내지 않는다','익명으로 질문하기','도움돼요 / 아쉬워요','내 일정','질문 게시판','저장한 답변','사내 문서','출석','포인트','레벨','츄르','꾸미기','차가운/따뜻한 모드','가이드'])
  assert.ok(all.includes(word),word);
});

test('가리키는 화면 요소가 실제 냥대리 화면(app.js)에 있다',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const exists={'.cat-art.resident':/cat\(\s*[^)]*'resident'|resident/,'#question-form':/id="question-form"/,'.workspace-nav':/class="workspace-nav/,'.workspace-utilities':/class="workspace-utilities"/};
 for(const s of GUIDE_STEPS.filter(s=>s.target))assert.match(app,exists[s.target],s.target);
 // 가이드 버튼은 따뜻한/차가운 모드 버튼 바로 옆에 있다
 assert.match(app,/id="personality-button"[^>]*>[^]*?<\/button><button data-action="guide" id="guide-button" aria-label="[^"]+"/);
});

test('guideText는 **굵게**만 살리고 나머지 HTML은 글자로 보여 준다',()=>{
 assert.equal(guideText('**출처**를 <b>보라</b>냥',esc),'<strong>출처</strong>를 &lt;b&gt;보라&lt;/b&gt;냥');
});

test('placeBubble: 좁은 화면은 아래쪽 카드, 넓은 화면은 화면 안에서 요소 아래·위·가운데',()=>{
 const vp={width:1280,height:800},b={width:380,height:300};
 assert.deepEqual(placeBubble({top:100,left:100,width:200,height:40},b,{width:390,height:800}),{mode:'sheet'});
 const center=placeBubble(null,b,vp);assert.equal(center.mode,'center');assert.equal(center.left,450);assert.equal(center.top,250);
 const below=placeBubble({top:100,left:400,width:200,height:40},b,vp);assert.equal(below.mode,'below');assert.equal(below.top,154);
 const above=placeBubble({top:700,left:400,width:200,height:60},b,vp);assert.equal(above.mode,'above');assert.equal(above.top,386);
 // 오른쪽 끝 요소: 말풍선이 화면 밖으로 나가지 않는다
 const right=placeBubble({top:20,left:1240,width:30,height:30},b,vp);assert.equal(right.left,1280-380-12);
 // 큰 요소(위아래 모두 자리 없음): 화면 안쪽에 겹쳐 띄운다
 const over=placeBubble({top:50,left:0,width:1280,height:700},b,vp);assert.equal(over.mode,'over');assert.ok(over.top>=12&&over.top+300<=800-12);
 // 말풍선이 화면보다 커도 왼쪽·위가 여백 안이다
 const huge=placeBubble(null,{width:2000,height:2000},vp);assert.equal(huge.left,12);assert.equal(huge.top,12);
});

test('shouldAutoStart: 계정이나 이 브라우저에 본 기록(다 봄·건너뜀)이 있으면 띄우지 않는다',()=>{
 assert.equal(shouldAutoStart(null,null),true);
 assert.equal(shouldAutoStart({version:GUIDE_VERSION,state:'done'},null),false);
 assert.equal(shouldAutoStart({version:GUIDE_VERSION,state:'skipped'},null),false);
 assert.equal(shouldAutoStart(null,{version:GUIDE_VERSION,state:'done'}),false);
 // 가이드 버전이 올라가면(문구 개편) 다시 보여 준다
 assert.equal(shouldAutoStart({version:GUIDE_VERSION,state:'done'},null,GUIDE_VERSION+1),true);
 assert.equal(shouldAutoStart({version:GUIDE_VERSION,state:'unknown'},null),true);
});
