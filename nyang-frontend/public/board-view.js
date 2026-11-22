import {esc,HELPFUL_POINTS} from './shared.js?v=b4248c4d9fbf';
import {categories as chatCategories} from './core.js?v=4dc923f4c7f7';
// 지금 고를 수 있는 분야(분야 관리 목록 = 채팅 분야). 목록에 없는 분야(예전 분야·지워진 분야)로 올라온 글은 '이전 분야'로 묶어 보여 준다.
const current=()=>chatCategories.map(c=>c.id);
const label=id=>chatCategories.find(c=>c.id===id)?.label||'이전 분야';
const inCategory=(p,category)=>category==='all'||(category==='old'?!current().includes(p.category):p.category===category);
const date=s=>new Date(s).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'});
const thumb='<svg class="helpful-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10v10H4V10h3Zm3 10h7.4a2 2 0 0 0 2-1.6l1.3-6.4A2 2 0 0 0 18.7 9.6H14V5.8A1.8 1.8 0 0 0 12.2 4L10 10v10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const chevron='<svg class="board-row-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const status=p=>`<span class="question-status ${p.replies.length?'resolved':''}">${p.replies.length?'답변 완료':'답변 대기'}</span>`;
const sorts=[['new','최신순'],['helpful','유익해요 많은 순']];

/**
 * 질문 게시판 목록. 왼쪽에 분야(개수), 오른쪽에 상태 탭·검색·정렬과 한 줄씩 정리된 질문 목록.
 * 질문을 누르면 상세 창(boardPostHTML)이 열리고, 거기서 답변을 보고 '유익해요'를 누른다.
 */
export function boardView(state,filter='all',query='',category='all',sort='new'){
 const staff=state.me.role==='staff',deleted=staff&&filter==='deleted';
 const list=deleted?(state.deletedPosts||[]):state.posts;
 const posts=list.filter(p=>(deleted||filter==='all'?true:filter==='mine'?p.mine:filter==='waiting'?!p.replies.length:filter==='answered'?p.replies.length:true)&&inCategory(p,category)&&(!query||p.body.toLowerCase().includes(query.toLowerCase())));
 if(!deleted&&sort==='helpful')posts.sort((a,b)=>(b.likes||0)-(a.likes||0)||String(b.created).localeCompare(String(a.created)));
 const count=c=>list.filter(p=>inCategory(p,c)).length;
 const categories=[['all','전체 분야'],...current().map(c=>[c,label(c)]),...(count('old')||category==='old'?[['old','이전 분야']]:[])];
 const tabs=[['all','전체'],['waiting','답변 대기'],['answered','답변 완료'],staff?['deleted','삭제된 글']:['mine','내 질문']];
 const answers=state.posts.filter(p=>p.replies.length).length;
 const row=p=>deleted?`<li class="board-row deleted-question" id="post-${esc(p.id)}"><div class="board-row-body"><span class="board-row-tags"><span class="badge">${esc(label(p.category))}</span><span>삭제됨 · ${date(p.deleted_at)}</span></span><strong class="board-row-title">${esc(p.body)}</strong><span class="board-row-meta">직원 화면에서 숨겨진 질문입니다. 복원하면 기존 답변도 다시 표시됩니다.</span></div><button class="secondary-button restore-post" data-restore-post="${esc(p.id)}">복원</button></li>`:
  `<li id="post-${esc(p.id)}"><button class="board-row ${p.replies.length?'answered':'waiting'}" data-open-post="${esc(p.id)}" aria-label="질문 열기: ${esc(p.body.slice(0,60))}"><span class="board-row-tags"><span class="badge">${esc(label(p.category))}</span>${status(p)}${p.mine?'<span class="board-mine">내 질문</span>':''}</span><strong class="board-row-title">${esc(p.body)}</strong><span class="board-row-meta"><time>${date(p.created)}</time><span>담당자 답변 ${p.replies.length}</span><span class="board-row-helpful ${p.liked?'on':''}">${thumb}유익해요 ${p.likes||0}</span></span>${chevron}</button></li>`;
 const selected=categories.find(([v])=>v===category)?.[1]||'전체 분야';
 const empty=`<div class="community-empty"><h2>${query?'검색 결과가 없어요.':category!=='all'?'이 분야에 해당하는 질문이 없어요.':deleted?'삭제된 글이 없어요.':filter==='waiting'?'답변을 기다리는 질문이 없어요.':filter==='answered'?'아직 답변한 질문이 없어요.':filter==='mine'?'아직 올린 질문이 없어요.':'등록된 질문이 없어요.'}</h2><p>${query?'다른 검색어로 찾아보세요.':category!=='all'?'다른 분야를 고르거나 전체 분야로 보세요.':staff?'직원이 등록한 질문을 여기에서 확인할 수 있어요.':'냥대리가 답하지 못한 질문을 익명으로 올려 보세요.'}</p>${!staff&&!query?'<button class="secondary-button" data-action="chat">냥대리에게 물어보기 →</button>':''}</div>`;
 return `<section class="community-page board-page ${staff?'staff-board-page':''}"><header class="community-heading"><div>${staff?'<p class="staff-workspace-label">담당자 관리</p>':''}<h1>질문 게시판</h1></div><button class="secondary-button" data-community="refresh">새로고침</button></header>`
  +`<div class="board-summary"><div><strong>${state.posts.length}</strong><span>최근 질문</span></div><div><strong>${state.posts.length-answers}</strong><span>답변 대기</span></div><div><strong>${answers}</strong><span>답변 완료</span></div><p>${staff?'답변에는 담당자 계정과 근거가 표시됩니다.':`유익해요 한 번에 글쓴이에게 +${HELPFUL_POINTS} P`}</p></div>`
  +`<div class="board-layout"><nav class="board-side" aria-label="분야별로 보기"><p class="board-side-title">분야</p>${categories.map(([v,t])=>`<button class="board-side-item ${category===v?'selected':''}" data-board-category="${esc(v)}" aria-pressed="${category===v}">${esc(t)}<span>${count(v)}</span></button>`).join('')}</nav>`
  +`<div class="board-main"><div class="board-controls"><div class="segmented">${tabs.map(([v,t])=>`<button class="${filter===v?'selected':''}" data-board-filter="${v}" aria-pressed="${filter===v}">${t}${v==='deleted'&&(state.deletedPosts||[]).length?` <span>${state.deletedPosts.length}</span>`:''}</button>`).join('')}</div><form id="board-search"><input name="query" value="${esc(query)}" placeholder="질문 내용으로 찾기" aria-label="질문 검색"><button class="secondary-button">검색</button></form></div>`
  +`<div class="board-result"><p><strong>${esc(selected)}</strong> · ${posts.length}개${query?` · '${esc(query)}' 검색`:''}</p>${deleted?'':`<label class="board-sort">정렬<select id="board-sort" aria-label="정렬">${sorts.map(([v,t])=>`<option value="${v}" ${sort===v?'selected':''}>${t}</option>`).join('')}</select></label>`}</div>`
  +`${posts.length?`<ul class="board-rows" role="list">${posts.map(row).join('')}</ul>`:empty}</div></div>`
  +`${deleted?'<p class="community-caption">최근 삭제된 질문 최대 200개를 표시합니다. 삭제해도 이미 지급된 포인트는 유지됩니다.</p>':''}</section>`;
}

/** 질문 상세 창: 질문 전체, 담당자 답변, 그 아래 가운데 '유익해요'(글쓴이 +10 P)와 설명, 담당자 답변 작성, 삭제. 없는 질문이면 빈 글. */
export function boardPostHTML(state,id){
 const p=state.posts.find(x=>x.id===id);if(!p)return '';
 const staff=state.me.role==='staff',likes=p.likes||0;
 const answer=r=>`<section class="staff-answer named-staff-answer"><div class="staff-answer-label"><span class="verified-staff-label"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2 17 5v5c0 4-7 8-7 8s-7-4-7-8V5l7-3Z" stroke="currentColor" stroke-width="1.4"/><path d="m6.5 9.5 2.4 2.4 4.6-4.4" stroke="currentColor" stroke-width="1.6"/></svg>담당자 답변</span><strong>${esc(r.department)} · ${esc(r.authorUsername||r.name)}</strong><time>${date(r.created)}</time></div><p>${esc(r.body)}</p><div class="answer-basis"><span>근거</span>${esc(r.source)}</div></section>`;
 const helpful=staff
  ?`<div class="board-helpful"><span class="helpful-count">${thumb}유익해요 <strong>${likes}</strong></span><span class="board-helpful-note">직원들이 유익하다고 표시한 수예요.</span></div>`
  :`<div class="board-helpful"><button class="helpful-button ${p.liked?'on':''}" data-like="${esc(p.id)}" ${p.liked||p.mine?'disabled':''} aria-pressed="${!!p.liked}">${thumb}유익해요 <strong>${likes}</strong></button><span class="board-helpful-note">${p.mine?`다른 직원이 유익해요를 누르면 내게 +${HELPFUL_POINTS} P`:p.liked?`유익해요를 눌렀어요. 글쓴이에게 +${HELPFUL_POINTS} P를 보냈어요.`:`도움이 된 질문이면 눌러 주세요. 글쓴이에게 +${HELPFUL_POINTS} P`}</span></div>`;
 const composer=staff?`<details class="staff-composer" ${p.replies.length?'':'open'}><summary>${p.replies.length?'추가 답변 작성':'답변 작성하기'}</summary><form data-staff-reply="${esc(p.id)}"><div class="reply-identity"><span class="verified-staff-label">담당자 답변</span><strong>${esc(state.me.username)}</strong><span>이 계정으로 표시됩니다.</span></div><label>답변<textarea name="body" required minlength="5" maxlength="4000" rows="4" placeholder="직원이 이해하기 쉽게 핵심과 필요한 절차를 적어 주세요."></textarea></label><label>근거 문서·규정 또는 확인 내용<input name="source" required minlength="2" maxlength="500" placeholder="예: 인사규정 제12조 · 2026년 10월 개정본"></label><p>답변은 익명으로 표시되지 않습니다. 담당자 계정과 근거가 함께 공개됩니다.</p><button class="primary-button">담당자 답변 등록</button></form></details>`:'';
 return `<article class="board-post" data-board-post="${esc(p.id)}"><div class="board-row-tags"><span class="badge">${esc(label(p.category))}</span>${status(p)}${p.mine?'<span class="board-mine">내 질문</span>':''}</div><h2 id="modal-title" class="board-post-title">${esc(p.body)}</h2><p class="board-post-meta">익명의 직원 · ${date(p.created)}</p><section class="board-answers" aria-label="담당자 답변"><h3>담당자 답변 <span>${p.replies.length}</span></h3>${p.replies.length?p.replies.map(answer).join(''):'<div class="staff-only-note">담당자의 답변을 기다리고 있어요.</div>'}</section>${helpful}${composer}${staff||p.mine?`<div class="board-post-footer"><button class="delete-post" data-delete-post="${esc(p.id)}">질문 삭제</button></div>`:''}</article>`;
}
