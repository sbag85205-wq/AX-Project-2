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

/** 네 발로 걷는 옆모습 냥대리(회청색 몸·흰 가슴과 볼·분홍 귀·졸린 눈·파란 사원증 목걸이). 움직임은 nyang-loading.css. */
export const WALKING_CAT_SVG='<svg class="walking-cat" viewBox="0 0 136 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="#1f2638" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g class="wc-tail"><path d="M31 54 C 17 52 8 40 12 27 C 14 19 22 18 23 24 C 20 34 25 44 36 46" fill="#808bac"/><path d="M14 33 C 15 40 19 45 25 48" stroke="#6d7798" stroke-width="2"/></g><g class="wc-leg wc-b"><path d="M37.5 58 C 37.5 67 38.4 74 38.6 79 L 47.4 79 C 47.6 74 48.5 67 48.5 58 Z" fill="#6d7798"/><path d="M37.4 79 C 37 84.5 50.5 84.5 49.6 79 Z" fill="#e3e0e6"/><path d="M42.5 80.5 L 42.5 82.5 M46 80.5 L 46 82.5" stroke-width="1.1"/></g><g class="wc-leg wc-a"><path d="M77.5 58 C 77.5 67 78.4 74 78.6 79 L 87.4 79 C 87.6 74 88.5 67 88.5 58 Z" fill="#6d7798"/><path d="M77.4 79 C 77 84.5 90.5 84.5 89.6 79 Z" fill="#e3e0e6"/><path d="M82.5 80.5 L 82.5 82.5 M86 80.5 L 86 82.5" stroke-width="1.1"/></g><g class="wc-body"><path d="M28 55 C 28 41 44 35 62 36 C 80 37 94 42 94 55 C 94 67 82 72 61 72 C 40 72 28 67 28 55 Z" fill="#808bac"/><path d="M34 62 C 44 68 70 69 88 63" stroke="#6d7798" stroke-width="2"/><path d="M77 46 C 86 48 92 54 91 62 C 87 67 80 67 77 61 C 75 56 75 50 77 46 Z" fill="#f7f3f0" stroke="none"/><path d="M80 60 L 82 63 L 84 60 M85 61 L 87 64 L 89 60" stroke="#f7f3f0" stroke-width="1.6"/></g><g class="wc-leg wc-a"><path d="M31.5 60 C 31.5 69 32.4 76 32.6 81 L 41.4 81 C 41.6 76 42.5 69 42.5 60 Z" fill="#808bac"/><path d="M31.4 81 C 31 86.5 44.5 86.5 43.6 81 Z" fill="#f7f3f0"/><path d="M36.5 82.5 L 36.5 84.5 M40 82.5 L 40 84.5" stroke-width="1.1"/></g><g class="wc-leg wc-b"><path d="M71.5 60 C 71.5 69 72.4 76 72.6 81 L 81.4 81 C 81.6 76 82.5 69 82.5 60 Z" fill="#808bac"/><path d="M71.4 81 C 71 86.5 84.5 86.5 83.6 81 Z" fill="#f7f3f0"/><path d="M76.5 82.5 L 76.5 84.5 M80 82.5 L 80 84.5" stroke-width="1.1"/></g><g class="wc-head"><path d="M100 13 C 104 7 108 4 112 3 C 114 9 114 16 113 21" fill="#6d7798"/><path d="M77 24 C 77 12 81 4 86 1 C 91 6 97 12 100 15" fill="#808bac"/><path d="M81.5 20 C 82 13 84.5 8 87 6 C 90 10 93 13 95 15.5 Z" fill="#f4aaa3" stroke="none"/><circle cx="99" cy="36" r="25" fill="#808bac"/><path d="M95 43 C 102 38 117 38 122 44 C 123 54 112 61 101 59 C 93 57 90 48 95 43 Z" fill="#f7f3f0" stroke="none"/><path d="M80 39 L 93 38 M81 44 L 93 42" stroke-width="1.5"/><path d="M100 32 Q 107 27 114 31" stroke-width="2.6"/><path d="M101.5 32.5 Q 107.5 39 113.5 32.3" fill="#fff"/><circle cx="109.5" cy="34" r="2.6" fill="#1f2638" stroke="none"/><circle cx="110.3" cy="33.2" r="0.7" fill="#fff" stroke="none"/><path d="M103 24 Q 108 22 112.5 24" stroke-width="1.8"/><ellipse cx="123" cy="40" rx="2.3" ry="1.8" fill="#1f2638" stroke="none"/><path d="M120 46.5 Q 122 48.5 124 46.5" stroke-width="1.6"/></g><g class="wc-badge"><path d="M86 54 C 90 58 94 59 98 58" stroke="#2f6fd6" stroke-width="2.4"/><rect x="93" y="59" width="8.5" height="10.5" rx="1.6" fill="#fff" stroke="#2f6fd6" stroke-width="2"/><rect x="95.3" y="62" width="4" height="4.3" fill="#d4e3fb" stroke="none"/></g></g></svg>';

/**
 * 불러오는 중 표시(네 발로 걷는 냥대리 + 글). 모양은 nyang-loading.css.
 * text: 보여 줄 글(끝의 '...'은 저절로 움직인다), compact: 한 줄로 작게.
 */
export const loadingHTML=(text='불러오는 중',{compact=false}={})=>`<div class="nyang-loading${compact?' compact':''}" role="status" aria-live="polite"><div class="nyang-loading-track" aria-hidden="true"><span class="nyang-loading-walker">${WALKING_CAT_SVG}<span class="nyang-loading-shadow"></span></span></div><p>${esc(String(text).replace(/[.…]+$/,''))}<span class="nyang-loading-dots" aria-hidden="true"></span></p></div>`;
