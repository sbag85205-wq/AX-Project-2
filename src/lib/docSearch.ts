// 문서 검색 도우미: 사내 문서 목록의 '내용 키워드' 검색과 문서 보기 안 찾기에서 함께 쓴다.

/** PostgREST ilike 패턴에서 %, _, \ 를 글자 그대로 찾도록 막는다. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

/** text를 term 기준으로 [앞, 찾은 글자, 뒤, 찾은 글자, ...] 조각으로 나눈다(대소문자 무시). 홀수 칸이 찾은 글자다. */
export function splitHits(text: string, term: string): string[] {
  const t = term.trim().toLowerCase();
  if (!t) return [text];
  const lower = text.toLowerCase();
  const parts: string[] = [];
  let from = 0;
  for (let i = lower.indexOf(t); i >= 0; i = lower.indexOf(t, i + t.length)) {
    parts.push(text.slice(from, i), text.slice(i, i + t.length));
    from = i + t.length;
  }
  parts.push(text.slice(from));
  return parts;
}

/** 찾은 글자 앞뒤 일부만 잘라 한 줄 미리보기로 만든다(줄바꿈·여러 칸 띄어쓰기는 한 칸으로). */
export function snippet(text: string, term: string, around = 36): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const i = flat.toLowerCase().indexOf(term.trim().toLowerCase());
  if (i < 0) return flat.slice(0, around * 2);
  const start = Math.max(0, i - around);
  const end = Math.min(flat.length, i + term.trim().length + around);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

/** text 안에 term이 몇 번 나오는지(대소문자 무시). */
export function countHits(text: string, term: string): number {
  return (splitHits(text, term).length - 1) / 2;
}
