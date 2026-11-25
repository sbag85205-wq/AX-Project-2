import { describe, expect, it } from 'vitest';
import { countHits, likePattern, snippet, splitHits } from '../src/lib/docSearch';

describe('문서 검색 도우미', () => {
  it('ilike 패턴에서 %, _, \\ 는 글자 그대로 찾는다', () => {
    expect(likePattern('숙박')).toBe('%숙박%');
    expect(likePattern('100%_a\\b')).toBe('%100\\%\\_a\\\\b%');
  });

  it('찾은 글자를 홀수 칸으로 나눈다(대소문자 무시)', () => {
    expect(splitHits('VDI 접속, vdi 재부팅', 'VDI')).toEqual(['', 'VDI', ' 접속, ', 'vdi', ' 재부팅']);
    expect(splitHits('없음', '숙박')).toEqual(['없음']);
    expect(splitHits('그대로', '  ')).toEqual(['그대로']);
  });

  it('몇 번 나오는지 센다', () => {
    expect(countHits('출장 신청 · 출장비 정산 · 출장', '출장')).toBe(3);
    expect(countHits('없음', '출장')).toBe(0);
  });

  it('찾은 글자 앞뒤만 한 줄로 잘라 보여 준다', () => {
    const text = '가'.repeat(50) + '\n숙박비는  1박 100,000원' + '나'.repeat(50);
    const s = snippet(text, '숙박', 5);
    expect(s).toBe('…가가가가 숙박비는 1박…');
  });
});
