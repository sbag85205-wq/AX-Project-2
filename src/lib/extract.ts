// 문서 업로드 전 브라우저에서 페이지별 텍스트를 뽑는다 (원문은 Supabase로만 전송)
import { openPdf } from './pdf';
import { fileKind, type FileKind } from './fileTypes';
import { sheetToText, type Sheet } from './sheet';

export { DOC_ACCEPT, fileKind, type FileKind } from './fileTypes';

export interface PageText {
  page: number;
  text: string;
}

/** 확장자만 바꾼 파일을 거르기 위해 실제 내용의 첫 바이트를 확인한다. */
export async function checkSignature(file: File, kind: FileKind): Promise<void> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (kind === 'pdf' && !starts(0x25, 0x50, 0x44, 0x46)) throw new Error('PDF 파일 형식이 아니에요. 파일을 다시 확인해 주세요.');
  if (kind === 'xlsx' && !starts(0x50, 0x4b, 0x03, 0x04)) throw new Error('엑셀(xlsx) 파일 형식이 아니에요. 파일을 다시 확인해 주세요.');
  if (kind === 'xls' && !starts(0xd0, 0xcf, 0x11, 0xe0)) throw new Error('엑셀(xls) 파일 형식이 아니에요. 파일을 다시 확인해 주세요.');
  if ((kind === 'text' || kind === 'csv') && head.includes(0)) throw new Error('텍스트 파일 형식이 아니에요. 파일을 다시 확인해 주세요.');
}

/** UTF-8이 아니면 한국어 Windows 기본 인코딩(CP949/EUC-KR)으로 읽는다. */
export function decodeText(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('euc-kr').decode(bytes);
  }
}

async function extractPdf(file: File): Promise<PageText[]> {
  const pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
  try {
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
  } finally {
    pdf.loadingTask.destroy();
  }
}

/** 엑셀·CSV의 모든 시트를 읽는다. 라이브러리(SheetJS)는 처음 쓸 때만 불러온다. */
export async function readSpreadsheet(data: ArrayBuffer, kind: 'xlsx' | 'xls' | 'csv'): Promise<Sheet[]> {
  const XLSX = await import('xlsx');
  const book = kind === 'csv'
    ? XLSX.read(decodeText(data), { type: 'string', raw: true })
    : XLSX.read(new Uint8Array(data), { type: 'array', dateNF: 'yyyy-mm-dd' });
  return book.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils
      .sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false })
      .map((row) => row.map((c) => String(c ?? '')))
  }));
}

export async function extractPages(file: File): Promise<PageText[]> {
  const kind = fileKind(file.name);
  if (!kind) throw new Error('지원하지 않는 파일 형식이에요.');
  await checkSignature(file, kind);
  if (kind === 'pdf') return extractPdf(file);
  if (kind !== 'text') {
    // 시트 하나를 한 "페이지"로 본다 (출처에는 "시트 N"으로 표시)
    const sheets = await readSpreadsheet(await file.arrayBuffer(), kind);
    return sheets.map((sheet, i) => ({ page: i + 1, text: sheetToText(sheet) }));
  }
  // 텍스트 파일: 폼피드(\f) 또는 "=== page N ===" 줄로 페이지를 나눌 수 있다
  const raw = decodeText(await file.arrayBuffer());
  const parts = raw.split(/\f|^=+\s*page\s*\d+\s*=+$/im).map((t) => t.trim());
  return parts.filter(Boolean).map((text, i) => ({ page: i + 1, text }));
}

export async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
