// 엑셀 시트를 검색용 텍스트로 바꾼다. 외부 라이브러리 없이 작성해 단위 테스트에서 바로 쓴다.

export interface Sheet {
  name: string;
  rows: string[][];
}

export type DocFileType = 'pdf' | 'sheet' | 'text';

/** 저장된 원본 경로의 확장자로 문서 종류를 정한다. */
export function docFileType(path: string | null | undefined): DocFileType | null {
  const ext = path?.toLowerCase().split('.').pop();
  if (!ext) return null;
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'sheet';
  return 'text';
}

/** 문서 크기 표시: 엑셀은 시트 수, 나머지는 페이지 수 */
export const pageCountLabel = (count: number, path: string | null | undefined) =>
  docFileType(path) === 'sheet' ? `시트 ${count}개` : `${count}페이지`;

/** 위치 표시: 엑셀은 "시트 N", 나머지는 "p.N" */
export function pageLabel(start: number, end: number, path: string | null | undefined): string {
  const range = start === end ? `${start}` : `${start}–${end}`;
  return docFileType(path) === 'sheet' ? `시트 ${range}` : `p.${range}`;
}

const trimRow = (row: string[]) => {
  let end = row.length;
  while (end > 0 && !row[end - 1]) end--;
  return row.slice(0, end);
};

const nonEmpty = (row: string[]) => row.filter(Boolean).length;
const isNumberLike = (v: string) => /^[-+]?[\d,.]+%?$/.test(v);

/**
 * 시트 한 개를 텍스트로 만든다.
 * - 첫 줄은 "# 시트이름" (청크의 섹션 제목이 된다)
 * - 머리글 줄을 찾으면 각 행을 "머리글: 값, 머리글: 값"으로 적어 행 하나만 잘려도 뜻이 남게 한다
 * - 머리글 위의 제목 줄(병합된 표 제목 등)은 그대로 적는다
 */
export function sheetToText(sheet: Sheet): string {
  const rows = sheet.rows.map((r) => trimRow(r.map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()))).filter((r) => r.length);
  const lines = [`# ${sheet.name}`];
  const headerAt = rows.slice(0, 5).findIndex((r) => nonEmpty(r) >= 2 && r.filter((c) => c && !isNumberLike(c)).length >= nonEmpty(r) / 2);
  const hasHeader = headerAt >= 0 && rows.length > headerAt + 1;
  rows.forEach((row, i) => {
    if (hasHeader && i > headerAt) {
      const header = rows[headerAt];
      lines.push(row.map((v, j) => (v ? `${header[j] || `열${j + 1}`}: ${v}` : '')).filter(Boolean).join(', '));
    } else {
      lines.push(row.filter(Boolean).join(' | '));
    }
  });
  return lines.join('\n');
}
