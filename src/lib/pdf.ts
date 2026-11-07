// pdf.js는 무거워서 PDF를 처음 다룰 때만 불러온다.
// 한국어 표준 글꼴(HYGoThic 등)을 쓰는 PDF는 CMap이 없으면 글자가 비어 나오므로 반드시 함께 넘긴다.
// 기본 빌드는 최신 브라우저 전용 문법(Map.getOrInsertComputed 등)을 써서 회사 PC·휴대폰의
// 조금 오래된 브라우저에서 화면 그리기가 실패한다. 그래서 호환용 legacy 빌드를 쓴다.
type PdfJs = typeof import('pdfjs-dist');

let loading: Promise<PdfJs> | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  loading ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<PdfJs>,
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return loading;
}

/** vite.config.ts의 pdfjsAssets 플러그인이 배포하는 경로 */
const ASSETS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/'
};

export async function openPdf(data: Uint8Array) {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({ data, ...ASSETS }).promise;
}

export type PdfDocument = Awaited<ReturnType<typeof openPdf>>;
