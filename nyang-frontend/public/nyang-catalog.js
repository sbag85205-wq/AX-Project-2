// 냥대리 관리(담당자)에서 정한 목록: 모드별 반응, 계절별 기본 모습, 꾸미기 아이템.
// 목록은 서버(server.mjs의 catalog)에 있고 모든 사람에게 같다. 이 파일은 목록을 읽어
//  - 반응은 칸(기본값·봄·여름·가을·겨울)마다 따로 있다. 처음부터 있던 반응은 기본값 칸, 봄 따뜻한 모드는 봄 칸에도 처음부터 있다.
//  - 지금 계절 칸의 반응을 '모두 같은 확률'로 고르고(반응이 2개면 50%, 3개면 33%…), 그 칸에 반응이 없으면 기본값 칸에서 고른다
//  - 평소(아이들) 모습으로 쓸 그림을 정하고
//  - 꾸미기 상점에 보일 아이템을 알려 준다.
// 화면 꾸밈만 정한다. 좋아함·쉬고 싶음·보너스 중 무엇이 나올지와 포인트는 계속 서버가 정한다.
import {reactionPoses,seasonReactionPoses} from './reaction-variety.js?v=343305d55ffe';
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
 if(value.reactions&&typeof value.reactions==='object')for(const [id,v] of Object.entries(value.reactions))if(v&&typeof v==='object')c.reactions[id]={enabled:v.enabled!==false,...(typeof v.line==='string'&&v.line.trim()?{line:v.line}:{}),...(typeof v.mark==='string'?{mark:v.mark}:{})};
 const custom=value.custom&&typeof value.custom==='object'?value.custom:{};
 for(const key of ['reactions','seasonImages','items'])c.custom[key]=Array.isArray(custom[key])?custom[key].filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];
 c.custom.reactions=c.custom.reactions.map(r=>({...r,season:SEASON_IDS.includes(r.season)?r.season:'none'}));
 return c;
}

/** 처음부터 있던 반응(reaction-variety.js: 기본값 칸 + 계절 칸)과 관리에서 추가한 반응. 반응마다 칸(season)과 사용 여부가 붙는다. */
export function allReactions(catalog,mode,kind){
 const m=mode==='warm'?'warm':'cold';
 const builtin=[...(reactionPoses[m][kind]||[]).map((pose,i)=>({id:`b:${m}:${kind}:${i}`,mode:m,kind,season:'none',builtin:true,pose,line:pose.line,mark:pose.mark})),
  ...Object.entries(seasonReactionPoses).flatMap(([season,modes])=>(modes[m]?.[kind]||[]).map((pose,i)=>({id:`b:${season}:${m}:${kind}:${i}`,mode:m,kind,season,builtin:true,pose,line:pose.line,mark:pose.mark})))];
 const custom=catalog.custom.reactions.filter(r=>r.mode===m&&r.kind===kind).map(r=>({id:r.id,mode:m,kind,season:r.season,builtin:false,image:r.image,line:r.line,mark:r.mark,
  pose:{motion:DEFAULT_MOTION[kind],line:r.line,mark:r.mark,eyes:'',wag:false,art:'',image:r.image}}));
 // 처음부터 있던 반응은 관리에서 고친 멘트(line·mark)가 있으면 그것을 쓴다
 return [...builtin,...custom].map(r=>{
  const o=catalog.reactions[r.id]||{},line=r.builtin&&o.line?o.line:r.line,mark=r.builtin&&typeof o.mark==='string'?o.mark:r.mark;
  return {...r,line,mark,original:{line:r.line,mark:r.mark},edited:r.builtin&&(line!==r.pose.line||mark!==r.pose.mark),pose:{...r.pose,line,mark},enabled:o.enabled!==false};
 });
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

// ── 멘트 자동 작성 ─────────────────────────────────────────────────
// 반응을 추가하면 모드(말투)·종류·칸(계절)에 맞는 멘트를 골라 써 둔다. 이미 쓰고 있는 멘트는 피한다. 담당자가 '수정'으로 고칠 수 있다.
const LINES={
 warm:{
  like:[['오늘도 손길이 참 따뜻하다냥!','좋다냥 ♥'],['쓰다듬어 주니 기분이 몽글몽글하다냥.','몽글몽글'],['이렇게 다정하면 또 오고 싶어진다냥!','헤헤'],['골골, 마음까지 포근해졌다냥.','골골 ♥'],['조금만 더 이렇게 있어 달라냥.','포근포근']],
  dislike:[['지금은 살짝 쉬고 싶다냥. 금방 다시 놀자냥.','잠깐만냥…'],['오늘은 조금 피곤하다냥… 이따 만나자냥.','쉬는 중이다냥'],['잠깐만 숨 돌리고 오겠다냥.','이따 보자냥'],['살살 부탁한다냥. 조금 뒤에 다시 와 달라냥.','살살냥…']],
  bonus:[['너무 행복해서 작은 선물을 준비했다냥!','선물이다냥 ♥'],['오늘 손길은 특별하다냥! 선물 받아 달라냥.','특별하다냥'],['고마운 마음을 담아 주는 선물이다냥.','고맙다냥 ♥']]
 },
 cold:{
  like:[['…나쁘지 않은 손길이다냥.','…흠'],['흠, 조금은 인정해 주겠다냥.','…합격이다냥'],['좋아서 가만히 있는 건 아니다냥.','비밀이다냥'],['딱 조금만 더 해도 된다냥.','…더 해라냥'],['…이 정도면 봐주겠다냥.','흥, 됐다냥']],
  dislike:[['지금은 건드리지 마라냥.','흥이다냥'],['거리 유지다냥. 업무 중이다냥.','방해 금지다냥'],['흥, 오늘은 그런 기분 아니다냥.','저리 가라냥'],['손은 거기까지라고 했다냥.','거리 유지다냥']],
  bonus:[['…특별히 이번만 주는 거다냥.','…이번만이다냥'],['착각하지 마라냥. 그냥 주는 선물이다냥.','특별히다냥'],['흥, 기분이 좋아서 주는 거 아니다냥.','비밀이다냥 ♥']]
 }
};
const SEASON_LINES={
 spring:{warm:{like:['봄바람처럼 손길이 살랑살랑 좋다냥!','살랑 ♥'],dislike:['봄볕에 졸려서 잠깐 쉬고 싶다냥…','꾸벅꾸벅'],bonus:['벚꽃처럼 기분이 활짝 폈다냥! 선물이다냥.','활짝 ♥']},cold:{like:['…봄이라서 특별히 봐주는 거다냥.','…봄이다냥'],dislike:['꽃가루 날리니까 건드리지 마라냥.','에취냥'],bonus:['봄 기분이니까 이번만 주는 거다냥.','…벚꽃냥']}},
 summer:{warm:{like:['시원한 손길이라 더위가 싹 가신다냥!','시원 ♥'],dislike:['너무 더워서 잠깐만 쉬겠다냥…','더워냥…'],bonus:['아이스커피처럼 상쾌한 선물이다냥!','쨍 ♥']},cold:{like:['…더운데 손은 시원하니 봐주겠다냥.','…시원하다냥'],dislike:['더우니까 붙지 마라냥.','더워냥'],bonus:['흥, 여름이라 기분 내는 거다냥.','…여름냥']}},
 autumn:{warm:{like:['가을바람처럼 손길이 포근하다냥!','포근 ♥'],dislike:['낙엽 구경하느라 잠깐 쉬고 싶다냥.','바스락'],bonus:['풍성한 가을처럼 선물도 듬뿍이다냥!','듬뿍 ♥']},cold:{like:['…가을이라 조금 감성적인 것뿐이다냥.','…가을냥'],dislike:['낙엽 밟는 중이다냥. 방해 마라냥.','바스락냥'],bonus:['독서의 계절이라 기분 좋아서 주는 거다냥.','…이번만냥']}},
 winter:{warm:{like:['따뜻한 손길 덕분에 하나도 안 춥다냥!','따끈 ♥'],dislike:['추워서 이불 속에 잠깐 있겠다냥…','덜덜냥'],bonus:['눈처럼 소복소복 쌓인 고마움이다냥!','소복 ♥']},cold:{like:['…추우니까 손은 인정해 주겠다냥.','…따뜻하다냥'],dislike:['추운데 손 차갑다냥. 저리 가라냥.','차갑다냥'],bonus:['연말이라 특별히 주는 거다냥.','…연말냥']}}
};
/** 추가할 반응의 멘트를 써 준다({line, mark}). used: 이미 쓰고 있는 멘트들(겹치지 않게). */
export function suggestLine(mode,kind,season='none',used=[],random=Math.random){
 const m=mode==='warm'?'warm':'cold',taken=new Set(used);
 const seasonal=SEASON_LINES[season]?.[m]?.[kind],pool=[...(seasonal?[seasonal]:[]),...(LINES[m][kind]||[])].map(([line,mark])=>({line,mark}));
 const fresh=pool.filter(x=>!taken.has(x.line));
 if(seasonal&&fresh[0]?.line===seasonal[0])return fresh[0]; // 계절 칸이면 계절 멘트부터
 const list=fresh.length?fresh:pool;return list[Math.min(list.length-1,Math.floor(random()*list.length))]||{line:'…냥.',mark:''};
}
