-- 분야 관리: 관리자가 문서 분야(카테고리) 목록을 추가·삭제한다.
-- 기존 설정 표(app_settings, 한 줄)에 목록 칸만 더한다. 처음 값은 지금 쓰던 4개 분야다.
-- 읽기·수정 권한은 기존 정책(관리자만)을 그대로 쓴다.

alter table public.app_settings
  add column categories text[] not null
    default array['서버 설치 · 설정', '클라이언트 접속', '장애 조치', '기타']::text[]
    check (cardinality(categories) between 1 and 30);
