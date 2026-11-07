/** 청크 분할 때 앞 청크 끝을 겹쳐 넣은 부분을 떼어 내 원문처럼 이어 읽게 한다. */
export function stripOverlap(prev: string, next: string, maxOverlap = 400): string {
  const limit = Math.min(maxOverlap, prev.length, next.length);
  for (let k = limit; k >= 20; k--) {
    if (prev.endsWith(next.slice(0, k))) return next.slice(k).replace(/^\s+/, '');
  }
  return next;
}
