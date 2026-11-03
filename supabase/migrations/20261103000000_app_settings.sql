-- 관리자 설정: 답변 모델과 검색 기준을 사이트에서 바꾼다.
-- API 키는 여기 두지 않고 Edge Function 비밀값(LLM_API_KEY)에만 둔다.

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  llm_model text check (llm_model is null or llm_model ~ '^[A-Za-z0-9._:/-]{1,120}$'),
  keyword_min real not null default 0.35 check (keyword_min between 0 and 1),
  vector_min real not null default 0.55 check (vector_min between 0 and 1),
  vector_weight real not null default 0.6 check (vector_weight between 0 and 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.app_settings (id) values (1);

alter table public.app_settings enable row level security;

create policy "app_settings: admin read" on public.app_settings for select to authenticated
  using (public.is_admin());
create policy "app_settings: admin update" on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 정렬 비중(vector_weight)을 인자로 받도록 바꾼다. 키워드 비중은 1 - vector_weight
drop function public.search_chunks(text[], extensions.vector, int);

create function public.search_chunks(
  terms text[],
  query_embedding extensions.vector default null,
  match_count int default 5,
  vector_weight real default 0.6
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
  order by coalesce(vector_score, 0) * vector_weight + keyword_score * (1 - vector_weight) desc, keyword_score desc
  limit match_count;
$$;
