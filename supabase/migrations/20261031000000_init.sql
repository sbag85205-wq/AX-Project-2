-- Knowly 초기 스키마
-- 원칙: 질문 원문은 본인만 조회, 관리자 통계는 원문 없는 집계만, 문서·FAQ는 로그인 사용자 조회 가능

create extension if not exists vector with schema extensions;

-- ───────────── 사용자 ─────────────
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login_id text not null unique,
  display_name text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- auth.users 생성 시 프로필 자동 생성 (login_id = 이메일 @ 앞부분)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, login_id, display_name, department_id, role)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid,
    'employee'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── 문서와 검색 ─────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  version text not null default 'v1',
  effective_from date,
  file_path text,
  file_hash text,
  page_count int not null default 0,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed', 'archived')),
  error text,
  embedding_model text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  seq int not null,
  section_title text,
  page_start int not null,
  page_end int not null,
  content text not null,
  -- 임베딩 차원은 모델에 따라 달라서 고정하지 않는다 (작은 데이터셋은 정확 검색)
  embedding extensions.vector,
  unique (document_id, seq)
);
create index chunks_document_idx on public.chunks (document_id);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 검색어(바이그램 등) 배열에 대해 포함 비율로 점수를 매기고, 임베딩이 있으면 코사인 유사도와 결합
create or replace function public.search_chunks(
  terms text[],
  query_embedding extensions.vector default null,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  document_version text,
  section_title text,
  page_start int,
  page_end int,
  content text,
  keyword_score real,
  vector_score real
)
language sql
stable
set search_path = public, extensions
as $$
  with scored as (
    select
      c.*,
      d.title as document_title,
      d.version as document_version,
      (select count(*) from unnest(terms) t where c.content ilike '%' || t || '%')::real
        / greatest(cardinality(terms), 1) as keyword_score,
      case
        when query_embedding is null or c.embedding is null
          or vector_dims(c.embedding) <> vector_dims(query_embedding) then null
        else (1 - (c.embedding <=> query_embedding))::real
      end as vector_score
    from public.chunks c
    join public.documents d on d.id = c.document_id
    where d.status = 'ready'
  )
  select id, document_id, document_title, document_version, section_title,
         page_start, page_end, content, keyword_score, vector_score
  from scored
  where keyword_score > 0 or vector_score is not null
  order by coalesce(vector_score, 0) * 0.6 + keyword_score * 0.4 desc, keyword_score desc
  limit match_count;
$$;

create or replace function public.search_faqs(terms text[], match_count int default 3)
returns table (id uuid, question text, answer text, category text, score real)
language sql
stable
set search_path = public
as $$
  select f.id, f.question, f.answer, f.category,
    (select count(*) from unnest(terms) t where f.question ilike '%' || t || '%')::real
      / greatest(cardinality(terms), 1) as score
  from public.faqs f
  where f.active
  order by score desc
  limit match_count;
$$;

-- ───────────── 대화 (본인만) ─────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '새 대화',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_owner_idx on public.conversations (owner_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- assistant 메시지의 구조화된 답변 {status, mode, summary, steps, details, warnings, citations}
  answer jsonb,
  vote text check (vote in ('up', 'down')),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ───────────── 미등록 질문 (익명) ─────────────
create table public.question_groups (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  category text not null default '기타',
  status text not null default '신규' check (status in ('신규', '검토 중', 'FAQ 등록 완료', '보류')),
  faq_id uuid references public.faqs (id) on delete set null,
  created_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now()
);

-- 직원 식별 정보 없이 질문 표현만 저장
create table public.question_variants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.question_groups (id) on delete cascade,
  text text not null,
  reason text not null check (reason in ('no_answer', 'not_helpful')),
  created_at timestamptz not null default now()
);
create index question_variants_group_idx on public.question_variants (group_id, created_at desc);

-- ───────────── 이용 통계 (원문 없음) ─────────────
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid unique,
  user_id uuid references auth.users (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  category text,
  status text not null check (status in ('answered', 'insufficient_evidence', 'error')),
  mode text,
  model text,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);
create index usage_events_created_idx on public.usage_events (created_at);

-- ───────────── RLS ─────────────
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.faqs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.question_groups enable row level security;
alter table public.question_variants enable row level security;
alter table public.usage_events enable row level security;

create policy "departments: read" on public.departments for select to authenticated using (true);
create policy "departments: admin write" on public.departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "profiles: self or admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles: admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "documents: read ready" on public.documents for select to authenticated
  using (status = 'ready' or public.is_admin());
create policy "documents: admin write" on public.documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "chunks: read ready" on public.chunks for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and (d.status = 'ready' or public.is_admin())));
create policy "chunks: admin write" on public.chunks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "faqs: read active" on public.faqs for select to authenticated
  using (active or public.is_admin());
create policy "faqs: admin write" on public.faqs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 대화는 관리자도 볼 수 없다
create policy "conversations: owner" on public.conversations for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "messages: owner read" on public.messages for select to authenticated
  using (owner_id = auth.uid());
create policy "messages: owner delete" on public.messages for delete to authenticated
  using (owner_id = auth.uid());

create policy "question_groups: admin" on public.question_groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "question_variants: admin" on public.question_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- usage_events는 직접 조회 불가, 아래 집계 함수로만 본다

-- ───────────── 관리자 집계 ─────────────
create or replace function public.admin_usage_stats(days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => days);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'active_users', count(distinct e.user_id),
    'answered', count(*) filter (where e.status = 'answered'),
    'insufficient', count(*) filter (where e.status = 'insufficient_evidence'),
    'errors', count(*) filter (where e.status = 'error'),
    'avg_latency_ms', coalesce(round(avg(e.latency_ms) filter (where e.status <> 'error')), 0),
    'feedback_up', count(*) filter (where e.feedback = 'up'),
    'feedback_down', count(*) filter (where e.feedback = 'down'),
    'input_tokens', coalesce(sum(e.input_tokens), 0),
    'output_tokens', coalesce(sum(e.output_tokens), 0)
  ) into result
  from public.usage_events e
  where e.created_at >= since;

  result := result || jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', n) order by d)
      from (
        select (e.created_at at time zone 'Asia/Seoul')::date as d, count(*) as n
        from public.usage_events e where e.created_at >= since group by 1
      ) x), '[]'::jsonb),
    'by_department', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', n, 'users', u) order by n desc)
      from (
        select coalesce(dp.name, '미지정') as name, count(*) as n, count(distinct e.user_id) as u
        from public.usage_events e left join public.departments dp on dp.id = e.department_id
        where e.created_at >= since group by 1
      ) x), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc)
      from (
        select coalesce(e.category, '기타') as name, count(*) as n
        from public.usage_events e where e.created_at >= since group by 1
      ) x), '[]'::jsonb),
    'by_model', coalesce((
      select jsonb_agg(jsonb_build_object('model', model, 'count', n, 'input_tokens', i, 'output_tokens', o, 'avg_latency_ms', l) order by n desc)
      from (
        select coalesce(e.model, '검색 전용') as model, count(*) as n,
          coalesce(sum(e.input_tokens), 0) as i, coalesce(sum(e.output_tokens), 0) as o,
          coalesce(round(avg(e.latency_ms)), 0) as l
        from public.usage_events e where e.created_at >= since group by 1
      ) x), '[]'::jsonb)
  );
  return result;
end;
$$;

revoke execute on function public.admin_usage_stats(int) from anon;

-- ───────────── 원본 파일 저장소 ─────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents bucket: admin write" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());
create policy "documents bucket: read" on storage.objects for select to authenticated
  using (bucket_id = 'documents');
