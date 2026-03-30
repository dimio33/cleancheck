import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { hapticLight } from '../../utils/haptics';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    hapticLight();
    onClose();
  }, [onClose]);

  const onTransitionEnd = useCallback(() => {
    if (!isOpen) setMounted(false);
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop — no click to close, purely visual */}
      <div className={`bottomsheet-backdrop${isOpen ? ' open' : ''}`} />

      {/* Panel */}
      <div
        className={`bottomsheet-panel${isOpen ? ' open' : ''}`}
        onTransitionEnd={onTransitionEnd}
      >
        {/* Header: title + X button */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-[15px] font-bold text-stone-900">{title || ''}</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center active:bg-stone-200 transition-colors"
            aria-label="Schließen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 pb-4 flex-1 overscroll-contain">
          {children}
        </div>

        {/* Apply button */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold text-[15px] active:bg-teal-700 transition-colors"
          >
            Anwenden
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
