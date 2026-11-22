import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    // The admin iframe grows with its question list. Its viewport can be much
    // taller than the visible app, so position dialogs within the visible slice.
    const frame = window.frameElement;
    const parentWindow = frame?.ownerDocument.defaultView;
    const backdrop = backdropRef.current;
    if (!frame || !parentWindow || !backdrop) return;

    const ancestors: Element[] = [];
    for (let element = frame.parentElement; element; element = element.parentElement) ancestors.push(element);
    // 내용이 짧으면 iframe도 짧아서(예: FAQ가 몇 개뿐) 창 아래 저장·취소 버튼이 잘렸다.
    // 창이 열려 있는 동안은 iframe을 보이는 화면 끝까지 늘려 창과 어두운 배경이 다 들어가게 한다.
    const body = document.body;
    const prevMinHeight = body.style.minHeight;
    const position = () => {
      const rect = frame.getBoundingClientRect();
      const frameTop = rect.top + frame.clientTop;
      let top = Math.max(0, frameTop);
      let viewBottom = parentWindow.innerHeight;
      for (const ancestor of ancestors) {
        if (!/(auto|scroll|hidden|clip)/.test(parentWindow.getComputedStyle(ancestor).overflowY)) continue;
        const bounds = ancestor.getBoundingClientRect();
        const contentTop = bounds.top + ancestor.clientTop;
        top = Math.max(top, contentTop);
        viewBottom = Math.min(viewBottom, contentTop + ancestor.clientHeight);
      }
      const fill = Math.ceil(viewBottom - frameTop);
      if (fill > frame.clientHeight) body.style.minHeight = `${fill}px`;
      const bottom = Math.min(viewBottom, frameTop + frame.clientHeight);
      const height = Math.max(0, bottom - top);
      Object.assign(backdrop.style, {
        top: `${Math.max(0, top - frameTop)}px`,
        bottom: 'auto',
        height: `${height}px`,
        paddingTop: `${Math.min(48, height * 0.1)}px`
      });
    };

    position();
    parentWindow.addEventListener('scroll', position, true);
    parentWindow.addEventListener('resize', position);
    const observer = new ResizeObserver(position);
    [frame, ...ancestors].forEach((element) => observer.observe(element));
    return () => {
      parentWindow.removeEventListener('scroll', position, true);
      parentWindow.removeEventListener('resize', position);
      observer.disconnect();
      body.style.minHeight = prevMinHeight;
    };
  }, []);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div className="backdrop" ref={backdropRef} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <h2 id="dialog-title">{title}</h2>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
