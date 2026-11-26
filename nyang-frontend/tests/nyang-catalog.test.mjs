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

test('칸: 처음부터 있던 반응은 기본값 칸(봄 따뜻한 모드만 봄 칸에도), 빈 칸이면 기본값 반응이 나온다',()=>{
 let c=emptyCatalog();
 for(const mode of ['warm','cold'])for(const kind of ['like','dislike','bonus']){
  assert.ok(allReactions(c,mode,kind).every(r=>r.season==='none'||r.season==='spring'||r.season==='summer'||r.season==='autumn'||r.season==='winter'));
  assert.equal(bucketReactions(c,'winter',mode,kind).length,(mode==='warm'?{like:5,dislike:2,bonus:2}:{like:7,dislike:5,bonus:3})[kind]);
  assert.equal(bucketReactions(c,'autumn',mode,kind).length,(mode==='warm'?{like:6,dislike:3,bonus:2}:{like:7,dislike:5,bonus:3})[kind]);
  assert.equal(bucketReactions(c,'summer',mode,kind).length,(mode==='warm'?{like:6,dislike:3,bonus:2}:{like:8,dislike:6,bonus:3})[kind]);
  assert.equal(bucketReactions(c,'spring',mode,kind).length,(mode==='warm'?{like:5,dislike:2,bonus:2}:{like:7,dislike:5,bonus:3})[kind]);
 }
 c=selectSeason(c,'spring');
 for(const mode of ['warm','cold'])assert.ok(activeReactions(c,mode,'like').every(r=>r.season==='spring'&&r.pose.art.startsWith('spring-'))); // 봄에는 두 모드 모두 봄 반응
 c.reactions=Object.fromEntries(['warm','cold'].flatMap(m=>['like','dislike','bonus'].flatMap(k=>bucketReactions(c,'spring',m,k))).map(r=>[r.id,{enabled:false}])); // 봄 기본 반응을 끄고 아래에서 시험
 assert.deepEqual(activeReactions(c,'cold','like').map(r=>r.id),bucketReactions(c,'none','cold','like').map(r=>r.id)); // 봄 칸 반응을 모두 끄면 기본값
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
 c.reactions={...c.reactions,'c-s1':{enabled:false},'c-s2':{enabled:false}};assert.ok(activeReactions(c,'warm','like').some(r=>r.id==='b:warm:like:0'));
 c=selectSeason({...c,reactions:{}},'winter');for(const mode of ['warm','cold'])assert.ok(activeReactions(c,mode,'like').every(r=>r.season==='winter')); // 겨울에는 두 모드 모두 겨울 반응
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
 assert.deepEqual(shopItems(c).map(x=>x.id),['ribbon','crown','starlight','spring-petals','summer-drops','autumn-leaves','winter-snow','item-abcdef12']);
 assert.equal(shopItems(c,{all:true}).length,5);
 assert.equal(allReactions(c,'cold','dislike').every(r=>r.builtin),true);
});

test('멘트: 추가할 때 모드·종류·계절에 맞게 자동으로 쓰고, 이미 쓰는 멘트는 피하며, 고친 멘트가 반응에 쓰인다',async()=>{
 const {suggestLine}=await import('../public/nyang-catalog.js');
 const spring=suggestLine('warm','like','spring',[]);assert.match(spring.line,/봄/);
 const used=[];for(let i=0;i<5;i++){const s=suggestLine('cold','like','none',used,()=>0);assert.ok(!used.includes(s.line));used.push(s.line);assert.match(s.line,/냥/);}
 for(const mode of ['warm','cold'])for(const kind of ['like','dislike','bonus'])for(const season of ['none','spring','summer','autumn','winter'])assert.ok(suggestLine(mode,kind,season,[]).line.length>3);
 // 처음부터 있던 반응의 멘트를 고치면 반응에도 그 멘트가 나온다
 const c=normalizeCatalog({reactions:{'b:cold:dislike:0':{line:'고친 멘트다냥',mark:'고침'}}});
 const r=allReactions(c,'cold','dislike')[0];assert.equal(r.line,'고친 멘트다냥');assert.equal(r.pose.line,'고친 멘트다냥');assert.equal(r.edited,true);assert.notEqual(r.original.line,'고친 멘트다냥');
 const pick=createCatalogPicker(()=>c,()=>true,()=>0);assert.equal(pick('cold','dislike').line,'고친 멘트다냥');
});

test('관리에서 지운 처음부터 있던 항목은 빠지고 되돌리기 목록에 잡히며, 아이템은 바꾼 이름으로 보인다',async()=>{
 const {isHidden,hiddenInBucket,hiddenItems}=await import('../public/nyang-catalog.js');
 const c=normalizeCatalog({hidden:['b:warm:like:0','season-winter','crown','base'],itemNames:{ribbon:'분홍 리본'}});
 assert.deepEqual(c.hidden,['b:warm:like:0','season-winter','crown']); // 원래 냥대리(base)는 지울 수 없다
 assert.ok(isHidden(c,'crown')&&!isHidden(c,'ribbon'));
 assert.equal(allReactions(c,'warm','like').length,allReactions(c,'warm','like',{withHidden:true}).length-1);
 assert.deepEqual(seasonImages(c,'winter').map(x=>x.id),[]);
 assert.deepEqual(hiddenInBucket(c,'none'),['b:warm:like:0']);assert.deepEqual(hiddenInBucket(c,'winter'),['season-winter']);assert.deepEqual(hiddenItems(c),['crown']);
 assert.deepEqual(shopItems(c).map(x=>`${x.id}:${x.name}`).slice(0,2),['ribbon:분홍 리본','starlight:반짝이는 별빛']);assert.ok(!shopItems(c).some(x=>x.id==='crown'));
});

test('관리에서 바꾼 기본 아이템 가격으로 보이고, 원래 가격도 기억한다',async()=>{
 const c=normalizeCatalog({itemCosts:{ribbon:7,crown:0,starlight:1000}});
 assert.deepEqual(c.itemCosts,{ribbon:7}); // 1~999만
 const ribbon=shopItems(c).find(x=>x.id==='ribbon');assert.equal(ribbon.cost,7);assert.equal(ribbon.originalCost,3);
});

test('관리에서 바꾼 기본 아이템 설명으로 보이고, 원래 설명도 기억한다',()=>{
 const c=normalizeCatalog({itemDescs:{crown:'  반짝 왕관  ',ribbon:'   '}});
 assert.deepEqual(c.itemDescs,{crown:'반짝 왕관'});
 const crown=shopItems(c).find(x=>x.id==='crown');assert.equal(crown.description,'반짝 왕관');assert.equal(crown.originalDescription,'오늘도 출근한 우리 냥대리가 최고.');
});
