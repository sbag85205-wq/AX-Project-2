import { useEffect, useRef, useState } from 'react';
import { loadPdfjs, openPdf, type PdfDocument } from '../lib/pdf';
import Loading from './Loading';

/**
 * 원본 PDF를 pdf.js로 직접 그린다. 브라우저 내장 뷰어(iframe)는 휴대폰에서 열리지 않거나
 * 다운로드로 넘어가는 경우가 많아서 쓰지 않는다. 화면에 보이는 페이지만 그려 메모리를 아낀다.
 * 그림 위에 pdf.js 글자 층(TextLayer)을 투명하게 겹쳐, 문서 글자를 마우스로 바로 선택·복사할 수 있다.
 */
// page: 출처(근거)에서 들어와 특정 쪽을 보여 줄 때만 넘긴다. 없으면 맨 위(제목·다운로드 버튼)부터 보인다.
export function PdfViewer({ url, page, title }: { url: string; page?: number; title: string }) {
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState('');

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
    <div className="card pdf-view" aria-label={`${title} 원본`}>
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} num={i + 1} ratio={ratio} focus={i + 1 === page} />
      ))}
    </div>
  );
}

function PdfPage({ doc, num, ratio, focus }: { doc: PdfDocument; num: number; ratio: number; focus: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [drawn, setDrawn] = useState(false);
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

  return (
    <div ref={boxRef} className="pdf-page" id={`pdf-page-${num}`} style={drawn ? undefined : { aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvasRef} aria-label={`${num}페이지`} />
      <div ref={textRef} className="textLayer" />
      <span className="pdf-num">{num} / {doc.numPages}</span>
    </div>
  );
}
