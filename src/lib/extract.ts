// 문서 업로드 전 브라우저에서 페이지별 텍스트를 뽑는다 (원문은 Supabase로만 전송)
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PageText {
  page: number;
  text: string;
}

export async function extractPages(file: File): Promise<PageText[]> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: PageText[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      let text = '';
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) text += '\n';
        text += item.str;
        if (item.hasEOL) text += '\n';
        lastY = y;
      }
      pages.push({ page: i, text: text.replace(/\n{3,}/g, '\n\n').trim() });
    }
    return pages;
  }
  // 텍스트 파일: 폼피드(\f) 또는 "=== page N ===" 줄로 페이지를 나눌 수 있다
  const raw = await file.text();
  const parts = raw.split(/\f|^=+\s*page\s*\d+\s*=+$/im).map((t) => t.trim());
  return parts.filter(Boolean).map((text, i) => ({ page: i + 1, text }));
}

export async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
