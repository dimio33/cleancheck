import { useState, useRef, useCallback, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const spinnerOpacity = useTransform(pullY, [0, 60], [0, 1]);
  const spinnerScale = useTransform(pullY, [0, 60], [0.5, 1]);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate at scroll top
    const el = e.currentTarget;
    if (el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Dampen the pull (rubber band feel)
    pullY.set(delta * 0.4);
  }, [pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullY.get() >= THRESHOLD) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    pullY.set(0);
  }, [pullY, onRefresh]);

  return (
    <div
      className="flex-1 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pullY, opacity: spinnerOpacity }}
      >
        <motion.div
          className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"
          style={{ scale: spinnerScale }}
          animate={refreshing ? { rotate: 360 } : {}}
          transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
        />
      </motion.div>
      {children}
    </div>
  );
}
