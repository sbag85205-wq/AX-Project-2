// 앞의 세 이름은 냥대리 채팅의 분야(nyang-frontend/public/core.js의 categories label)와 같아야
// 채팅에서 고른 분야의 문서 안에서 먼저 검색된다. '기타'는 어느 분야에도 넣기 어려운 문서·FAQ용이다.
export const CATEGORIES = ['서버 설치 · 설정', '클라이언트 접속', '장애 조치', '기타'] as const;

export const SUGGESTED_QUESTIONS = [
  'Linker Client는 어떻게 설치하나요?',
  '인증서버는 어떻게 등록하나요?',
  'VD에 접속하는 방법을 알려주세요',
  'VD 접속이 안 될 때 무엇을 확인하나요?'
];

/**
 * 첫 화면에서 카테고리를 고르면 보여줄 예시 질문과 연관 검색어.
 * 냥대리 채팅의 질문 예시(nyang-frontend/public/core.js의 faq)와 같은 내용으로 맞춘다.
 * 문서 내용은 적지 않고 질문 문장만 둔다. 연관 검색어를 누르면 입력칸에 채워져 이어서 질문할 수 있다.
 */
export const CATEGORY_SUGGESTIONS: Record<string, { questions: string[]; keywords: string[] }> = {
  '서버 설치 · 설정': {
    questions: ['Dcenter는 어떻게 설치하나요?', 'Dstation 설치 순서를 알려주세요', 'Host agent는 어떻게 설치하나요?', '도메인 환경은 어떻게 구성하나요?'],
    keywords: ['Dcenter 설치', 'CenterPost 설치', 'VDAgent 설치', '기본 설정']
  },
  '클라이언트 접속': {
    questions: ['Linker Client는 어떻게 설치하나요?', '인증서버는 어떻게 등록하나요?', 'VD에 접속하는 방법을 알려주세요', 'VD 전원 켜기·끄기·재시작은 어떻게 하나요?'],
    keywords: ['설치 요구사항', '인증서버 등록', 'VD 접속', 'Linker Client 삭제']
  },
  '장애 조치': {
    questions: ['VD 접속이 안 될 때 무엇을 확인하나요?', '로그인했는데 VD가 보이지 않아요', 'VD가 느릴 때 어떻게 조치하나요?', '프로비전이 실패하면 무엇을 확인하나요?'],
    keywords: ['접속 오류코드', 'VDAgent 재설치', '웹서버 접속 불가', '백업·복구']
  }
};
