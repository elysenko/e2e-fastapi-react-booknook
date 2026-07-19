// Accessible modal shell: dims the background, closes on overlay click or Escape.
import { useEffect } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  testid,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testid?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testid}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close" data-testid="modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
