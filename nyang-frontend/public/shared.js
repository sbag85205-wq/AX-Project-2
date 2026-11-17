// 여러 파일이 함께 쓰는 작은 규칙과 도구. 같은 내용을 파일마다 복사해 두지 말고 여기서 가져다 쓴다.
// (브라우저 화면 모듈과 lib/의 서버·저장소 규칙이 모두 가져다 쓰므로 다른 파일을 import하지 않는다)

/** HTML에 글자를 넣기 전에 특수문자를 바꾼다(&<>"'). */
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** 지금 기본 분야 id (냥대리 채팅의 기본 분야) */
export const CURRENT_CATEGORY_IDS=['server','client','trouble','etc'];
/** 저장된 기록에서 받아들이는 고정 분야 id: 지금 기본 분야 + 예전 분야(휴가·급여·출장·생활) */
export const FIXED_CATEGORY_IDS=[...CURRENT_CATEGORY_IDS,'hr','pay','trip','life'];
/** 담당자가 분야 관리에서 만든 분야 id인지(custom:<이름>, 이름 30자 이내) */
export const isCustomCategoryId=id=>/^custom:.{1,30}$/.test(id);
/** 저장된 대화·질문 기록의 분야 id가 유효한지: 고정 분야이거나 담당자가 만든 분야 */
export const isCategoryId=id=>FIXED_CATEGORY_IDS.includes(id)||(typeof id==='string'&&isCustomCategoryId(id));

/** 질문 게시판 '유익해요' 한 번에 글쓴이가 받는 포인트(drizzle 0006 트리거와 같다) */
export const HELPFUL_POINTS=10;

/**
 * 네 발로 걷는 냥대리: 받은 걷는 옆모습 그림(assets/nyang-walk2.webp)을 몸과 네 다리로 잘라(nyang-loading.css)
 * 대각선 두 쌍의 다리가 번갈아 앞뒤로 움직이고 몸이 걸음마다 살짝 들썩인다. 다리는 몸 뒤에 있어 이음매가 가려진다.
 */
export const WALKING_CAT_HTML='<span class="cat-rig" aria-hidden="true"><i class="cr-l2"></i><i class="cr-l1"></i><i class="cr-l3"></i><i class="cr-l4"></i><i class="cr-body"></i></span>';

/**
 * 불러오는 중 표시. 화면 전체를 불러올 때는 걷는 냥대리 + 글, compact(작은 곳: 원문 한 조각·설정 칸 등)는 글만.
 * text: 보여 줄 글(끝의 '...'은 저절로 움직인다).
 */
export const loadingHTML=(text='불러오는 중',{compact=false}={})=>{
 const words=`${esc(String(text).replace(/[.…]+$/,''))}<span class="nyang-loading-dots" aria-hidden="true"></span>`;
 if(compact)return `<p class="nyang-loading-text" role="status">${words}</p>`;
 return `<div class="nyang-loading" role="status" aria-live="polite"><div class="nyang-loading-track" aria-hidden="true"><span class="nyang-loading-walker">${WALKING_CAT_HTML}<span class="nyang-loading-shadow"></span></span></div><p>${words}</p></div>`;
};
