-- Knowly 데모용 가상 데이터. 실제 기업 규정이 아니다.
-- SQL Editor에서 마이그레이션 다음에 한 번 실행한다.

insert into public.departments (name) values
  ('인사팀'), ('재무팀'), ('개발팀'), ('영업팀'), ('운영팀')
on conflict (name) do nothing;

-- ───────── 가상 문서 ─────────
with d as (
  insert into public.documents (title, category, version, effective_from, page_count, status)
  values ('[가상] 휴가·근태 규정', '휴가', 'v2', '2026-01-01', 3, 'ready')
  returning id
)
insert into public.chunks (document_id, seq, section_title, page_start, page_end, content)
select d.id, x.seq, x.section_title, x.page_start, x.page_end, x.content
from d, (values
  (0, '제1조 연차 휴가', 1, 1, '제1조 연차 휴가
1년간 80% 이상 출근한 직원에게 15일의 연차 휴가를 부여한다. 3년 이상 근속한 경우 매 2년마다 1일을 가산하며 최대 25일로 한다.
입사 1년 미만 직원은 1개월 개근 시 1일의 연차가 발생한다.'),
  (1, '제2조 연차 신청 절차', 1, 2, '제2조 연차 신청 절차
연차는 사용 예정일 3영업일 전까지 그룹웨어 > 근태관리 > 휴가 신청 메뉴에서 신청한다.
신청 후 소속 팀장이 승인하며, 3일 이상 연속 사용 시 부서장 승인이 추가로 필요하다.
긴급한 사유로 당일 사용하는 경우 오전 9시 전까지 팀장에게 연락하고, 다음 날까지 시스템에 사후 등록한다.'),
  (2, '제3조 반차', 2, 2, '제3조 반차
연차는 0.5일(반차) 단위로 사용할 수 있다. 오전 반차는 09:00~14:00, 오후 반차는 14:00~18:00 근무를 면제한다.
0.25일 단위(반반차) 사용은 허용하지 않는다.'),
  (3, '제4조 경조 휴가', 3, 3, '제4조 경조 휴가
본인 결혼 5일, 자녀 결혼 1일, 배우자 출산 10일, 부모·배우자 사망 5일, 조부모 사망 3일의 유급 경조 휴가를 부여한다.
경조 휴가 일수에는 휴일을 포함하지 않으며, 사유 발생일로부터 30일 이내에 사용한다. 증빙 서류는 사용 후 7일 이내에 인사팀에 제출한다.'),
  (4, '제5조 출퇴근', 3, 3, '제5조 출퇴근
기본 근무 시간은 09:00~18:00이며 점심시간은 12:00~13:00이다.
시차출퇴근제를 신청한 직원은 08:00~10:00 사이에 출근하여 8시간 근무한다. 신청은 매월 25일까지 다음 달 근무 형태를 등록한다.')
) as x(seq, section_title, page_start, page_end, content);

with d as (
  insert into public.documents (title, category, version, effective_from, page_count, status)
  values ('[가상] 급여·복리후생 안내', '급여', 'v1', '2026-03-01', 2, 'ready')
  returning id
)
insert into public.chunks (document_id, seq, section_title, page_start, page_end, content)
select d.id, x.seq, x.section_title, x.page_start, x.page_end, x.content
from d, (values
  (0, '1. 급여 지급', 1, 1, '1. 급여 지급
급여는 매월 25일에 지급한다. 지급일이 휴일이면 직전 영업일에 지급한다.
급여 명세서는 인사시스템 > 급여 > 명세서 조회에서 확인할 수 있다.'),
  (1, '2. 증명서 발급', 1, 1, '2. 증명서 발급
재직증명서, 경력증명서, 근로소득 원천징수영수증은 인사시스템 > 증명서 발급 메뉴에서 직접 출력한다.
원천징수영수증은 전년도분이 매년 3월 10일 이후 발급 가능하다.'),
  (2, '3. 건강검진', 2, 2, '3. 건강검진
직원 본인은 매년 1회 종합건강검진 비용을 전액 지원한다.
배우자는 2년에 1회 50만 원 한도로 지원하며, 부모 검진은 지원하지 않고 제휴 병원 할인만 적용된다. 신청 기간은 매년 4월과 9월이다.'),
  (3, '4. 자기계발비', 2, 2, '4. 자기계발비
업무 관련 도서·온라인 강의·자격증 응시료를 연 100만 원 한도로 지원한다.
결제 후 30일 이내에 영수증을 첨부해 경비 시스템에 청구한다.')
) as x(seq, section_title, page_start, page_end, content);

with d as (
  insert into public.documents (title, category, version, effective_from, page_count, status)
  values ('[가상] 출장·경비 정산 매뉴얼', '경비', 'v1', '2026-02-01', 2, 'ready')
  returning id
)
insert into public.chunks (document_id, seq, section_title, page_start, page_end, content)
select d.id, x.seq, x.section_title, x.page_start, x.page_end, x.content
from d, (values
  (0, '1. 출장 신청', 1, 1, '1. 출장 신청
국내 출장은 출발 2영업일 전까지 그룹웨어 > 출장 신청에서 일정·목적·예상 경비를 입력해 팀장 승인을 받는다.
숙박비는 1박 10만 원(서울·광역시 12만 원) 한도로 실비 정산한다. 일비는 1일 3만 원을 정액 지급한다.'),
  (1, '2. 경비 정산', 1, 2, '2. 경비 정산
출장 종료 후 7영업일 이내에 경비 시스템에서 정산한다. 법인카드 사용분은 카드 내역을 선택하고 영수증 사진을 첨부한다.
개인 비용으로 결제한 경우 영수증 원본을 재무팀에 제출하면 다음 급여일에 환급된다.'),
  (2, '3. 야근 식대', 2, 2, '3. 야근 식대
평일 20시 이후까지 근무하는 경우 1인 1만 2천 원 한도로 저녁 식대를 법인카드로 결제할 수 있다.
주말·공휴일 근무 시에는 점심과 저녁 각 1만 2천 원까지 사용할 수 있다.'),
  (3, '4. 법인카드 분실', 2, 2, '4. 법인카드 분실
법인카드를 분실하면 즉시 카드사 고객센터에 사용 정지를 요청하고, 당일 재무팀에 분실 신고서를 제출한다.
분실 이후 본인이 사용하지 않은 결제 건은 카드사 이의 신청으로 처리하며 재발급까지 약 7영업일이 걸린다.')
) as x(seq, section_title, page_start, page_end, content);

with d as (
  insert into public.documents (title, category, version, effective_from, page_count, status)
  values ('[가상] IT 지원 가이드', 'IT', 'v1', '2026-01-15', 1, 'ready')
  returning id
)
insert into public.chunks (document_id, seq, section_title, page_start, page_end, content)
select d.id, x.seq, x.section_title, x.page_start, x.page_end, x.content
from d, (values
  (0, '1. 업무용 노트북', 1, 1, '1. 업무용 노트북
업무용 노트북은 지급일로부터 4년 주기로 교체한다. 성능 문제로 조기 교체가 필요하면 IT 헬프데스크에 점검을 요청하고 점검 결과에 따라 교체 여부를 결정한다.
보조 모니터는 1인 1대를 신청할 수 있다.'),
  (1, '2. 비밀번호와 계정', 1, 1, '2. 비밀번호와 계정
사내 계정 비밀번호는 90일마다 변경해야 하며, 5회 연속 틀리면 계정이 잠긴다. 잠긴 계정은 IT 헬프데스크(내선 1234)에 본인 확인 후 해제한다.')
) as x(seq, section_title, page_start, page_end, content);

-- ───────── 가상 FAQ ─────────
insert into public.faqs (question, answer, category) values
  ('연차 신청은 어디서 해요?', '그룹웨어 > 근태관리 > 휴가 신청에서 할 수 있어요.
사용 예정일 3영업일 전까지 신청해 주세요.', '휴가'),
  ('급여일이 언제예요?', '급여는 매월 25일에 지급돼요.
25일이 휴일이면 직전 영업일에 지급돼요.', '급여'),
  ('재직증명서는 어디서 발급해요?', '인사시스템 > 증명서 발급 메뉴에서 직접 출력할 수 있어요.', '인사정보');

-- ───────── 예시 미등록 질문 (대시보드 시연용) ─────────
with g as (
  insert into public.question_groups (question, category, status, created_at, last_asked_at) values
    ('육아휴직 중에도 성과급을 받을 수 있나요?', '급여', '신규', now() - interval '20 days', now()),
    ('재택근무 신청은 어디서 하나요?', '근무제도', '검토 중', now() - interval '25 days', now() - interval '3 hours'),
    ('퇴직연금을 DB형에서 DC형으로 바꿀 수 있나요?', '급여', '보류', now() - interval '28 days', now() - interval '3 days'),
    ('사내 동호회 지원금은 어떻게 신청하나요?', '복리후생', '신규', now() - interval '12 days', now() - interval '6 days')
  returning id, question
)
insert into public.question_variants (group_id, text, reason, created_at)
select g.id, v.text, 'no_answer', now() - (v.days || ' days')::interval
from g join (values
  ('육아휴직 중에도 성과급을 받을 수 있나요?', '육아휴직 들어가면 PS는 어떻게 되나요?', 1),
  ('육아휴직 중에도 성과급을 받을 수 있나요?', '휴직 기간도 성과급 산정에 포함되나요?', 4),
  ('육아휴직 중에도 성과급을 받을 수 있나요?', '출산휴가 중 인센티브 지급 여부', 9),
  ('육아휴직 중에도 성과급을 받을 수 있나요?', '육아휴직 중 성과급 받나요', 15),
  ('재택근무 신청은 어디서 하나요?', '재택 신청 메뉴가 안 보여요', 0),
  ('재택근무 신청은 어디서 하나요?', '원격근무는 팀장 승인만 받으면 되나요?', 6),
  ('재택근무 신청은 어디서 하나요?', '재택근무 주 몇 회까지 가능해요?', 13),
  ('퇴직연금을 DB형에서 DC형으로 바꿀 수 있나요?', 'DB형에서 DC형 전환 방법', 3),
  ('퇴직연금을 DB형에서 DC형으로 바꿀 수 있나요?', 'DC형 추가 납입 가능해요?', 22),
  ('사내 동호회 지원금은 어떻게 신청하나요?', '동호회 지원금 신청 방법', 6),
  ('사내 동호회 지원금은 어떻게 신청하나요?', '새 동호회 만들려면 몇 명 필요해요?', 11)
) as v(q, text, days) on v.q = g.question;
