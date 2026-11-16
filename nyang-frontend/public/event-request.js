// 채팅에서 "내일 오후 3시에 미팅 추가해줘" 같은 개인 일정 추가 요청을 알아보고 제목·날짜·시간으로 나눈다.
// 사내 문서를 찾는 질문과 섞이지 않도록, '추가해 줘·넣어 줘·잡아 줘' 같은 부탁 말투와 날짜·시간이 함께 있을 때만 일정으로 본다.
const WEEKDAYS='일월화수목금토';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const at=day=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d,12);};
const plus=(day,n)=>{const d=at(day);d.setDate(d.getDate()+n);return iso(d);};
const valid=(y,m,d)=>{const x=new Date(y,m-1,d,12);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;};

// 부탁 말투(이 말투가 있어야 일정 추가 요청으로 본다). '추가하는 방법'처럼 묻는 말은 해당하지 않는다.
const REQUEST=/(추가|등록|저장|기록)\s*(?:해\s*줘|해\s*주세요|해\s*줄래|해\s*주라|해\s*둬|해\s*놔|하자|해(?=\s*$|[.!~]))|(넣어|잡아|만들어|적어)\s*(?:줘|주세요|줄래|둬|놔)?(?=\s*$|[\s.!~])/;
const ASKING=/어떻게|방법|되나요|하나요|할\s*수\s*있|가능한가|왜\s/;
const DATE_PATTERNS=[
 /(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
 /(?<![\d:])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d:])/,
 /(이번\s*주|다음\s*주|담주|다다음\s*주)?\s*([일월화수목금토])요일/,
 /(오늘|내일|모레|글피)/,
 /(?<![\d월])(\d{1,2})\s*일(?![정간])/
];
const TIME_PATTERNS=[
 /(오전|오후|아침|점심|저녁|밤|새벽)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/,
 /(?<![\d/])(\d{1,2}):(\d{2})(?!\d)/
];

/** 날짜 말을 찾아 YYYY-MM-DD로. 찾은 글자 조각도 돌려준다(제목에서 지우려고). */
function findDate(q,today){
 const [ty,tm]=today.split('-').map(Number);
 let m;
 if((m=DATE_PATTERNS[0].exec(q))||(m=DATE_PATTERNS[1].exec(q))){
  const month=Number(m[1]),day=Number(m[2]);if(!valid(ty,month,day))return null;
  let year=ty;if(`${year}-${pad(month)}-${pad(day)}`<today&&valid(year+1,month,day))year++;
  return {date:`${year}-${pad(month)}-${pad(day)}`,text:m[0]};
 }
 if((m=DATE_PATTERNS[2].exec(q))){
  const week=(m[1]||'').replace(/\s/g,''),target=WEEKDAYS.indexOf(m[2]),now=at(today).getDay();
  if(!week){return {date:plus(today,(target-now+7)%7),text:m[0]};} // 가장 가까운 그 요일(오늘 포함)
  const monday=plus(today,-((now+6)%7)),offset=(target+6)%7;
  const weeks=week==='이번주'?0:week==='다다음주'?2:1;
  return {date:plus(monday,weeks*7+offset),text:m[0]};
 }
 if((m=DATE_PATTERNS[3].exec(q)))return {date:plus(today,{오늘:0,내일:1,모레:2,글피:3}[m[1]]),text:m[0]};
 if((m=DATE_PATTERNS[4].exec(q))){
  const day=Number(m[1]);let y=ty,mo=tm;
  if(!valid(y,mo,day)||`${y}-${pad(mo)}-${pad(day)}`<today){mo++;if(mo>12){mo=1;y++;}}
  if(!valid(y,mo,day))return null;
  return {date:`${y}-${pad(mo)}-${pad(day)}`,text:m[0]};
 }
 return null;
}

/** 시간 말을 찾아 HH:MM으로. 오전·오후가 없고 1~7시면 업무 시간으로 보고 오후로 본다. */
function findTime(q){
 let m;
 if((m=TIME_PATTERNS[0].exec(q))){
  let h=Number(m[2]);const min=m[4]?30:Number(m[3]||0),part=m[1];
  if(h>24||min>59)return null;
  if(['오후','저녁','밤'].includes(part)&&h<12)h+=12;
  else if(part==='점심'&&h<=5)h+=12;
  else if(['오전','아침','새벽'].includes(part)&&h===12)h=0;
  else if(!part&&h>=1&&h<=7)h+=12;
  if(h===24)h=0;
  return {time:`${pad(h)}:${pad(min)}`,text:m[0]};
 }
 if((m=TIME_PATTERNS[1].exec(q))){const h=Number(m[1]),min=Number(m[2]);if(h>23||min>59)return null;return {time:`${pad(h)}:${pad(min)}`,text:m[0]};}
 return null;
}

/** 일정 제목: 날짜·시간·'내 일정에'·부탁 말투와 앞뒤 조사를 덜어 낸 나머지. 없으면 '새 일정'. */
function findTitle(q,parts){
 let t=q;
 for(const p of parts)if(p)t=t.replace(p,' ');
 t=t.replace(/(내\s*)?(일정표?|캘린더|스케줄)\s*(에|으로|로)?(?=\s|$)/g,' ').replace(REQUEST,' ').replace(/[.!~?]/g,' ');
 const particles=new Set(['에','에서','으로','로','을','를','좀','한','하나','꼭','같이','그리고']);
 const words=t.split(/\s+/).filter(w=>w&&!particles.has(w));
 let title=words.join(' ').replace(/^(에|에서)\s*/,'').replace(/(을|를|으로|로)$/,'').trim();
 return (title||'새 일정').slice(0,40);
}

/**
 * 개인 일정 추가 요청이면 {title,date,time}을, 아니면 null을 돌려준다. today: 'YYYY-MM-DD'(한국 날짜).
 * time은 'HH:MM' 또는 ''(시간 없음). 날짜가 없고 시간만 있으면 오늘로 본다.
 */
export function parseEventRequest(text,today){
 const q=String(text??'').trim();
 if(!q||q.length>120||!REQUEST.test(q)||ASKING.test(q))return null;
 const d=findDate(q,today),t=findTime(q);
 if(!d&&!t)return null;
 return {title:findTitle(q,[d?.text,t?.text]),date:d?.date||today,time:t?.time||''};
}

/** '15:00' → '오후 3:00' */
export function timeLabel(time){
 if(!/^\d{2}:\d{2}$/.test(time||''))return '';
 const [h,m]=time.split(':').map(Number);
 return `${h<12?'오전':'오후'} ${h%12||12}:${pad(m)}`;
}

/** 내 일정(om-tasks)에 넣을 할 일. 규정 근거가 없는 개인 일정이라 ref·deadline은 비우고, 시간은 time으로 보여 준다. */
export function eventTask({title,date,time},id){
 return {id,key:'event:'+id,title,date,time:time||'',type:'내 일정',planType:'event',planLabel:'대화에서 추가한 일정',tripStart:date,note:'',ref:null,deadline:null,done:false};
}
