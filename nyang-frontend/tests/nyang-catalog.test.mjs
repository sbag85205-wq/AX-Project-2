import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalog,normalizeCatalog,allReactions,activeReactions,createCatalogPicker,selectSeason,idleLook,seasonImages,shopItems,neededImages} from '../public/nyang-catalog.js';
import {reactionPoses} from '../public/reaction-variety.js';

const lcg=(seed=7)=>()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
const withCustom=(extra={})=>normalizeCatalog({...emptyCatalog(),custom:{reactions:[{id:'c-new',mode:'warm',kind:'like',image:'img-aaaaaaaa1',line:'새 반응이다냥',mark:'새로 ♥'}],seasonImages:[],items:[]},...extra});

test('반응은 지금 나올 수 있는 것끼리 모두 같은 확률이다(하나 추가하면 1/(n+1))',()=>{
 for(const [catalog,expected] of [[emptyCatalog(),reactionPoses.warm.like.length],[withCustom(),reactionPoses.warm.like.length+1]]){
  const pick=createCatalogPicker(()=>catalog,()=>true,lcg()),count=new Map(),n=60000;
  for(let i=0;i<n;i++){const p=pick('warm','like');count.set(p.id,(count.get(p.id)||0)+1);}
  assert.equal(count.size,expected);
  for(const v of count.values())assert.ok(Math.abs(v/n-1/expected)<0.01,`${v/n} vs ${1/expected}`);
 }
});

test('올린 그림을 아직 받지 않았으면 그 반응은 고르지 않는다',()=>{
 const c=withCustom();
 assert.equal(activeReactions(c,'warm','like',()=>false).some(r=>r.id==='c-new'),false);
 assert.equal(activeReactions(c,'warm','like',()=>true).some(r=>r.id==='c-new'),true);
 const pick=createCatalogPicker(()=>c,()=>false,lcg());
 for(let i=0;i<200;i++)assert.notEqual(pick('warm','like').id,'c-new');
});

test('계절: 계절 표시가 있는 반응은 그 계절에만, 표시가 없으면 사계절 나온다. 계절을 고르면 자동 선택된다',()=>{
 let c=withCustom({reactions:{'c-new':{enabled:true,seasons:['spring']},'b:warm:like:0':{enabled:true,seasons:['winter']}}});
 const ids=()=>activeReactions(c,'warm','like').map(r=>r.id);
 assert.equal(ids().includes('c-new'),false);assert.equal(ids().includes('b:warm:like:0'),false); // 지금은 '기본' 계절
 c=selectSeason(c,'spring');
 assert.equal(c.season,'spring');assert.equal(ids().includes('c-new'),true);assert.equal(ids().includes('b:warm:like:0'),false);
 assert.equal(c.reactions['b:warm:like:0'].enabled,false);assert.equal(c.reactions['c-new'].enabled,true);assert.equal(c.reactions['b:warm:like:1'].enabled,true); // 사계절
 c=selectSeason(c,'winter');
 assert.equal(ids().includes('c-new'),false);assert.equal(ids().includes('b:warm:like:0'),true);
 // 같은 종류 안에서는 계절이 바뀌어도 모두 같은 확률
 const live=activeReactions(c,'warm','like'),pick=createCatalogPicker(()=>c,()=>true,lcg(3)),count=new Map();
 for(let i=0;i<40000;i++){const p=pick('warm','like');count.set(p.id,(count.get(p.id)||0)+1);}
 assert.equal(count.size,live.length);for(const v of count.values())assert.ok(Math.abs(v/40000-1/live.length)<0.01);
});

test('계절별 기본 모습: 고른 계절의 기본 모습이 평소 모습이 되고, 고르지 않았으면 그 계절의 첫 그림',()=>{
 let c=emptyCatalog();assert.equal(idleLook(c).id,'base');
 c=selectSeason(c,'autumn');assert.equal(idleLook(c).id,'season-autumn');
 c=normalizeCatalog({...c,custom:{reactions:[],items:[],seasonImages:[{id:'s-a2',season:'autumn',image:'img-bbbbbbbb2',name:'가을 2'}]},defaults:{autumn:'s-a2'}});
 assert.equal(idleLook(c).id,'s-a2');assert.deepEqual(seasonImages(c,'autumn').map(x=>x.id),['season-autumn','s-a2']);
 assert.ok(neededImages(c).includes('img-bbbbbbbb2'));
});

test('꾸미기: 처음부터 있던 아이템 + 판매 중인 추가 아이템',()=>{
 const c=normalizeCatalog({custom:{reactions:[],seasonImages:[],items:[{id:'item-abcdef12',image:'img-cccccccc3',name:'벚꽃 핀',cost:4,enabled:true},{id:'item-zzzzzz99',image:'img-dddddddd4',name:'숨김',cost:2,enabled:false}]}});
 assert.deepEqual(shopItems(c).map(x=>x.id),['ribbon','crown','starlight','item-abcdef12']);
 assert.equal(shopItems(c,{all:true}).length,5);
 assert.equal(allReactions(c,'cold','dislike').every(r=>r.builtin),true);
});
