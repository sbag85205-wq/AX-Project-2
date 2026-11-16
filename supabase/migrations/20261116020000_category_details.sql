-- 분야 설명: 분야 관리의 '설정'에서 분야마다 채팅 '분야 변경' 창의 이름 아래 설명 글을 고친다.
-- { "분야 이름": "설명" } 모양. 키가 없는 분야는 냥대리 기본 설명을 쓴다.
-- 권한은 기존 app_settings 정책(관리자만)을 쓰고, 직원 채팅에는 chat 서버 함수가 대신 읽어 준다.

alter table public.app_settings
  add column category_details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(category_details) = 'object');
