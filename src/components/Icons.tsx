const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const SendIcon = () => <svg {...base} strokeWidth={2.2}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
export const ThumbUp = () => <svg {...base}><path d="M7 10v11H4V10h3zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" /></svg>;
export const ThumbDown = () => <svg {...base}><path d="M17 14V3h3v11h-3zM17 14l-4 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 6.4 3H17" /></svg>;
export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
export const DocIcon = () => <svg {...base} width={14} height={14}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>;
export const TrashIcon = () => <svg {...base} width={16} height={16}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const PlusIcon = () => <svg {...base}><path d="M12 5v14M5 12h14" /></svg>;
export const ClipIcon = () => <svg {...base}><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.9 8.9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" /></svg>;
export const CloseIcon = () => <svg {...base} width={14} height={14}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const MenuIcon = () => <svg {...base}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
export const BackIcon = () => <svg {...base}><path d="M20 12H5M11 6l-6 6 6 6" /></svg>;
