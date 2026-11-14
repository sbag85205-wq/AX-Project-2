// 담당자 화면 ↔ main 백엔드(Knowly·Supabase) 관리자 기능. 서버 연결이 없으면 null을 돌려 기존 샘플 화면을 그대로 쓴다.
export const KNOWLY_CATEGORIES=['급여','휴가','복리후생','근무제도','경비','IT','인사정보','기타'];
const STATUSES=['신규','검토 중','FAQ 등록 완료','보류'];
const DOC_STATUS={ready:'사용 중',processing:'처리 중',failed:'실패',archived:'보관됨'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=s=>s?new Date(s).toLocaleDateString('ko-KR',{year:'numeric',month:'short',day:'numeric'}):'—';
const header=(title,description)=>`<header class="admin-heading"><p>관리자 워크스페이스</p><h1>${title}</h1><div>${description}</div></header>`;
const options=(list,selected)=>list.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
const DATA_OP={faq:'faq.list',documents:'doc.list',users:'user.list',model:'settings.get',statistics:'stats'};

export async function knowlyAdminCall(op,body={},fetchImpl=fetch){
 const res=await fetchImpl('/api/knowly-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,op})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=Error(data?.error||'요청을 처리하지 못했어요.');e.status=res.status;throw e;}
 return data;
}

export function createKnowlyAdmin({onChange,toast,call=knowlyAdminCall}){
 let connection='unknown',connectionError='';
 const data={},errors={},loading=new Set(),filters={faq:{q:'',category:'all'},documents:{q:'',category:'all'},statistics:{status:'all'}};
 let busy=false,testResult=null;
 async function load(view,force=false){
  if(loading.has(view)||(!force&&data[view]))return;
  loading.add(view);delete errors[view];
  try{
   if(connection==='unknown'){await call('status');connection='on';}
   data[view]=await call(DATA_OP[view],view==='statistics'?{days:30}:{});
  }catch(e){if(e.status===503)connection='off';else if(connection==='unknown'){connection='error';connectionError=e.message;}else errors[view]=e.message;}
  finally{loading.delete(view);onChange(view);}
 }
 async function act(view,op,body,{confirmText,reload=true}={}){
  if(busy)return;if(confirmText&&!window.confirm(confirmText))return;
  busy=true;
  try{const r=await call(op,body);if(r?.notice)toast(r.notice);if(op==='settings.test')testResult=r;if(reload){data[view]=null;await load(view,true);}else onChange(view);return r;}
  catch(e){toast(e.message);}
  finally{busy=false;}
 }
 const loadingHTML=(title)=>`<section class="admin-page">${header(title,'Knowly 운영 서버에서 불러오는 중이에요.')}<p class="admin-notice" role="status">불러오는 중…</p></section>`;
 const errorHTML=(title,message,view)=>`<section class="admin-page">${header(title,'Knowly 운영 서버에 연결하지 못했어요.')}<p class="admin-notice" role="alert">${esc(message)}</p><button class="secondary-button" data-ka="retry" data-view="${view}">다시 시도</button></section>`;
 const connected='<span class="admin-tag">Knowly 운영 서버 연결됨</span>';

 function faqHTML(d){
  const f=filters.faq,q=f.q.toLocaleLowerCase('ko');
  const items=(d.faqs||[]).filter(x=>(f.category==='all'||x.category===f.category)&&(x.question+' '+x.answer).toLocaleLowerCase('ko').includes(q));
  const form=(x={})=>`<form data-ka-form="faq.save" class="admin-model-fields">${x.id?`<input type="hidden" name="id" value="${esc(x.id)}">`:''}<label>질문<input name="question" required maxlength="500" value="${esc(x.question||'')}"></label><label>분야<select name="category">${options(KNOWLY_CATEGORIES,x.category||'기타')}</select></label><label>답변<textarea name="answer" required maxlength="8000" rows="5">${esc(x.answer||'')}</textarea></label><label><input type="checkbox" name="active" ${x.active===false?'':'checked'}> 답변에 사용</label><button class="primary-button">${x.id?'수정 저장':'FAQ 추가'}</button>${x.id?`<button type="button" class="text-button" data-ka="faq.delete" data-id="${esc(x.id)}">삭제</button>`:''}</form>`;
  return `<section class="admin-page">${header('FAQ 관리','등록한 FAQ는 같은 뜻의 질문에 바로 쓰여요.')}<p class="admin-notice">${connected} 저장하면 냥대리와 Knowly 답변에 바로 반영돼요.</p><form data-ka-filter="faq" class="admin-search"><label>분야<select name="category"><option value="all">전체 분야</option>${options(KNOWLY_CATEGORIES,f.category)}</select></label><label>질문 검색<input name="query" value="${esc(f.q)}" placeholder="질문·답변 내용으로 검색"></label><button class="secondary-button">검색</button></form><details class="admin-faq"><summary><strong>새 FAQ 등록</strong><span>열기</span></summary><div>${form()}</div></details><div class="admin-list-title"><h2>등록된 FAQ <span role="status">${items.length}개 / 전체 ${(d.faqs||[]).length}개</span></h2></div><div class="admin-faq-list">${items.map(x=>`<details class="admin-faq"><summary><span class="admin-tag">${esc(x.category)}</span><strong>${esc(x.question)}</strong><span>${x.active?'사용 중':'숨김'} · ${day(x.updated_at)}</span></summary><div>${form(x)}</div></details>`).join('')||'<p class="admin-empty">조건에 맞는 FAQ가 없습니다.</p>'}</div></section>`;
 }
 function documentsHTML(d){
  const f=filters.documents,q=f.q.toLocaleLowerCase('ko');
  const items=(d.documents||[]).filter(x=>(f.category==='all'||x.category===f.category)&&(x.title+' '+x.version).toLocaleLowerCase('ko').includes(q));
  return `<section class="admin-page admin-documents">${header('문서 관리','냥대리가 답변 근거로 찾는 사내 문서를 등록하고 관리하세요.')}<p class="admin-notice">${connected} 여기서는 텍스트 문서(.txt·.md·.csv)나 붙여 넣은 글을 등록해요. PDF·엑셀 원본은 Knowly 관리자 화면에서 등록해 주세요.</p><details class="admin-faq"><summary><strong>문서 등록</strong><span>열기</span></summary><div><form data-ka-form="doc.create" class="admin-model-fields"><label>문서명<input name="title" required maxlength="200"></label><label>분야<select name="category">${options(KNOWLY_CATEGORIES,'기타')}</select></label><label>버전<input name="version" maxlength="40" placeholder="v1"></label><label>시행일<input type="date" name="effective_from"></label><label>텍스트 파일<input type="file" name="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"></label><label>또는 내용 붙여 넣기<textarea name="text" rows="6" placeholder="파일을 고르지 않으면 이 내용을 등록해요."></textarea></label><button class="primary-button">등록</button></form></div></details><form data-ka-filter="documents" class="admin-search"><label>분야<select name="category"><option value="all">전체 분야</option>${options(KNOWLY_CATEGORIES,f.category)}</select></label><label>문서 검색<input name="query" value="${esc(f.q)}" placeholder="문서명 또는 버전"></label><button class="secondary-button">검색</button></form><div class="admin-list-title"><h2>등록 문서 <span role="status">${items.length}개 / 전체 ${(d.documents||[]).length}개</span></h2><button class="secondary-button" data-ka="doc.reindex">의미 검색 다시 색인</button></div><div class="admin-document-table-wrap"><table class="admin-table admin-document-table"><caption class="sr-only">문서 목록</caption><thead><tr><th scope="col">문서명</th><th scope="col">분야</th><th scope="col">버전</th><th scope="col">쪽</th><th scope="col">상태</th><th scope="col">등록일</th><th scope="col">관리</th></tr></thead><tbody>${items.map(x=>`<tr><td><strong>${esc(x.title)}</strong>${x.error?`<br><small>${esc(x.error)}</small>`:''}</td><td>${esc(x.category)}</td><td>${esc(x.version)}</td><td>${Number(x.page_count)||'—'}</td><td><span class="admin-tag">${esc(DOC_STATUS[x.status]||x.status)}</span></td><td>${day(x.created_at)}</td><td>${x.status==='ready'?`<button class="text-button" data-ka="doc.status" data-id="${esc(x.id)}" data-status="archived">보관</button>`:x.status==='archived'?`<button class="text-button" data-ka="doc.status" data-id="${esc(x.id)}" data-status="ready">다시 사용</button>`:''}<button class="text-button" data-ka="doc.delete" data-id="${esc(x.id)}">삭제</button></td></tr>`).join('')||'<tr><td colspan="7" class="admin-empty">조건에 맞는 문서가 없습니다.</td></tr>'}</tbody></table></div></section>`;
 }
 function usersHTML(d){
  const depts=d.departments||[],deptOptions=sel=>`<option value="">부서 없음</option>${depts.map(x=>`<option value="${esc(x.id)}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('')}`;
  return `<section class="admin-page">${header('사용자 관리','Knowly 계정과 권한을 관리하세요.')}<p class="admin-notice">${connected} 냥대리 로그인(user01·admin01)은 시연 계정이며, 이 목록은 Knowly 계정입니다.</p><details class="admin-faq"><summary><strong>사용자 추가</strong><span>열기</span></summary><div><form data-ka-form="user.create" class="admin-model-fields"><label>아이디<input name="login_id" required pattern="[a-z0-9._\\-]{3,40}" placeholder="영문 소문자·숫자"></label><label>이름<input name="display_name" maxlength="40"></label><label>비밀번호<input type="password" name="password" required minlength="8" maxlength="72" autocomplete="new-password"></label><label>부서<select name="department_id">${deptOptions('')}</select></label><label>권한<select name="role"><option value="employee">직원</option><option value="admin">관리자</option></select></label><button class="primary-button">추가</button></form><form data-ka-form="dept.create" class="admin-model-fields"><label>새 부서<input name="name" required maxlength="40"></label><button class="secondary-button">부서 추가</button></form></div></details><div class="admin-list-title"><h2>Knowly 계정 <span>${(d.users||[]).length}</span></h2></div><table class="admin-table"><thead><tr><th>아이디</th><th>이름</th><th>부서</th><th>권한</th><th>관리</th></tr></thead><tbody>${(d.users||[]).map(u=>`<tr><td>${esc(u.login_id)}</td><td>${esc(u.display_name)}</td><td><select aria-label="${esc(u.login_id)} 부서" data-ka-change="user.update" data-field="department_id" data-id="${esc(u.id)}">${deptOptions(u.department_id)}</select></td><td><select aria-label="${esc(u.login_id)} 권한" data-ka-change="user.update" data-field="role" data-id="${esc(u.id)}"><option value="employee" ${u.role==='employee'?'selected':''}>직원</option><option value="admin" ${u.role==='admin'?'selected':''}>관리자</option></select></td><td><button class="text-button" data-ka="user.reset" data-id="${esc(u.id)}" data-name="${esc(u.login_id)}">비밀번호 변경</button><button class="text-button" data-ka="user.delete" data-id="${esc(u.id)}" data-name="${esc(u.login_id)}">삭제</button></td></tr>`).join('')||'<tr><td colspan="5" class="admin-empty">계정이 없습니다.</td></tr>'}</tbody></table></section>`;
 }
 function modelHTML(d){
  const s=d.settings||{},models=d.models||[],t=testResult;
  return `<section class="admin-page">${header('검색 모델 설정','답변 생성 모델과 문서 검색 기준을 정하세요.')}<div class="admin-connection"><div>${connected}<h2>${esc(s.llm_model||d.default_model||'기본 모델')}</h2><p>답변 모델 ${d.llm_configured?'연결됨':'미연결(검색 결과만 보여줌)'} · 의미 검색 ${d.embedding_configured?'연결됨':'미연결(키워드 검색만)'}</p></div></div><form data-ka-form="settings.save" class="admin-model-fields"><label>답변 모델<input name="llm_model" list="knowly-models" maxlength="120" value="${esc(s.llm_model||'')}" placeholder="${esc(d.default_model||'기본 모델 사용')}"><datalist id="knowly-models">${models.map(m=>`<option value="${esc(m.id)}">${esc(m.name||m.id)}</option>`).join('')}</datalist></label><label>키워드 검색 최소 점수 (0~1)<input type="number" name="keyword_min" min="0" max="1" step="0.01" value="${esc(s.keyword_min??0.35)}"></label><label>의미 검색 최소 점수 (0~1)<input type="number" name="vector_min" min="0" max="1" step="0.01" value="${esc(s.vector_min??0.55)}"></label><label>의미 검색 비중 (0~1)<input type="number" name="vector_weight" min="0" max="1" step="0.01" value="${esc(s.vector_weight??0.6)}"></label><button type="button" class="secondary-button" data-ka="settings.test">연결 테스트</button><button class="primary-button">설정 저장</button></form>${t?`<p class="admin-notice" role="status">${t.ok?`${esc(t.model)} 응답 확인 · ${Number(t.latency_ms)||0}ms`:`${esc(t.model)} 연결 실패: ${esc(t.error||'')}`}</p>`:''}<section class="admin-info"><h2>참고</h2><p>API 키는 Knowly 서버의 비밀 설정으로 관리되며 이 화면에 표시하거나 입력하지 않아요.</p></section></section>`;
 }
 function statsSection(){
  if(connection==='off')return '';
  const d=data.statistics;
  if(connection==='error')return `<section class="admin-info"><h2>사내 문서 검색 이용 현황</h2><p>${esc(connectionError)}</p></section>`;
  if(!d)return `<section class="admin-info"><h2>사내 문서 검색 이용 현황</h2><p role="status">${errors.statistics?esc(errors.statistics):'불러오는 중…'}</p></section>`;
  const u=d.usage||{},f=filters.statistics,groups=(d.groups||[]).filter(g=>f.status==='all'||g.status===f.status);
  const n=k=>Number(u[k])||0,rate=n('total')?Math.round(n('answered')/n('total')*100):0;
  return `<section class="admin-info"><h2>사내 문서 검색 이용 현황 <small>최근 ${d.days}일 · Knowly</small></h2><table class="admin-table"><tbody><tr><th>질문</th><td>${n('total')}건</td><th>이용자</th><td>${n('active_users')}명</td></tr><tr><th>답변 성공</th><td>${n('answered')}건 (${rate}%)</td><th>근거 부족</th><td>${n('insufficient')}건</td></tr><tr><th>오류</th><td>${n('errors')}건</td><th>평균 응답</th><td>${(n('avg_latency_ms')/1000).toFixed(1)}초</td></tr><tr><th>좋아요 / 아쉬워요</th><td>${n('feedback_up')} / ${n('feedback_down')}</td><th>토큰(입력/출력)</th><td>${n('input_tokens').toLocaleString()} / ${n('output_tokens').toLocaleString()}</td></tr></tbody></table></section><section class="admin-info"><h2>답하지 못한 질문 <small>${groups.length}개</small></h2><form data-ka-filter="statistics" class="admin-search"><label>상태<select name="status"><option value="all">전체</option>${options(STATUSES,f.status)}</select></label><button class="secondary-button">보기</button></form><div class="admin-faq-list">${groups.map(g=>`<details class="admin-faq"><summary><span class="admin-tag">${esc(g.status)}</span><strong>${esc(g.question)}</strong><span>${esc(g.category)} · ${day(g.last_asked_at)}</span></summary><div>${g.status==='FAQ 등록 완료'?'<p>FAQ로 등록된 질문이에요.</p>':`<label>상태<select data-ka-change="group.status" data-id="${esc(g.id)}">${options(STATUSES.filter(s=>s!=='FAQ 등록 완료'),g.status)}</select></label><form data-ka-form="group.faq" class="admin-model-fields"><input type="hidden" name="id" value="${esc(g.id)}"><label>FAQ 질문<input name="question" required maxlength="500" value="${esc(g.question)}"></label><label>분야<select name="category">${options(KNOWLY_CATEGORIES,KNOWLY_CATEGORIES.includes(g.category)?g.category:'기타')}</select></label><label>답변<textarea name="answer" required rows="4" maxlength="8000"></textarea></label><button class="primary-button">FAQ로 등록</button></form>`}</div></details>`).join('')||'<p class="admin-empty">해당하는 질문이 없습니다.</p>'}</div></section>`;
 }
 const TITLES={faq:'FAQ 관리',documents:'문서 관리',users:'사용자 관리',model:'검색 모델 설정'};
 /** 관리자 화면 HTML. 연결이 없으면 null(기존 샘플 화면 사용). */
 function html(view){
  if(connection==='off')return null;
  if(!data[view]){load(view);}
  if(connection==='error')return errorHTML(TITLES[view],connectionError,view);
  if(errors[view])return errorHTML(TITLES[view],errors[view],view);
  if(!data[view])return loadingHTML(TITLES[view]);
  return {faq:faqHTML,documents:documentsHTML,users:usersHTML,model:modelHTML}[view](data[view]);
 }
 const wrap=(view,body)=>body===null?null:`<div data-ka-view="${view}">${body}</div>`;
 function statsHTML(){if(connection!=='off'&&!data.statistics)load('statistics');const body=statsSection();return body?`<div class="admin-page" data-ka-view="statistics">${body}</div>`:'';}
 const viewOf=el=>el.closest('[data-ka-view]')?.dataset.kaView;

 async function onSubmit(form,view){
  const fd=new FormData(form),v=k=>String(fd.get(k)??'');
  const op=form.dataset.kaForm;
  if(op==='faq.save')return act(view,op,{id:v('id')||undefined,question:v('question'),answer:v('answer'),category:v('category'),active:fd.has('active')});
  if(op==='doc.create'){
   const file=fd.get('file');let text=v('text');
   if(file&&file.size){if(file.size>3_000_000){toast('파일은 3MB 이하만 등록할 수 있어요.');return;}text=await file.text();}
   if(!text.trim()){toast('파일을 고르거나 내용을 붙여 넣어 주세요.');return;}
   return act(view,op,{title:v('title'),category:v('category'),version:v('version'),effective_from:v('effective_from'),text});
  }
  if(op==='user.create')return act(view,op,{login_id:v('login_id'),display_name:v('display_name'),password:v('password'),department_id:v('department_id')||null,role:v('role')});
  if(op==='dept.create')return act(view,op,{name:v('name')});
  if(op==='settings.save')return act(view,op,{settings:{llm_model:v('llm_model'),keyword_min:v('keyword_min'),vector_min:v('vector_min'),vector_weight:v('vector_weight')}});
  if(op==='group.faq')return act(view,op,{id:v('id'),question:v('question'),answer:v('answer'),category:v('category')});
 }
 function bind(root=document){
  root.addEventListener('submit',e=>{
   const form=e.target.closest?.('form[data-ka-form],form[data-ka-filter]');const view=form&&viewOf(form);if(!form||!view)return;
   e.preventDefault();
   if(form.dataset.kaFilter){const fd=new FormData(form),key=form.dataset.kaFilter;filters[key]=key==='statistics'?{status:String(fd.get('status')||'all')}:{q:String(fd.get('query')||'').trim(),category:String(fd.get('category')||'all')};onChange(view);return;}
   onSubmit(form,view);
  });
  root.addEventListener('click',e=>{
   const b=e.target.closest?.('button[data-ka]');const view=b&&viewOf(b);if(!b||!view)return;
   e.preventDefault();const op=b.dataset.ka,id=b.dataset.id;
   if(op==='retry'){if(connection==='error')connection='unknown';delete errors[view];data[view]=null;load(view,true);onChange(view);return;}
   if(op==='faq.delete')return act(view,op,{id},{confirmText:'이 FAQ를 삭제할까요?'});
   if(op==='doc.delete')return act(view,op,{id},{confirmText:'이 문서와 검색 데이터를 삭제할까요? 되돌릴 수 없어요.'});
   if(op==='doc.status')return act(view,op,{id,status:b.dataset.status});
   if(op==='doc.reindex')return act(view,op,{},{confirmText:'등록된 문서를 현재 임베딩 모델로 다시 색인할까요? 시간이 걸릴 수 있어요.'});
   if(op==='user.delete')return act(view,op,{id},{confirmText:`${b.dataset.name} 계정을 삭제할까요?`});
   if(op==='user.reset'){const password=window.prompt(`${b.dataset.name}의 새 비밀번호 (8자 이상)`);if(password)return act(view,op,{id,password},{reload:false});return;}
   if(op==='settings.test'){const model=b.form?.elements.llm_model?.value||'';return act(view,op,{model},{reload:false});}
  });
  root.addEventListener('change',e=>{
   const s=e.target.closest?.('select[data-ka-change]');const view=s&&viewOf(s);if(!s||!view)return;
   if(s.dataset.kaChange==='user.update')return act(view,'user.update',{id:s.dataset.id,[s.dataset.field]:s.value||null});
   if(s.dataset.kaChange==='group.status')return act(view,'group.status',{id:s.dataset.id,status:s.value});
  });
 }
 return {html:view=>wrap(view,html(view)),statsHTML,bind,load,get connection(){return connection;}};
}
