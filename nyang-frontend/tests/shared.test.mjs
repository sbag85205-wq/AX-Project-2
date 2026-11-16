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
