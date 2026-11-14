import { describe, expect, it } from 'vitest';
import { ATTACH_ACCEPT, ATTACH_TYPES_LABEL, ATTACH_TYPES_SHORT, DOC_ACCEPT, DOC_TYPES_LABEL, docFileType, fileKind, isImageFile } from '../src/lib/fileTypes';

describe('FILE_TYPES', () => {
  it('input accept 값은 예전과 같다', () => {
    expect(DOC_ACCEPT).toBe('.pdf,.xlsx,.xls,.csv,.txt,.md');
    expect(ATTACH_ACCEPT).toBe('image/png,image/jpeg,image/webp,image/gif,.pdf,.xlsx,.xls,.csv,.txt,.md');
  });
  it('확장자로 글자 뽑는 방식과 보기 방식을 정한다', () => {
    expect(fileKind('규정.PDF')).toBe('pdf');
    expect(fileKind('a.b.xlsx')).toBe('xlsx');
    expect(fileKind('메모.md')).toBe('text');
    expect(fileKind('사진.png')).toBeNull();
    expect(fileKind('확장자없음')).toBeNull();
    expect(docFileType('2026-11-07/abc.csv')).toBe('sheet');
    expect(docFileType('a.pdf')).toBe('pdf');
    expect(docFileType('a.txt')).toBe('text');
    expect(docFileType(null)).toBeNull();
  });
  it('사진은 MIME 또는 확장자로 알아본다', () => {
    expect(isImageFile({ name: 'x', type: 'image/webp' })).toBe(true);
    expect(isImageFile({ name: 'IMG.JPG', type: '' })).toBe(true);
    expect(isImageFile({ name: 'a.svg', type: 'image/svg+xml' })).toBe(false);
  });
  it('안내 문구를 표에서 만든다', () => {
    expect(DOC_TYPES_LABEL).toBe('PDF, 엑셀(XLSX·XLS·CSV), 텍스트(TXT·MD)');
    expect(ATTACH_TYPES_SHORT).toBe('사진·PDF·엑셀·텍스트');
    expect(ATTACH_TYPES_LABEL).toBe('사진(JPG·PNG), PDF, 엑셀, 텍스트');
  });
});
