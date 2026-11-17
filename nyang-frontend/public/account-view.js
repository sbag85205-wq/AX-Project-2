import {esc,loadingHTML} from './shared.js?v=0fcb6a1b22de';
import {levelLadder} from './activity-history.js?v=e6e5d2733a70';
// 눈 모양: 비밀번호 보기 / 가리기
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
/** 비밀번호 보기·가리기 버튼 아이콘 */
export const passwordEye=shown=>shown?EYE_OFF:EYE;
/**
 * 비밀번호 칸: 눈 모양 버튼으로 입력한 글자를 보거나 가리고, Caps Lock이 켜져 있으면 칸 아래에 알려 준다(app.js가 처리).
 * attrs: 칸에 더 붙일 속성 글자(예: 'minlength="8"').
 */
export function passwordInputHTML({id,name,autocomplete,attrs=''}){
 return `<span class="password-field"><input id="${id}" name="${name}" type="password" autocomplete="${autocomplete}" required maxlength="128" ${attrs}><button type="button" class="password-toggle" data-password-toggle="${id}" aria-label="비밀번호 보기" aria-pressed="false" title="비밀번호 보기">${EYE}</button></span><small class="caps-warning" data-caps-for="${id}" role="status" hidden>Caps Lock이 켜져 있어요</small>`;
}
export function loginHTML(role='employee',state={}){
 if(state.loading)return `<section class="login-page">${loadingHTML('로그인 정보를 확인하는 중')}</section>`;
 return `<section class="login-page"><div class="login-intro"><div class="login-pet"><button type="button" class="login-cat-touch" data-action="login-pet" aria-label="냥대리 쓰다듬기" aria-describedby="login-pet-reply"><span class="cat-art login-cat" aria-hidden="true"></span></button><p id="login-pet-reply" class="login-pet-reply" role="status" aria-live="polite" aria-atomic="true"></p></div><p class="login-eyebrow">나의 업무 도우미</p><h1>냥대리에 오신 걸 환영해요.</h1><p>${role==='staff'?'질문에 답하고, 직원들의 이용 현황을 확인하세요.':'로그인하고, 어디서든 내 포인트를 이어가세요.'}</p></div><div class="login-card"><div class="login-types" role="group" aria-label="로그인 유형"><button data-login-role="employee" aria-pressed="${role==='employee'}">직원</button><button data-login-role="staff" aria-pressed="${role==='staff'}">담당자</button></div><form id="account-login"><input type="hidden" name="role" value="${role}"><label for="login-username">아이디</label><input id="login-username" name="username" autocomplete="username" required maxlength="50" placeholder="${role==='staff'?'담당자':'직원'} 아이디"><label for="login-password">비밀번호</label>${passwordInputHTML({id:'login-password',name:'password',autocomplete:'current-password'})}<p id="login-error" class="login-error" role="alert">${esc(state.error||'')}</p><button class="primary-button login-submit" type="submit">${role==='staff'?'담당자로':'직원으로'} 로그인</button></form><p class="login-note">${role==='staff'?'담당자는 질문·FAQ·문서·사용자·검색 모델 관리 화면과 이용통계를 확인할 수 있어요.':'Knowly에서 발급한 개인 계정으로 로그인하세요.'}</p></div></section>`;
}
// ── 사용자 통계(담당자) ─────────────────────────────────────────────
/** 순위 기간(포인트 순위·유익해요 순위에 함께 적용) */
export const STATS_PERIODS=[['month','이번 달'],['quarter','최근 3개월'],['all','전체']];
const RANK_PREVIEW=10;
const koreaDay=iso=>new Date(new Date(iso).getTime()+9*3600000).toISOString().slice(0,10);
/** 기간 설명: '이번 달 · 2026-11-01 이후' / '전체 기간' */
export const periodLabel=(period,since)=>period==='all'||!since?'전체 기간':`${STATS_PERIODS.find(p=>p[0]===period)?.[1]||'최근 3개월'} · ${koreaDay(since)} 이후`;
// CSV 칸: 쉼표·따옴표·줄바꿈은 따옴표로 감싸고, 엑셀이 수식으로 읽는 글자(= + - @)로 시작하면 앞에 '를 붙인다
const csvCell=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return /[",\r\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;};
/** 포인트 순위 CSV(엑셀에서 한글이 깨지지 않게 BOM을 붙인다). rows: [{username,points}] */
export function rankingCSV(rows,label){
 return '﻿'+[['순위','아이디',`받은 포인트(${label})`],...rows.map((r,i)=>[i+1,r.username,r.points])].map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
const rankNo=i=>`<span class="rank-no ${i<3?'top':''}">${i+1}</span>`;
/**
 * 사용자 통계 화면. ui: {period:'month'|'quarter'|'all', expanded:포인트 순위를 50위까지 펼쳤는지}
 * 위에서부터 요약 숫자 → 순위 기간 → 포인트 순위(왼쪽) · 유익해요 순위/레벨 분포/출석 현황(오른쪽).
 */
export function statisticsHTML(state,ui={}){
 const header='<header class="activity-heading"><div><h1>사용자 통계</h1><p>직원들의 포인트·레벨·출석 참여를 한눈에 확인하세요.</p></div><button class="secondary-button" data-community="statistics">새로고침</button></header>';
 if(state?.loading)return `<section class="stats-page">${header}${loadingHTML('통계를 불러오는 중')}</section>`;
 if(!state||state.error)return `<section class="stats-page">${header}<p role="alert">${esc(state?.error||'담당자만 통계를 볼 수 있어요.')}</p></section>`;
 const s=state,period=STATS_PERIODS.some(p=>p[0]===ui.period)?ui.period:'quarter',label=periodLabel(period,s.periods?.[period]??s.rankingSince);
 const ranking=s.rankings?.[period]||s.ranking||[],helpful=s.helpful?.[period]||[],shown=ui.expanded?ranking:ranking.slice(0,RANK_PREVIEW);
 const accounts=s.accounts||0,daily=s.attendanceDaily||[],streaks=s.streaks||[],levels=s.levels||[],names=levelLadder(0);
 const rate=accounts&&daily.length?Math.min(100,Math.round(daily.reduce((n,d)=>n+d.n,0)/(daily.length*accounts)*100))+'%':'—';
 const tiles=[[accounts+'<small>명</small>','직원 계정'],[`${s.attendance??0}<small> / ${accounts}명</small>`,'오늘 출석'],[rate,'최근 7일 출석률'],[streaks[0]?streaks[0].days+'<small>일</small>':'—','최장 연속 출석']];
 const metrics=`<div class="stats-metrics">${tiles.map(([v,t])=>`<article><span>${t}</span><strong>${v}</strong></article>`).join('')}</div>`;
 const filter=`<div class="userstats-filter"><span id="stats-period-label">순위 기간</span><div class="segmented" role="group" aria-labelledby="stats-period-label">${STATS_PERIODS.map(([v,t])=>`<button class="${period===v?'selected':''}" data-stats-period="${v}" aria-pressed="${period===v}">${t}</button>`).join('')}</div><span class="stats-note">${esc(label)}</span></div>`;
 const points=`<section class="stats-panel stats-ranking"><div><h2>포인트 순위</h2><button class="secondary-button" data-stats-csv ${ranking.length?'':'disabled'}>CSV 내려받기</button></div>`
  +(ranking.length?`<table><thead><tr><th>순위</th><th>아이디</th><th>받은 포인트</th></tr></thead><tbody>${shown.map((r,i)=>`<tr><td>${rankNo(i)}</td><td>${esc(r.username)}</td><td><strong>${r.points.toLocaleString('ko-KR')} P</strong></td></tr>`).join('')}</tbody></table>`:'<p class="stats-note">로그인한 직원 계정의 활동부터 표시됩니다.</p>')
  +(ranking.length>RANK_PREVIEW?`<button class="text-button userstats-more" data-stats-more aria-expanded="${!!ui.expanded}">${ui.expanded?`상위 ${RANK_PREVIEW}명만 보기`:`${ranking.length}명 모두 보기`}</button>`:'')
  +'<p class="stats-note">기간 동안 받은 포인트 기준이에요(츄르·꾸미기로 쓴 포인트도 포함). 직원 계정 최대 50개까지 보여요.</p></section>';
 const helpfulPanel=`<section class="stats-panel"><h2>유익해요 많이 받은 순위</h2>${helpful.length?`<ol class="userstats-list">${helpful.slice(0,5).map((r,i)=>`<li>${rankNo(i)}<span>${esc(r.username)}</span><strong>${r.n.toLocaleString('ko-KR')}개</strong></li>`).join('')}</ol>`:'<p class="stats-note">이 기간에 유익해요를 받은 질문이 없어요.</p>'}<p class="stats-note">게시판에 올린 질문이 다른 직원에게 받은 유익해요 수예요.</p></section>`;
 const members=levels.reduce((n,l)=>n+l.n,0),most=Math.max(1,...levels.map(l=>l.n));
 const levelPanel=`<section class="stats-panel"><h2>레벨 분포</h2><div class="stats-categories">${levels.map(l=>`<div title="Lv.${l.level} ${esc(names[l.level-1]?.name||'')}: ${l.n}명"><span><b>Lv.${l.level}</b> ${esc(names[l.level-1]?.name||'')}</span><strong>${l.n}명${members?` <small>${Math.round(l.n/members*100)}%</small>`:''}</strong><div class="stats-track"><i style="width:${l.n/most*100}%"></i></div></div>`).join('')}</div><p class="stats-note">직원 계정 ${members}개의 지금 레벨이에요. 레벨은 새 질문 수로 올라가요.</p></section>`;
 const scale=Math.max(1,accounts,...daily.map(d=>d.n));
 const attendancePanel=`<section class="stats-panel"><h2>출석 현황 <small>최근 7일</small></h2><div class="stats-bars" role="list">${daily.map(d=>`<div class="stats-bar ${d.day===s.day?'today':''}" role="listitem" title="${d.day}: ${d.n}명 출석${accounts?` (직원 ${accounts}명 중)`:''}" aria-label="${d.day}: ${d.n}명 출석"><strong>${d.n}</strong><div><i style="height:${d.n/scale*100}%"></i></div><span>${d.day===s.day?'오늘':d.day.slice(5).replace('-','/')}</span></div>`).join('')}</div>`
  +`<h3>연속 출석 상위</h3>${streaks.length?`<ol class="userstats-list">${streaks.map((r,i)=>`<li>${rankNo(i)}<span>${esc(r.username)}</span><strong>${r.days}일 연속</strong></li>`).join('')}</ol>`:'<p class="stats-note">아직 출석한 직원이 없어요.</p>'}</section>`;
 return `<section class="stats-page userstats">${header}<p class="stats-date">${esc(s.day)} · 한국 시간 기준 · 담당자 전용 · 익명성을 위해 아이디만 보여요</p>${metrics}${filter}<div class="userstats-grid">${points}<div class="userstats-side">${helpfulPanel}${levelPanel}${attendancePanel}</div></div><p class="stats-note">직원 계정의 포인트·레벨·출석과 게시판 유익해요만 집계합니다. 개인의 질문 내용은 통계에 표시하지 않아요.<br>마지막 조회 ${new Date(s.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})}</p></section>`;
}
/** 새 비밀번호 검사. 문제가 없으면 빈 글자. */
export function passwordProblem(current,next,confirm){
 if(!current)return '지금 비밀번호를 입력해 주세요.';
 if(next.length<8)return '새 비밀번호는 8자 이상이어야 해요.';
 if(next.length>128)return '새 비밀번호는 128자 이내로 정해 주세요.';
 if(next!==confirm)return '새 비밀번호 확인이 일치하지 않아요.';
 if(next===current)return '지금 비밀번호와 다른 비밀번호로 정해 주세요.';
 return '';
}
