// 담당자 답변 '근거'처럼 사람이 쓴 글에서 웹 주소(http(s)://…, www.…)만 눌러서 열 수 있는 링크로 바꾼다.
// 나머지 글자는 그대로(HTML 이스케이프) 둔다. http·https 주소만 링크로 만들고, 끝에 붙은 문장부호()].,!? 등)는 주소에서 뺀다.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const URL_RE=/(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAIL=/[)\]}.,;:!?。，、'"]+$/;
export function linkifyText(text){
 const s=String(text??'');let out='',from=0;
 for(const m of s.matchAll(URL_RE)){
  let raw=m[0];const trail=(raw.match(TRAIL)||[''])[0];
  // 주소 안에 여는 괄호가 있으면 닫는 괄호는 주소의 일부로 둔다(예: 위키 주소)
  let keep=trail;if(trail.startsWith(')')&&raw.includes('(')){keep=trail.slice(1);}
  raw=raw.slice(0,raw.length-keep.length);
  let href=/^www\./i.test(raw)?'https://'+raw:raw,ok=false;
  try{const u=new URL(href);ok=u.protocol==='http:'||u.protocol==='https:';href=u.href;}catch{}
  out+=esc(s.slice(from,m.index));
  out+=ok?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(raw)}</a>`:esc(raw);
  out+=esc(keep);from=m.index+m[0].length;
 }
 return out+esc(s.slice(from));
}
