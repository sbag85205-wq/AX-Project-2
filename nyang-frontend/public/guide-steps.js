// 첫 사용자 가이드의 단계 표. 문구·순서·가리키는 화면 요소를 바꿀 때는 이 파일만 고친다.
// (보여 주는 방법은 guide.js, 모양은 guide.css)
//
//  id       단계 이름(테스트·스타일용)
//  target   가리킬 화면 요소(CSS 선택자). 없거나 안 보이면 말풍선을 화면 가운데에 띄운다
//  title    말풍선 제목 (글자 그대로, HTML 아님)
//  body     말풍선 본문 (아래 GUIDE_TEXT 규칙: **굵게** 만 쓴다)
//  points   본문 아래 짧은 목록 (선택)
//  example  말풍선 안에 그릴 예시 화면 이름 (선택: answer · unknown · feedback)
//  mood     냥대리 표정 (default · happy)

/** 가이드 문구가 바뀌어 모두에게 다시 보여 줘야 할 때 이 숫자를 올린다. */
export const GUIDE_VERSION = 1;

export const GUIDE_STEPS = [
 {
  id: 'hello',
  target: '.cat-art.resident',
  mood: 'happy',
  title: '반갑다냥! 나는 냥대리다냥',
  body: '회사 일 하다가 궁금한 게 생기면 나한테 물어보라냥. 나는 **사내 문서에 있는 내용만 근거로 답한다냥.** 3분이면 쓰는 법을 다 알려주겠다냥!'
 },
 {
  id: 'ask',
  target: '#question-form',
  title: '질문은 여기에 쓰라냥',
  body: '궁금한 걸 적고 **Enter**를 누르면 된다냥.',
  points: [
   '**분야 변경**으로 분야를 고르면 그 분야 문서부터 찾아서 더 정확하다냥.',
   '뭘 물어볼지 모르겠으면 **질문 예시**를 눌러보라냥.'
  ]
 },
 {
  id: 'answer',
  example: 'answer',
  title: '답변은 출처와 함께 읽으라냥',
  body: '답변 아래 **출처(문서명·쪽수)**를 누르면 그 문서 원문을 바로 볼 수 있다냥. **중요한 건 꼭 출처에서 확인하라냥!**'
 },
 {
  id: 'unknown',
  example: 'unknown',
  title: '모르는 건 모른다고 한다냥',
  body: '문서에서 근거를 못 찾으면 **"등록된 근거가 부족해요"**라고 솔직하게 말한다냥. 억지로 지어내지 않는다냥.',
  points: [
   '그럴 땐 **익명으로 질문하기**로 질문 게시판에 남기라냥.',
   '담당자가 보고 답을 달아준다냥. 이름은 보이지 않는다냥.'
  ]
 },
 {
  id: 'feedback',
  example: 'feedback',
  title: '답변이 어땠는지 알려달라냥',
  body: '**도움돼요 / 아쉬워요**를 눌러주면 담당자가 보고 문서와 FAQ를 고친다냥. 그러면 내가 점점 더 똑똑해진다냥.'
 },
 {
  id: 'menus',
  target: '.workspace-nav',
  title: '다른 메뉴도 있다냥',
  points: [
   '**내 일정**: 할 일과 일정을 정리한다냥.',
   '**질문 게시판**: 다른 직원의 질문과 담당자 답변을 본다냥.',
   '**내 활동**: 내가 한 질문과 레벨을 모아 본다냥.',
   '**사내 문서**: 등록된 문서를 직접 찾아본다냥.'
  ]
 },
 {
  id: 'fun',
  target: '.workspace-utilities',
  mood: 'happy',
  title: '나랑 놀아주면 좋겠다냥',
  points: [
   '**출석**하고 질문하면 **포인트**가 쌓이고 **레벨**이 오른다냥.',
   '포인트로 **츄르**를 주면 기뻐한다냥. **꾸미기**로 옷도 입혀달라냥.',
   '**차가운/따뜻한 모드**로 내 말투를 바꿀 수 있다냥.',
   '이 안내는 옆의 **가이드** 버튼으로 언제든 다시 볼 수 있다냥!'
  ]
 }
];

/** 말풍선 글의 **굵게** 표시만 <strong>으로 바꾼다. 나머지는 모두 글자 그대로(HTML 이스케이프) 보여 준다. */
export function guideText(text, esc) {
 return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
