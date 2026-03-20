import { type ReactNode } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  snapPoints?: number[];
  defaultSnap?: number;
}

export default function BottomSheet({
  children,
  isOpen,
  onClose,
  snapPoints = [0.4, 0.85],
  defaultSnap = 0,
}: BottomSheetProps) {
  const dragControls = useDragControls();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 200) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  const snapHeight = snapPoints[defaultSnap] * 100;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] max-w-lg mx-auto max-h-[70vh]"
      style={{ height: `${snapHeight}vh` }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      drag="y"
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="w-8 h-1 rounded-full bg-stone-200" />
      </div>
      <div className="overflow-y-auto px-4 pb-4" style={{ height: 'calc(100% - 20px)' }}>
        {children}
      </div>
    </motion.div>
  );
}
