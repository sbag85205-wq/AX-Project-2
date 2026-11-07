// 검색어 추출, 문서 청크 분할, 질문 유사도 계산
// Deno·Node 양쪽에서 쓰도록 외부 의존성 없이 작성한다.

// 질문에 흔히 붙어 검색 품질을 떨어뜨리는 표현
const STOP_BIGRAMS = new Set([
  '어떻', '떻게', '하나', '나요', '인가', '가요', '있나', '있어', '어요', '해요', '되나', '되요', '돼요',
  '알려', '려주', '주세', '세요', '할수', '수있', '싶어', '무엇', '언제', '어디', '디서', '얼마', '마나',
  '은어', '는어', '하면', '해야', '야하', '합니', '니까', '습니', '입니', '인지', '는지', '은지', '할까',
  '까요', '하는', '방법', '궁금', '하시', '시면', '셔야', '주시', '시겠', '시는', '니다', '금합', '여쭤', '쭤봐'
]);

// 내용과 상관없는 질문·인사·말 잇기 표현. 단어째로 거른다
const STOP_WORDS = new Set([
  '어떻게', '어떤', '무엇', '뭐', '뭔가', '언제', '어디', '얼마', '얼마나', '왜', '좀', '혹시', '며칠', '몇',
  '그럼', '그리고', '정말', '알려', '알려줘', '궁금', '방법', '하나', '있나', '되나', '하는', '있는', '되는', '해야', '하면',
  '여쭤', '여쭤봐', '여쭙', '문의', '제가', '저는', '저희', '저도', '이번에', '그런데', '근데', '요즘', '다름이', '아니라',
  '그래서', '그러면', '그냥', '일단', '받을', '전에', '하게', '누가', '될까', '되는지', '하던', '안녕하세요', '감사합니다', '수고하십니다', '부탁', '부탁드립니다', '죄송', '실례'
]);

// 끝에서부터 떼어 낼 꼬리. 바뀌지 않을 때까지 반복 적용한다
// (예: 신청하셔야 → 신청하셔 → 신청하 → 신청, 알려주시겠어요 → 알려주시겠 → 알려주시 → 알려주 → 알려)
const ENDINGS: RegExp[] = [
  // 격식체·높임 질문 어미
  /(시겠습니까|겠습니까|겠습니다|습니까|습니다|니까|니다|십시오|드릴게요|드려요|실까요|을까요|일까요|으세요|세요|셔요|신가요|시나요)$/,
  // 해요체 질문 어미
  /(이에요|예요|에요|인가요|는가요|던가요|인가|나요|까요|가요|래요|대요|어요|아요|해요|돼요|되요|지요|죠)$/,
  // 조사
  /(은|는|이|가|을|를|에|에서|으로|로|와|과|도|만|의|께|한테|부터|까지|이나|나|요)$/,
  // 연결 어미 (등록하고 → 등록, 시작했으면 → 시작, 넣으래요 → 넣, 신청하려면 → 신청)
  /(었는데|았는데|했는데|인데|는데|던데|더니|느라|으니까|으면|면서|어서|아서|해서|하고|으래|는지|은지|인지|으려면|려면|어야|아야|여야|셔야|해야|지만|도록|시면|시고|시는|신지|하면|되면)$/,
  // 높임(-시-)·시제·보조 용언 꼬리 (알려주 → 알려, 지원해주 → 지원해)
  /(?<=[려해어아워쳐여])주$/,
  /(하|해|했|되|돼|됐|된|될|할|한|합|됩|습|겠|시|셔)$/
];

function stem(raw: string): string {
  let word = raw;
  for (let pass = 0; pass < 4; pass++) {
    const before = word;
    for (const suffix of ENDINGS) {
      if (word.length > 2) word = word.replace(suffix, '');
    }
    if (word === before) break;
  }
  return word;
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** 질문을 SQL ilike 매칭용 검색어(단어 + 한글 바이그램)로 바꾼다. */
export function searchTerms(question: string, max = 24): string[] {
  const terms = new Set<string>();
  for (const raw of normalize(question).split(' ')) {
    if (STOP_WORDS.has(raw)) continue;
    const word = /^[a-z0-9]+$/.test(raw) ? raw : stem(raw);
    if (word.length < 2 || STOP_WORDS.has(word)) continue;
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

// ───────────── 검색 점수와 근거 고르기 ─────────────

/** DB가 돌려주는 후보 수 (관리자 미리보기와 채팅이 같은 값을 쓴다) */
export const CANDIDATE_COUNT = 8;
/** 답변 모델에 넘기는 근거 수 */
export const EVIDENCE_COUNT = 5;
/** 키워드 점수 분모의 상한. 검색어가 이보다 많아도 이 개수만 맞으면 만점이다. */
export const KEYWORD_CAP = 6;

/**
 * DB의 키워드 점수(맞은 검색어 ÷ 전체 검색어)를 "맞은 검색어 ÷ min(전체, KEYWORD_CAP)"로 바꾼다.
 * 예전 식은 질문이 길고 구어체일수록 분모가 커져, 정답 조각도 기준(0.35)을 못 넘었다.
 * (예: 검색어 16개 중 3개 일치 → 0.19 → 이제 0.50)
 */
export function keywordScore(rawRatio: number, termCount: number): number {
  const matched = Math.round(rawRatio * termCount);
  return Math.min(1, matched / Math.max(1, Math.min(termCount, KEYWORD_CAP)));
}

export interface ScoredRow {
  keyword_score: number;
  vector_score: number | null;
}

export interface Thresholds {
  keyword_min: number;
  vector_min: number;
  vector_weight: number;
}

/**
 * 후보에 바뀐 키워드 점수를 매기고 다시 정렬한 뒤, 기준을 넘은 것 중 앞의 EVIDENCE_COUNT개를 근거로 쓴다.
 * passed = 기준 통과, used = 실제로 답변 모델에 넘김.
 */
export function rankEvidence<T extends ScoredRow>(rows: T[], termCount: number, t: Thresholds): (T & { score: number; passed: boolean; used: boolean })[] {
  let used = 0;
  return rows
    .map((r) => {
      const keyword_score = keywordScore(r.keyword_score, termCount);
      return { ...r, keyword_score, score: (r.vector_score ?? 0) * t.vector_weight + keyword_score * (1 - t.vector_weight) };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => {
      const passed = r.keyword_score >= t.keyword_min || (r.vector_score ?? 0) >= t.vector_min;
      const take = passed && used < EVIDENCE_COUNT;
      if (take) used++;
      return { ...r, passed, used: take };
    });
}

// ───────────── 부연 설명이 붙은 질문 ─────────────

// 실제로 무언가를 묻는 문장인지 (물음표, 질문 어미, 의문사)
const ASKING = /[?？]|(나요|까요|가요|는지|은지|인지|려면|습니까|니까|세요|어요|해요|돼요|되요|죠|줘|주세요|알려|어떻게|얼마|몇|언제|어디|무엇|뭐|누구|누가|가능|되나|있나)/;

/**
 * "제가 다음 달에 결혼하는데요, 경조사 휴가는 며칠이에요?"처럼 배경 설명이 앞에 붙은 질문에서
 * 실제로 묻는 문장(마지막 질문 문장)만 뽑는다. 문장이 하나뿐이면 그대로 돌려준다.
 */
export function coreQuestion(text: string): string {
  const parts = text
    .split(/(?<=[.?!？。\n])\s*|(?<=(?:는데요|인데요|거든요|서요|고요|는데|인데|어서|라서|해서|니까)[,，])\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length <= 1) return text.trim();
  for (let i = parts.length - 1; i >= 0; i--) {
    if (ASKING.test(parts[i]) && searchTerms(parts[i]).length) return parts[i];
  }
  return parts[parts.length - 1];
}

/** 핵심 검색어 집합끼리의 유사도 (0~1). 말투·부연 설명이 달라도 같은 질문이면 높다. FAQ 맞추기에 쓴다. */
export function termSimilarity(a: string, b: string): number {
  const x = new Set(searchTerms(a, 40));
  const y = new Set(searchTerms(b, 40));
  if (!x.size || !y.size) return 0;
  let hit = 0;
  for (const t of x) if (y.has(t)) hit++;
  return (2 * hit) / (x.size + y.size);
}

/**
 * 여러 검색(원래 질문, 질문 문장, AI가 정리한 질문, 첨부)의 근거를 합친다.
 * 같은 조각은 가장 높은 점수로 한 번만 남기고, 점수순으로 EVIDENCE_COUNT개를 고른다.
 */
export function mergeEvidence<T extends { id: string; score: number }>(lists: T[][]): T[] {
  const best = new Map<string, T>();
  for (const list of lists) {
    for (const row of list) {
      const prev = best.get(row.id);
      if (!prev || row.score > prev.score) best.set(row.id, row);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, EVIDENCE_COUNT);
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

  // keepTail=false: 새 절이 시작될 때는 앞 절 끝을 겹쳐 붙이지 않는다
  // (붙이면 "5. 완료 시" 제목 조각에 1~4단계 내용이 섞여 절 제목과 본문이 어긋난다)
  const flush = (keepTail = true) => {
    const content = buf.trim();
    if (content) {
      chunks.push({ seq: chunks.length, section_title: bufSection, page_start: start, page_end: end, content });
    }
    const tail = keepTail ? content.slice(-overlapChars) : '';
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
        if (dirty) flush(false);
        else buf = '';
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
