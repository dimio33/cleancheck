import { useMemo } from 'react';
import { motion } from 'framer-motion';

// ─── ConfettiRain ────────────────────────────────────────────────────────────

const DEFAULT_CONFETTI_COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E'];

type ConfettiShape = 'circle' | 'rect' | 'star';

function getShape(index: number): ConfettiShape {
  const roll = index % 10;
  if (roll < 4) return 'circle';
  if (roll < 7) return 'rect';
  return 'star';
}

function StarSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </svg>
  );
}

interface ConfettiRainProps {
  count?: number;
  duration?: number;
  colors?: string[];
}

export function ConfettiRain({ count = 60, duration = 3.5, colors = DEFAULT_CONFETTI_COLORS }: ConfettiRainProps) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 1,
      drift: (Math.random() - 0.5) * 80,
      rotation: 180 + Math.random() * 540,
      color: colors[i % colors.length],
      shape: getShape(i),
      dur: duration + (Math.random() - 0.5) * 1,
    })),
    [count, duration, colors]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 20 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -12,
            width: p.shape === 'star' ? undefined : p.size,
            height: p.shape === 'star' ? undefined : p.size,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '1px' : undefined,
            backgroundColor: p.shape !== 'star' ? p.color : undefined,
            ...(p.shape === 'rect' ? { width: p.size * 0.5, height: p.size * 1.4 } : {}),
          }}
          initial={{ opacity: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, window.innerHeight * 0.5, window.innerHeight * 0.8, window.innerHeight * 1.1],
            x: [0, p.drift * 0.3, p.drift * 0.7, p.drift],
            rotate: [0, p.rotation],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            ease: 'easeIn',
            times: [0, 0.3, 0.7, 1],
          }}
        >
          {p.shape === 'star' && <StarSVG color={p.color} size={p.size} />}
        </motion.div>
      ))}
    </div>
  );
}

// ─── ParticleBurst ───────────────────────────────────────────────────────────

interface ParticleBurstProps {
  x?: number;
  y?: number;
  count?: number;
  color?: string;
}

export function ParticleBurst({ x = 0, y = 0, count = 18, color = '#14B8A6' }: ParticleBurstProps) {
  const dots = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 30 + Math.random() * 50;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 3 + Math.random() * 4,
      };
    }),
    [count]
  );

  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 30 }}>
      {dots.map((d) => (
        <motion.div
          key={d.id}
          style={{
            position: 'absolute',
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            backgroundColor: color,
            left: -d.size / 2,
            top: -d.size / 2,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: d.dx, y: d.dy, scale: 0.2 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ─── SparkleEffect ───────────────────────────────────────────────────────────

interface SparkleEffectProps {
  count?: number;
  color?: string;
  size?: number;
}

export function SparkleEffect({ count = 10, color = '#F59E0B', size = 16 }: SparkleEffectProps) {
  const sparkles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160,
      s: size * (0.5 + Math.random() * 0.8),
      delay: Math.random() * 0.5,
      rotation: Math.random() * 90 - 45,
    })),
    [count, size]
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
      {sparkles.map((sp) => (
        <motion.svg
          key={sp.id}
          width={sp.s}
          height={sp.s}
          viewBox="0 0 24 24"
          fill={color}
          style={{
            position: 'absolute',
            left: `calc(50% + ${sp.x}px)`,
            top: `calc(50% + ${sp.y}px)`,
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
          initial={{ opacity: 0, scale: 0, rotate: sp.rotation - 30 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            rotate: [sp.rotation - 30, sp.rotation + 30],
          }}
          transition={{ duration: 1.2, delay: sp.delay, ease: 'easeOut' }}
        >
          <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
        </motion.svg>
      ))}
    </div>
  );
}

// ─── RingExpansion ────────────────────────────────────────────────────────────

interface RingExpansionProps {
  color?: string;
  delay?: number;
  duration?: number;
}

export function RingExpansion({ color = '#14B8A6', delay = 0, duration = 1.2 }: RingExpansionProps) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0.3, opacity: 1, borderWidth: 4 }}
      animate={{ scale: 2.0, opacity: 0, borderWidth: 0.5 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    />
  );
}

// ─── GlowPulse ───────────────────────────────────────────────────────────────

interface GlowPulseProps {
  color?: string;
  size?: number;
}

export function GlowPulse({ color = '#14B8A6', size = 200 }: GlowPulseProps) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}66 0%, ${color}1A 40%, transparent 70%)`,
        pointerEvents: 'none',
      }}
      animate={{
        scale: [0.8, 1.2, 0.8],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
