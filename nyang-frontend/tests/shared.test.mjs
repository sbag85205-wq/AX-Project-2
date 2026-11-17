import test from 'node:test';
import assert from 'node:assert/strict';
import {esc,CURRENT_CATEGORY_IDS,FIXED_CATEGORY_IDS,isCustomCategoryId,isCategoryId,HELPFUL_POINTS} from '../public/shared.js';
// 여러 파일에 복사돼 있던 예전 코드를 그대로 옮겨 두고, 공용(shared.js) 결과가 완전히 같은지 확인한다.
const oldEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oldFixed=new Set(['server','client','trouble','etc','hr','pay','trip','life']);
const oldHistoryHas=id=>oldFixed.has(id)||(typeof id==='string'&&/^custom:.{1,30}$/.test(id));          // chat-history.js·activity-history.js
const oldPostOk=c=>['server','client','trouble','etc','hr','pay','trip','life'].includes(c)||/^custom:.{1,30}$/.test(String(c)); // lib/community.mjs
const inputs=['server','client','trouble','etc','hr','pay','trip','life','custom:인사','custom:','custom:'+'가'.repeat(30),'custom:'+'가'.repeat(31),'Custom:a','x custom:a','custom:a\n','',' server',
 null,undefined,0,1,NaN,true,false,{},[],['server'],['custom:a'],'<b>"\'&</b>','a&amp;b','constructor','__proto__','toString','안녕 <script>',`'`,'"'];
test('esc가 예전과 같다',()=>{for(const x of inputs)assert.equal(esc(x),oldEsc(x),String(x));});
test('대화·질문 기록의 분야 검사가 예전과 같다',()=>{for(const x of inputs)assert.equal(isCategoryId(x),oldHistoryHas(x),String(x));});
test('게시판 글 분야 검사(community.mjs 방식)가 예전과 같다',()=>{
 for(const x of inputs)assert.equal(FIXED_CATEGORY_IDS.includes(x)||isCustomCategoryId(String(x)),oldPostOk(x),String(x));
});
test('분야 목록·유익해요 포인트가 예전 값과 같다',()=>{
 assert.deepEqual(CURRENT_CATEGORY_IDS,['server','client','trouble','etc']);
 assert.deepEqual(FIXED_CATEGORY_IDS,['server','client','trouble','etc','hr','pay','trip','life']);
 assert.equal(HELPFUL_POINTS,10);
});

test('불러오는 중 표시: 네 발로 걷는 냥대리와 글(끝의 점은 떼고 움직이는 점으로), 글자는 HTML로 해석하지 않는다',async()=>{
 const {loadingHTML}=await import('../public/shared.js');
 const html=loadingHTML('통계를 불러오고 있어요…');
 assert.match(html,/class="nyang-loading" role="status"/);assert.match(html,/nyang-loading-walker"><svg class="walking-cat"/);
 // 네 발: 다리 4개(대각선 두 쌍 wc-a·wc-b), 머리·몸·꼬리·사원증
 const {WALKING_CAT_SVG}=await import('../public/shared.js');
 assert.equal((WALKING_CAT_SVG.match(/class="wc-leg wc-a"/g)||[]).length,2);assert.equal((WALKING_CAT_SVG.match(/class="wc-leg wc-b"/g)||[]).length,2);
 for(const part of ['wc-head','wc-body','wc-tail','wc-badge'])assert.match(WALKING_CAT_SVG,new RegExp(`class="${part}"`));
 assert.match(html,/<p>통계를 불러오고 있어요<span class="nyang-loading-dots"/);
 assert.match(loadingHTML('불러오는 중...'),/<p>불러오는 중<span/);assert.match(loadingHTML('x',{compact:true}),/class="nyang-loading compact"/);
 assert.doesNotMatch(loadingHTML('<img src=x>'),/<img/);assert.match(loadingHTML(),/<p>불러오는 중<span/);
});
