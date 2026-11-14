// 올릴 수 있는 파일 종류는 이 표 하나로 정한다. input accept 값·종류 판별·안내 문구는 모두 여기서 만든다.
// (외부 라이브러리 없이 작성해 단위 테스트에서 바로 쓴다)

/** 브라우저에서 글자를 뽑는 방식 */
export type FileKind = 'pdf' | 'xlsx' | 'xls' | 'csv' | 'text';
/** 원본을 보여주는 방식: PDF 뷰어 / 표(시트) / 텍스트 */
export type DocFileType = 'pdf' | 'sheet' | 'text';

interface FileTypeInfo {
  kind: FileKind;
  view: DocFileType;
  /** 소문자 확장자 (점 없이) */
  exts: readonly string[];
}

/** 문서·첨부로 올릴 수 있는 파일 */
export const FILE_TYPES: readonly FileTypeInfo[] = [
  { kind: 'pdf', view: 'pdf', exts: ['pdf'] },
  { kind: 'xlsx', view: 'sheet', exts: ['xlsx'] },
  { kind: 'xls', view: 'sheet', exts: ['xls'] },
  { kind: 'csv', view: 'sheet', exts: ['csv'] },
  { kind: 'text', view: 'text', exts: ['txt', 'md'] }
];

/** 질문 첨부로만 받는 사진 */
export const IMAGE_TYPES = {
  mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  exts: ['png', 'jpg', 'jpeg', 'webp', 'gif']
} as const;

const VIEW_LABEL: Record<DocFileType, string> = { pdf: 'PDF', sheet: '엑셀', text: '텍스트' };

const extOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

/** 문서로 올릴 수 있는 파일 (input accept 값): .pdf,.xlsx,.xls,.csv,.txt,.md */
export const DOC_ACCEPT = FILE_TYPES.flatMap((t) => t.exts.map((e) => `.${e}`)).join(',');

/** 질문에 첨부할 수 있는 파일 (input accept 값): 사진 + 문서 */
export const ATTACH_ACCEPT = [...IMAGE_TYPES.mimes, DOC_ACCEPT].join(',');

/** 확장자로 글자 뽑는 방식을 정한다. 지원하지 않으면 null */
export function fileKind(name: string): FileKind | null {
  const ext = extOf(name);
  return FILE_TYPES.find((t) => t.exts.includes(ext))?.kind ?? null;
}

/** 저장된 원본 경로의 확장자로 문서 종류를 정한다. 확장자가 없으면 null, 모르는 확장자는 텍스트로 본다. */
export function docFileType(path: string | null | undefined): DocFileType | null {
  const ext = path ? extOf(path) : '';
  if (!ext) return null;
  return FILE_TYPES.find((t) => t.exts.includes(ext))?.view ?? 'text';
}

export function isImageFile(file: { name: string; type: string }): boolean {
  return (IMAGE_TYPES.mimes as readonly string[]).includes(file.type) || (IMAGE_TYPES.exts as readonly string[]).includes(extOf(file.name));
}

const views = [...new Set(FILE_TYPES.map((t) => t.view))];
const extsOf = (view: DocFileType) => FILE_TYPES.filter((t) => t.view === view).flatMap((t) => t.exts.map((e) => e.toUpperCase()));

/** 문서 안내 문구: "PDF, 엑셀(XLSX·XLS·CSV), 텍스트(TXT·MD)" */
export const DOC_TYPES_LABEL = views
  .map((v) => {
    const exts = extsOf(v).join('·');
    return exts === VIEW_LABEL[v] ? VIEW_LABEL[v] : `${VIEW_LABEL[v]}(${exts})`;
  })
  .join(', ');

/** 첨부 안내 문구(짧게): "사진·PDF·엑셀·텍스트" */
export const ATTACH_TYPES_SHORT = ['사진', ...views.map((v) => VIEW_LABEL[v])].join('·');

/** 첨부 오류 문구: "사진(JPG·PNG), PDF, 엑셀, 텍스트" */
export const ATTACH_TYPES_LABEL = ['사진(JPG·PNG)', ...views.map((v) => VIEW_LABEL[v])].join(', ');
