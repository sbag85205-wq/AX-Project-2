-- 채팅에서 고른 분야의 문서 안에서만 찾을 수 있게 search_chunks에 분야 조건을 추가한다.
-- filter_category를 비우면(null) 지금까지처럼 전체 문서에서 찾는다. 나머지 계산은 그대로다.
drop function public.search_chunks(text[], extensions.vector, int, real);

create function public.search_chunks(
  terms text[],
  query_embedding extensions.vector default null,
  match_count int default 5,
  vector_weight real default 0.6,
  filter_category text default null
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
      and (filter_category is null or d.category = filter_category)
  )
  select id, document_id, document_title, document_version, section_title,
         page_start, page_end, content, keyword_score, vector_score
  from scored
  where keyword_score > 0 or vector_score is not null
  order by coalesce(vector_score, 0) * vector_weight + keyword_score * (1 - vector_weight) desc, keyword_score desc
  limit match_count;
$$;
