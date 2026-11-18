// 주 메뉴 배치. 직원은 한 줄로, 담당자는 '채팅 관리'·'관리'·'냥대리 관리' 묶음 아래로 펼쳐지는 메뉴를 쓴다.
// 버튼 자체(id·동작)는 그대로 두고 자리만 옮긴다. 배치가 다를 때만 옮긴다(옮기면 버튼의 포커스가 풀리므로).
const $=s=>document.querySelector(s);
const NAV_LAYOUT={
 employee:{top:['nav-chat','nav-schedule','nav-board','nav-activity','nav-library','nav-unanswered','nav-statistics','nav-userstats','nav-faq','nav-documents','nav-categories','nav-users','nav-model','nav-manage-reactions','nav-manage-seasons','nav-manage-items','nav-group-stats','nav-group-chat','nav-group-admin','nav-group-nyang'],groups:{stats:[],chat:[],admin:[],nyang:[]}},
 staff:{top:['nav-chat','nav-group-stats','nav-group-chat','nav-group-admin','nav-group-nyang','nav-schedule','nav-activity','nav-library','nav-model'],groups:{stats:['nav-statistics','nav-userstats'],chat:['nav-unanswered','nav-faq','nav-board'],admin:['nav-documents','nav-categories','nav-users'],nyang:['nav-manage-reactions','nav-manage-seasons','nav-manage-items']}}
};
export function orderNav(staff){
 const layout=NAV_LAYOUT[staff?'staff':'employee'],by=id=>document.getElementById(id);
 const slots=[[$('.workspace-nav'),layout.top],...Object.entries(layout.groups).map(([g,ids])=>[by('nav-submenu-'+g),ids])].map(([box,ids])=>[box,ids.map(by)]);
 if(slots.some(([box,want])=>box.children.length!==want.length||want.some((el,i)=>box.children[i]!==el))){
  // 묶음 안을 먼저 맞추고 윗줄을 맞춘다 (묶음 상자 자체가 윗줄의 자식이라 순서가 중요하다)
  for(const [box,want] of slots.slice(1))box.replaceChildren(...want);
  slots[0][0].replaceChildren(...slots[0][1]);
 }
 for(const g of ['stats','chat','admin','nyang'])by('nav-group-'+g).hidden=!staff;
 if(!staff)closeNavGroups();
}
export function closeNavGroups(except=null){
 document.querySelectorAll('.nav-group').forEach(g=>{const open=g===except;g.classList.toggle('open',open);g.querySelector('.nav-group-toggle').setAttribute('aria-expanded',String(open));});
}
/** 묶음 메뉴 펼치기·접기. app.js가 원래 자리에서 한 번 부른다. */
export function installNavLayout(){
 // 묶음 이름을 누르면 아래로 펼치고, 다른 곳을 누르거나 Esc를 누르면 접는다. 항목을 고르면 접힌다.
 document.addEventListener('click',e=>{const toggle=e.target.closest?.('.nav-group-toggle'),group=toggle?.parentElement;closeNavGroups(group&&!group.classList.contains('open')?group:null);});
 // 관리자 화면 대부분은 안에 끼워 넣은 화면(iframe)이라 그 안을 누르면 클릭이 여기로 오지 않는다. 포커스가 넘어갈 때 접는다.
 window.addEventListener('blur',()=>closeNavGroups());
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=document.querySelector('.nav-group.open');if(!open)return;closeNavGroups();open.querySelector('.nav-group-toggle').focus();});
}
