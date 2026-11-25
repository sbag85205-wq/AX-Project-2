import { useEffect, useRef, useState } from 'react';
import { loadPdfjs, openPdf, type PdfDocument } from '../lib/pdf';
import { countHits, splitHits } from '../lib/docSearch';
import { DocFind } from './DocFind';
import Loading from './Loading';
import { PageJump } from './PageJump';

// 글자 층 칸(span)마다 원래 글자를 기억해 두고, 찾을 말이 바뀌면 원래 글자로 되돌린 뒤 찾은 곳만 <mark>로 감싼다
const originalText = new WeakMap<Element, string>();
function markLayer(layer: HTMLElement, term: string) {
  for (const span of layer.querySelectorAll('span')) {
    if (span.classList.contains('markedContent') || span.getAttribute('role') === 'img') continue;
    if (span.querySelector('span')) continue;
    const text = originalText.get(span) ?? span.textContent ?? '';
    originalText.set(span, text);
    const parts = term ? splitHits(text, term) : [text];
    if (parts.length === 1) { if (span.childElementCount) span.textContent = text; continue; }
    span.replaceChildren(...parts.map((p, i) => {
      if (!(i % 2)) return document.createTextNode(p);
      const m = document.createElement('mark'); m.className = 'find-hit'; m.textContent = p; return m;
    }));
  }
}

/**
 * 원본 PDF를 pdf.js로 직접 그린다. 브라우저 내장 뷰어(iframe)는 휴대폰에서 열리지 않거나
 * 다운로드로 넘어가는 경우가 많아서 쓰지 않는다. 화면에 보이는 페이지만 그려 메모리를 아낀다.
 * 그림 위에 pdf.js 글자 층(TextLayer)을 투명하게 겹쳐, 문서 글자를 마우스로 바로 선택·복사할 수 있다.
 */
// page: 출처(근거)에서 들어와 특정 쪽을 보여 줄 때만 넘긴다. 없으면 맨 위(제목·다운로드 버튼)부터 보인다.
// query: 문서 목록 내용 검색에서 들어왔으면 그 말을 '문서 안에서 찾기'에 미리 넣는다.
export function PdfViewer({ url, page, title, query = '' }: { url: string; page?: number; title: string; query?: string }) {
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState('');
  // 문서 안에서 찾기: 입력(find) → 잠시 뒤 찾을 말(term) → 쪽마다 찾은 수(hits: [쪽, 그 쪽에서 몇 번째])
  const [find, setFind] = useState(query);
  const [term, setTerm] = useState(query.trim());
  const [hits, setHits] = useState<{ page: number; nth: number }[]>([]);
  const [hitIndex, setHitIndex] = useState(0);
  const [finding, setFinding] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const pageTexts = useRef(new Map<number, string[]>());

  useEffect(() => { const t = setTimeout(() => setTerm(find.trim()), 250); return () => clearTimeout(t); }, [find]);
  useEffect(() => { setFind(query); }, [query]);

  // 쪽마다 글자 조각(글자 층 칸과 같은 단위)에서 센다 → 화면의 <mark> 수와 같다
  useEffect(() => {
    if (!doc || !term) { setHits([]); setFinding(false); return; }
    let off = false;
    setFinding(true);
    (async () => {
      const list: { page: number; nth: number }[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        let items = pageTexts.current.get(n);
        if (!items) {
          const content = await (await doc.getPage(n)).getTextContent();
          items = content.items.map((it) => ('str' in it ? it.str : ''));
          pageTexts.current.set(n, items);
        }
        if (off) return;
        const count = items.reduce((sum, str) => sum + countHits(str, term), 0);
        for (let k = 0; k < count; k++) list.push({ page: n, nth: k });
      }
      if (off) return;
      setHits(list);
      setHitIndex(0);
      setFinding(false);
    })().catch(() => !off && setFinding(false));
    return () => { off = true; };
  }, [doc, term]);

  // 지금 보는 곳: 그 쪽으로 옮기고, 그 쪽 글자 층(PdfPage)이 n번째 찾은 곳을 주황으로 칠해 가운데로 맞춘다
  const current = hits[hitIndex] ?? null;
  useEffect(() => {
    if (!current) return;
    viewRef.current?.querySelectorAll('mark.find-hit.current').forEach((m) => m.classList.remove('current'));
    const box = document.getElementById(`pdf-page-${current.page}`);
    const target = box?.querySelectorAll('mark.find-hit')[current.nth];
    if (target) { target.classList.add('current'); target.scrollIntoView({ block: 'center' }); }
    else box?.scrollIntoView({ block: 'start' });
  }, [current]);

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDocument | null = null;
    setDoc(null);
    setError('');
    (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      loaded = await openPdf(new Uint8Array(await res.arrayBuffer()));
      const first = (await loaded.getPage(1)).getViewport({ scale: 1 });
      if (cancelled) return;
      setRatio(first.height / first.width);
      setDoc(loaded);
    })().catch(() => !cancelled && setError('원본 PDF를 불러오지 못했어요. "원본 파일 열기"로 확인해 주세요.'));
    return () => {
      cancelled = true;
      loaded?.loadingTask.destroy();
    };
  }, [url]);

  if (error) return <div className="card empty">{error}</div>;
  if (!doc) return <Loading text="원본 PDF를 불러오는 중" boot />;
  return (
    <div ref={viewRef} className="card pdf-view" aria-label={`${title} 원본`}>
      <div className="doc-tools">
        <DocFind value={find} onChange={setFind} count={hits.length} index={hitIndex} busy={finding}
          onPrev={() => setHitIndex((i) => (i - 1 + hits.length) % hits.length)}
          onNext={() => setHitIndex((i) => (i + 1) % hits.length)} />
        <PageJump total={doc.numPages} onJump={(n) => document.getElementById(`pdf-page-${n}`)?.scrollIntoView({ block: 'start' })} />
      </div>
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} num={i + 1} ratio={ratio} focus={i + 1 === page && !term} term={term} currentNth={current?.page === i + 1 ? current.nth : -1} />
      ))}
    </div>
  );
}

function PdfPage({ doc, num, ratio, focus, term, currentNth }: { doc: PdfDocument; num: number; ratio: number; focus: boolean; term: string; currentNth: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [textReady, setTextReady] = useState(false);
  // 한 번만 그리기: drawn(state)을 effect 조건에 넣으면 그리기가 끝날 때 정리(cleanup)가 돌아 글자 층·크기 감시가 끊긴다
  const started = useRef(false);

  useEffect(() => {
    if (focus) boxRef.current?.scrollIntoView({ block: 'start' });
  }, [focus]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: '600px 0px' });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let text: { cancel: () => void } | null = null;
    let resize: ResizeObserver | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(num);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const width = boxRef.current?.clientWidth || 800;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * Math.min(window.devicePixelRatio || 1, 2) });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      await task.promise;
      if (cancelled) return;
      setDrawn(true);
      // 글자 층: 화면 크기(CSS 배율)로 배치하고, 창 크기가 바뀌면 배율만 다시 맞춘다
      const box = boxRef.current, layer = textRef.current;
      if (!box || !layer) return;
      const fit = () => box.style.setProperty('--scale-factor', String((box.clientWidth || width) / base.width));
      fit();
      const { TextLayer } = await loadPdfjs();
      if (cancelled) return;
      const textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport: page.getViewport({ scale: width / base.width }) });
      text = textLayer;
      await textLayer.render();
      if (cancelled) return;
      setTextReady(true);
      resize = new ResizeObserver(fit);
      resize.observe(box);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      task?.cancel();
      text?.cancel();
      resize?.disconnect();
      started.current = false;
    };
  }, [visible, doc, num]);

  // 찾을 말이 바뀌거나 글자 층이 막 그려지면 찾은 곳을 칠한다
  useEffect(() => {
    if (textReady && textRef.current) markLayer(textRef.current, term);
  }, [term, textReady]);
  // 이 쪽에 지금 보는 곳이 있는데 글자 층이 늦게 그려졌으면, 그려진 뒤 칠하고 가운데로 맞춘다
  useEffect(() => {
    if (!textReady || currentNth < 0) return;
    const target = textRef.current?.querySelectorAll('mark.find-hit')[currentNth];
    if (!target || target.classList.contains('current')) return;
    document.querySelectorAll('mark.find-hit.current').forEach((m) => m.classList.remove('current'));
    target.classList.add('current');
    target.scrollIntoView({ block: 'center' });
  }, [textReady, currentNth, term]);

  return (
    <div ref={boxRef} className="pdf-page" id={`pdf-page-${num}`} style={drawn ? undefined : { aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvasRef} aria-label={`${num}페이지`} />
      <div ref={textRef} className="textLayer" />
      <span className="pdf-num">{num} / {doc.numPages}</span>
    </div>
  );
}
