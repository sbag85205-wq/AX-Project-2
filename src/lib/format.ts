const DAY = 864e5;

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / DAY);
  if (diff <= 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return `${diff}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export const shortDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

/** n일 전 시각. 기준 시각(from)을 주면 그 시각에서 센다 */
export const daysAgo = (n: number, from = Date.now()) => new Date(from - n * DAY);

export const fmt = (n: number) => n.toLocaleString('ko-KR');
