import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCatalog,normalizeCatalog,allReactions,activeReactions,bucketReactions,createCatalogPicker,selectSeason,idleLook,seasonImages,shopItems,neededImages} from '../public/nyang-catalog.js';
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

test('칸: 처음부터 있던 반응은 모두 기본값 칸, 계절 칸은 비어 있고, 비어 있으면 기본값 반응이 나온다',()=>{
 let c=emptyCatalog();
 for(const mode of ['warm','cold'])for(const kind of ['like','dislike','bonus']){
  assert.ok(allReactions(c,mode,kind).every(r=>r.season==='none'));
  for(const s of ['spring','summer','autumn','winter'])assert.equal(bucketReactions(c,s,mode,kind).length,0);
 }
 c=selectSeason(c,'spring');
 assert.deepEqual(activeReactions(c,'warm','like').map(r=>r.id),bucketReactions(c,'none','warm','like').map(r=>r.id)); // 봄 칸이 비어 있으면 기본값
 // 봄 칸에 좋아함 반응 2개를 넣으면 봄에는 그 2개만(각 50%), 다른 종류는 여전히 기본값
 c=normalizeCatalog({...c,custom:{seasonImages:[],items:[],reactions:[
  {id:'c-s1',mode:'warm',kind:'like',season:'spring',image:'img-aaaaaaaa1',line:'봄 1'},{id:'c-s2',mode:'warm',kind:'like',season:'spring',image:'img-aaaaaaaa2',line:'봄 2'},
  {id:'c-old',mode:'warm',kind:'like',image:'img-aaaaaaaa3',line:'칸 없음 → 기본값'}]}});
 assert.deepEqual(activeReactions(c,'warm','like').map(r=>r.id),['c-s1','c-s2']);
 assert.equal(activeReactions(c,'warm','dislike').length,bucketReactions(c,'none','warm','dislike').length);
 assert.ok(bucketReactions(c,'none','warm','like').some(r=>r.id==='c-old'));
 const pick=createCatalogPicker(()=>c,()=>true,lcg(5)),count=new Map();
 for(let i=0;i<20000;i++){const p=pick('warm','like');count.set(p.id,(count.get(p.id)||0)+1);}
 assert.deepEqual([...count.keys()].sort(),['c-s1','c-s2']);for(const v of count.values())assert.ok(Math.abs(v/20000-.5)<0.01);
 // 봄 반응을 모두 끄면 다시 기본값, 다른 계절로 바꿔도 기본값
 c.reactions={'c-s1':{enabled:false},'c-s2':{enabled:false}};assert.ok(activeReactions(c,'warm','like').some(r=>r.id==='b:warm:like:0'));
 c=selectSeason({...c,reactions:{}},'winter');assert.ok(activeReactions(c,'warm','like').every(r=>r.season==='none'));
 assert.ok(!neededImages(c).includes('img-aaaaaaaa1'));assert.ok(neededImages(selectSeason(c,'spring')).includes('img-aaaaaaaa1'));
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
