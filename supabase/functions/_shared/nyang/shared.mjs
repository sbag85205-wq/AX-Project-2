// 자동 복사본입니다. 직접 고치지 말고 nyang-frontend/public/shared.js 를 고친 뒤 `npm run sync:nyang-server`를 실행하세요.
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
