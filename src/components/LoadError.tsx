/** 불러오기 실패: 빈 화면("아직 없어요") 대신 오류와 다시 시도 버튼을 보여준다. */
export function LoadError({ message, onRetry, className = 'card empty' }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div className={className} role="alert">
      <div>{message}</div>
      <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>다시 시도</button>
    </div>
  );
}
