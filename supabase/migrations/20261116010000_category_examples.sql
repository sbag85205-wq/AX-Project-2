-- 분야별 예시 질문: 분야 관리의 '설정'에서 분야마다 채팅 '질문 예시'에 보여 줄 질문을 넣고 고친다.
-- { "분야 이름": ["질문", ...] } 모양. 분야가 없으면(키가 없으면) 냥대리 기본 예시를 쓴다.
-- 분야 순서는 기존 categories 칸의 순서를 그대로 쓴다. 권한은 기존 app_settings 정책(관리자만)을 쓴다.

alter table public.app_settings
  add column category_examples jsonb not null default '{}'::jsonb
    check (jsonb_typeof(category_examples) = 'object');
