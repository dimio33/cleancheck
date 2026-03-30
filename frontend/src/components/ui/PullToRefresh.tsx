import { useState, useRef, useCallback, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { hapticLight } from '../../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const spinnerOpacity = useTransform(pullY, [0, 40, THRESHOLD], [0, 0.6, 1]);
  const spinnerScale = useTransform(pullY, [0, THRESHOLD], [0.4, 1]);
  const spinnerRotation = useTransform(pullY, [0, THRESHOLD * 2], [0, 360]);
  const startY = useRef(0);
  const pulling = useRef(false);
  const thresholdReached = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when scrolled to top
    const el = e.currentTarget;
    if (el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
    thresholdReached.current = false;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Rubber band dampening
    const dampened = delta * 0.45;
    pullY.set(dampened);

    // Haptic feedback when crossing threshold
    if (dampened >= THRESHOLD && !thresholdReached.current) {
      thresholdReached.current = true;
      hapticLight();
    } else if (dampened < THRESHOLD) {
      thresholdReached.current = false;
    }
  }, [pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullY.get() >= THRESHOLD) {
      // Snap to a small holding position while refreshing
      animate(pullY, 50, { type: 'spring', stiffness: 300, damping: 30 });
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    } else {
      // Spring back to top
      animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [pullY, onRefresh]);

  return (
    <div
      className="flex-1 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-down spinner indicator */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pullY, opacity: spinnerOpacity }}
      >
        <motion.svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          style={{ scale: spinnerScale, rotate: refreshing ? undefined : spinnerRotation }}
          animate={refreshing ? { rotate: 360 } : {}}
          transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: 'linear' } : {}}
        >
          <circle
            cx="14"
            cy="14"
            r="11"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="50 20"
            fill="none"
          />
        </motion.svg>
      </motion.div>
      {children}
    </div>
  );
}
