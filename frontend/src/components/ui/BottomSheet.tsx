import { type ReactNode, useRef, useCallback, useEffect, useState } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const currentDragY = useRef<number>(0);
  const isDragging = useRef(false);
  // Track whether the sheet has ever been opened so we can render the DOM for transitions
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // Lock body scroll when open — iOS WKWebView needs aggressive blocking
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;

    // Fix body position
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    // Block ALL touch-scroll on everything except the sheet content
    const blockTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Allow scrolling inside the sheet content area
      if (target.closest('.bottomsheet-panel .overflow-y-auto')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', blockTouch, { passive: false });

    return () => {
      document.removeEventListener('touchmove', blockTouch);
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

  // Touch handlers for drag-to-dismiss
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    currentDragY.current = 0;
    isDragging.current = false;
    // Remove transition during drag
    if (panelRef.current) {
      panelRef.current.classList.add('dragging');
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dy = touch.clientY - dragStartY.current;
    // Only allow dragging downward
    currentDragY.current = Math.max(0, dy);
    if (currentDragY.current > 5) {
      isDragging.current = true;
    }
    if (panelRef.current && isDragging.current) {
      panelRef.current.style.transform = `translateY(${currentDragY.current}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.classList.remove('dragging');
    }
    if (currentDragY.current > 100) {
      // Dismiss
      handleClose();
    } else {
      // Snap back
      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }
    }
    isDragging.current = false;
    currentDragY.current = 0;
  }, [handleClose]);

  // After close transition ends, unmount
  const onTransitionEnd = useCallback(() => {
    if (!isOpen) {
      setMounted(false);
      // Reset inline transform
      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }
    }
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`bottomsheet-backdrop${isOpen ? ' open' : ''}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`bottomsheet-panel${isOpen ? ' open' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTransitionEnd={onTransitionEnd}
      >
        {/* Header: drag handle + title + X button */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
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
        <div className="overflow-y-auto px-5 pb-4 flex-1">
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
