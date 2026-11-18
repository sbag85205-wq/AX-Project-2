// 냥대리 관리(담당자)에서 정한 목록: 모드별 반응, 계절별 기본 모습, 꾸미기 아이템.
// 목록은 서버(server.mjs의 catalog)에 있고 모든 사람에게 같다. 이 파일은 목록을 읽어
//  - 반응은 칸(기본값·봄·여름·가을·겨울)마다 따로 있다. 처음부터 있던 반응은 모두 기본값 칸.
//  - 지금 계절 칸의 반응을 '모두 같은 확률'로 고르고(반응이 2개면 50%, 3개면 33%…), 그 칸에 반응이 없으면 기본값 칸에서 고른다
//  - 평소(아이들) 모습으로 쓸 그림을 정하고
//  - 꾸미기 상점에 보일 아이템을 알려 준다.
// 화면 꾸밈만 정한다. 좋아함·쉬고 싶음·보너스 중 무엇이 나올지와 포인트는 계속 서버가 정한다.
import {reactionPoses} from './reaction-variety.js?v=f4ed01acb281';
import {wardrobe} from './companion.js?v=80ab82355587';

export const SEASONS=[['none','기본'],['spring','봄'],['summer','여름'],['autumn','가을'],['winter','겨울']];
export const KINDS=[['like','좋아함'],['dislike','쉬고 싶음'],['bonus','보너스']];
export const MODES=[['warm','따뜻한 모드'],['cold','차가운 모드']];
const SEASON_IDS=SEASONS.map(([id])=>id);
/** 계절마다 처음부터 있는 기본 모습(cat-seasons.webp). 'base'는 눈을 깜빡이는 원래 냥대리. */
export const BUILTIN_SEASON_IMAGES=[
 {id:'base',season:'none',name:'원래 냥대리',builtin:true},
 {id:'season-spring',season:'spring',name:'봄 냥대리',builtin:true},
 {id:'season-summer',season:'summer',name:'여름 냥대리',builtin:true},
 {id:'season-autumn',season:'autumn',name:'가을 냥대리',builtin:true},
 {id:'season-winter',season:'winter',name:'겨울 냥대리',builtin:true}
];
const DEFAULT_MOTION={like:'purr',dislike:'backstep',bonus:'bounce'};

export function emptyCatalog(){return {season:'none',defaults:{},reactions:{},custom:{reactions:[],seasonImages:[],items:[]}};}
/** 서버가 준 목록을 안전한 모양으로(서버 cleanCatalog와 같은 모양). */
export function normalizeCatalog(value){
 const c=emptyCatalog();if(!value||typeof value!=='object')return c;
 if(SEASON_IDS.includes(value.season))c.season=value.season;
 if(value.defaults&&typeof value.defaults==='object')for(const id of SEASON_IDS)if(typeof value.defaults[id]==='string')c.defaults[id]=value.defaults[id];
 if(value.reactions&&typeof value.reactions==='object')for(const [id,v] of Object.entries(value.reactions))if(v&&typeof v==='object')c.reactions[id]={enabled:v.enabled!==false};
 const custom=value.custom&&typeof value.custom==='object'?value.custom:{};
 for(const key of ['reactions','seasonImages','items'])c.custom[key]=Array.isArray(custom[key])?custom[key].filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];
 c.custom.reactions=c.custom.reactions.map(r=>({...r,season:SEASON_IDS.includes(r.season)?r.season:'none'}));
 return c;
}

/** 처음부터 있던 반응(reaction-variety.js, 모두 기본값 칸)과 관리에서 추가한 반응. 반응마다 칸(season)과 사용 여부가 붙는다. */
export function allReactions(catalog,mode,kind){
 const m=mode==='warm'?'warm':'cold';
 const builtin=(reactionPoses[m][kind]||[]).map((pose,i)=>({id:`b:${m}:${kind}:${i}`,mode:m,kind,season:'none',builtin:true,pose,line:pose.line,mark:pose.mark}));
 const custom=catalog.custom.reactions.filter(r=>r.mode===m&&r.kind===kind).map(r=>({id:r.id,mode:m,kind,season:r.season,builtin:false,image:r.image,line:r.line,mark:r.mark,
  pose:{motion:DEFAULT_MOTION[kind],line:r.line,mark:r.mark,eyes:'',wag:false,art:'',image:r.image}}));
 return [...builtin,...custom].map(r=>({...r,enabled:catalog.reactions[r.id]?.enabled!==false}));
}
/** 한 칸(기본값 'none' 또는 계절)의 사용 중인 반응. ready(그림 번호): 올린 그림을 받아 두었는지. */
export function bucketReactions(catalog,season,mode,kind,ready=()=>true){
 return allReactions(catalog,mode,kind).filter(r=>r.season===season&&r.enabled&&(r.builtin||ready(r.image)));
}
/** 지금 나오는 반응: 지금 계절 칸에 사용 중인 반응이 있으면 그것들, 없으면 기본값 칸의 반응. */
export function activeReactions(catalog,mode,kind,ready=()=>true){
 const seasonal=catalog.season!=='none'?bucketReactions(catalog,catalog.season,mode,kind,ready):[];
 return seasonal.length?seasonal:bucketReactions(catalog,'none',mode,kind,ready);
}
/**
 * 반응 고르기: 지금 나올 수 있는 반응 중 하나를 같은 확률로 고른다. 바로 전과 같은 반응은 연달아 고르지 않는다
 * (오래 쓰면 모두 같은 비율이 된다). 나올 반응이 하나도 없으면 처음부터 있던 반응에서 고른다.
 */
export function createCatalogPicker(getCatalog,ready=()=>true,random=Math.random){
 const previous=new Map();
 return (mode,kind)=>{
  const catalog=getCatalog();
  let pool=activeReactions(catalog,mode,kind,ready);
  if(!pool.length)pool=allReactions(catalog,mode,kind).filter(r=>r.builtin);
  if(!pool.length)return null;
  const key=mode+':'+kind,candidates=pool.length>1?pool.filter(r=>r.id!==previous.get(key)):pool;
  const chosen=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)))];
  previous.set(key,chosen.id);return {...chosen.pose,id:chosen.id};
 };
}
/** 지금 계절 바꾸기: 평소 모습과 반응이 그 계절 칸 것으로 바뀐다(칸에 반응이 없으면 기본값 반응). */
export function selectSeason(catalog,season){
 const next=normalizeCatalog(JSON.parse(JSON.stringify(catalog)));next.season=SEASON_IDS.includes(season)?season:'none';return next;
}
/** 계절별 모습 목록(처음부터 있던 것 + 추가한 것). */
export function seasonImages(catalog,season){
 return [...BUILTIN_SEASON_IMAGES.filter(x=>x.season===season),...catalog.custom.seasonImages.filter(x=>x.season===season).map(x=>({...x,builtin:false}))];
}
/** 그 계절의 기본 모습(관리에서 고른 것, 없으면 그 계절의 첫 그림). */
export function seasonDefault(catalog,season){
 const list=seasonImages(catalog,season),chosen=list.find(x=>x.id===catalog.defaults[season]);
 return chosen||list[0]||BUILTIN_SEASON_IMAGES[0];
}
/** 평소 모습: 지금 계절의 기본 모습. {id:'base'}이면 원래 냥대리(눈 깜빡임). */
export function idleLook(catalog){return seasonDefault(catalog,catalog.season);}
/** 꾸미기 상점: 처음부터 있던 아이템 + 판매 중인 추가 아이템. */
export function shopItems(catalog,{all=false}={}){
 return [...wardrobe.map(x=>({...x,builtin:true,enabled:true})),...catalog.custom.items.filter(x=>all||x.enabled!==false).map(x=>({...x,builtin:false,symbol:''}))];
}
/** 화면에 필요한 올린 그림 번호들(지금 계절의 반응·평소 모습·아이템). */
export function neededImages(catalog){
 const ids=new Set();
 for(const r of catalog.custom.reactions)if(catalog.reactions[r.id]?.enabled!==false&&(r.season==='none'||r.season===catalog.season))ids.add(r.image);
 const idle=idleLook(catalog);if(idle.image)ids.add(idle.image);
 for(const i of catalog.custom.items)ids.add(i.image);
 return [...ids];
}
