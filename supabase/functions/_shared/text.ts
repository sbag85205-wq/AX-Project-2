// 검색어 추출, 문서 청크 분할, 질문 유사도 계산
// Deno·Node 양쪽에서 쓰도록 외부 의존성 없이 작성한다.

// 질문에 흔히 붙어 검색 품질을 떨어뜨리는 표현
const STOP_BIGRAMS = new Set([
  '어떻', '떻게', '하나', '나요', '인가', '가요', '있나', '있어', '어요', '해요', '되나', '되요', '돼요',
  '알려', '려주', '주세', '세요', '할수', '수있', '싶어', '무엇', '언제', '어디', '디서', '얼마', '마나',
  '은어', '는어', '하면', '해야', '야하', '합니', '니까', '습니', '입니', '인지', '는지', '은지', '할까',
  '까요', '하는', '방법', '궁금'
]);

const PARTICLE_SUFFIX = /(은|는|이|가|을|를|에|에서|으로|로|와|과|도|만|의|께|한테|부터|까지|이나|나|요)$/;

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** 질문을 SQL ilike 매칭용 검색어(단어 + 한글 바이그램)로 바꾼다. */
export function searchTerms(question: string, max = 24): string[] {
  const terms = new Set<string>();
  for (const raw of normalize(question).split(' ')) {
    const word = raw.length > 2 ? raw.replace(PARTICLE_SUFFIX, '') : raw;
    if (word.length < 2) continue;
    if (/^[a-z0-9]+$/.test(word)) {
      terms.add(word);
      continue;
    }
    if (word.length <= 4 && !STOP_BIGRAMS.has(word)) terms.add(word);
    for (let i = 0; i < word.length - 1; i++) {
      const bg = word.slice(i, i + 2);
      if (!STOP_BIGRAMS.has(bg)) terms.add(bg);
    }
  }
  return [...terms].slice(0, max);
}

function bigrams(text: string): Set<string> {
  const s = normalize(text).replace(/ /g, '');
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** 두 문장의 바이그램 Dice 계수 (0~1). 미등록 질문 묶기에 쓴다. */
export function similarity(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.size || !y.size) return 0;
  let hit = 0;
  for (const g of x) if (y.has(g)) hit++;
  return (2 * hit) / (x.size + y.size);
}

export interface PageText {
  page: number;
  text: string;
}

export interface Chunk {
  seq: number;
  section_title: string | null;
  page_start: number;
  page_end: number;
  content: string;
}

const HEADING = /^(제\s*\d+\s*[장조절]|\d+(\.\d+)*[.)]?\s|[■□▶●◆]\s?|#{1,4}\s)/;

/**
 * 페이지 번호를 보존하면서 문단 단위로 청크를 만든다.
 * 한국어는 토큰 수 대신 글자 수로 근사한다 (약 300~600토큰 ≈ 500~1000자).
 */
export function chunkPages(pages: PageText[], maxChars = 900, overlapChars = 150): Chunk[] {
  const chunks: Chunk[] = [];
  let buf = '';
  let start = 0;
  let end = 0;
  let section: string | null = null;
  let bufSection: string | null = null;
  let dirty = false;

  const flush = () => {
    const content = buf.trim();
    if (content) {
      chunks.push({ seq: chunks.length, section_title: bufSection, page_start: start, page_end: end, content });
    }
    const tail = content.slice(-overlapChars);
    buf = tail ? tail + '\n' : '';
    start = end;
    bufSection = section;
    dirty = false;
  };

  for (const { page, text } of pages) {
    const paragraphs = text.replace(/\r/g, '').split(/\n\s*\n|\n(?=\S)/).map((p) => p.trim()).filter(Boolean);
    for (const para of paragraphs) {
      const firstLine = para.split('\n')[0];
      if (HEADING.test(firstLine) && firstLine.length < 60) {
        if (dirty) flush();
        section = firstLine.replace(/^#+\s*/, '');
        bufSection = section;
      }
      if (!buf) {
        start = page;
        bufSection = section;
      }
      if (buf.length + para.length > maxChars && dirty) flush();
      if (!buf.trim()) start = page;
      // 한 문단이 너무 길면 문장 단위로 자른다
      if (para.length > maxChars) {
        for (const sentence of para.split(/(?<=[.!?。]|다\.)\s+/)) {
          if (buf.length + sentence.length > maxChars && dirty) flush();
          if (!buf.trim()) start = page;
          buf += sentence + ' ';
          end = page;
          dirty = true;
        }
        buf += '\n';
      } else {
        buf += para + '\n';
        end = page;
        dirty = true;
      }
    }
  }
  if (dirty) flush();
  return chunks;
}
