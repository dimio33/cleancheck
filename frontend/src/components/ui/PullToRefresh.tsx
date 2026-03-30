import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { hapticLight } from '../../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;
const DAMPEN = 0.4;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullY = useMotionValue(0);
  const spinnerOpacity = useTransform(pullY, [0, 30, THRESHOLD], [0, 0.5, 1]);
  const spinnerScale = useTransform(pullY, [0, THRESHOLD], [0.3, 1]);
  const startY = useRef(0);
  const pulling = useRef(false);
  const thresholdReached = useRef(false);

  // Use native touch events for better Capacitor/WebView compatibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Check if we're at the top of scroll
      if (el.scrollTop > 5) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      thresholdReached.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        // Scrolling up, abort pull
        pulling.current = false;
        pullY.set(0);
        return;
      }
      const dampened = delta * DAMPEN;
      pullY.set(dampened);

      // Prevent native scroll while pulling
      if (dampened > 10) {
        e.preventDefault();
      }

      if (dampened >= THRESHOLD && !thresholdReached.current) {
        thresholdReached.current = true;
        hapticLight();
      } else if (dampened < THRESHOLD) {
        thresholdReached.current = false;
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullY.get() >= THRESHOLD) {
        animate(pullY, 50, { type: 'spring', stiffness: 300, damping: 30 });
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 30 });
        }
      } else {
        animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [refreshing, pullY, onRefresh]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-none">
      {/* Spinner */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pullY, opacity: spinnerOpacity }}
      >
        <motion.svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          style={{ scale: spinnerScale }}
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
