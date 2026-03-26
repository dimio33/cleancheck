import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LevelUpOverlayProps {
  level: number;
  rank: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444'];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 15 + Math.random() * 70;
  const size = 4 + Math.random() * 6;
  const delay = Math.random() * 0.5;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        left: `${left}%`,
        bottom: '30%',
      }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -120 - Math.random() * 200],
        x: [-30 + Math.random() * 60],
        scale: [0, 1.2, 1, 0.5],
        rotate: [0, 180 + Math.random() * 360],
      }}
      transition={{
        duration: 2 + Math.random(),
        delay: 0.3 + delay,
        ease: 'easeOut',
      }}
    />
  );
}

export default function LevelUpOverlay({ level, rank, onClose }: LevelUpOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Content */}
        <motion.div
          className="relative flex flex-col items-center z-10"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 150 }}
        >
          {/* Level Up Title */}
          <motion.p
            className="text-lg font-bold text-teal-300 tracking-widest uppercase mb-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('gamification.levelUp')}
          </motion.p>

          {/* Glow ring + level number */}
          <motion.div
            className="relative w-28 h-28 flex items-center justify-center mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1, damping: 10 }}
          >
            {/* Outer glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(13,148,136,0.4) 0%, transparent 70%)',
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            {/* Ring */}
            <div className="absolute inset-2 rounded-full border-4 border-teal-400/60" />
            {/* Level */}
            <span className="text-5xl font-extrabold text-white">{level}</span>
          </motion.div>

          {/* Rank title */}
          <motion.p
            className="text-base text-white/80 font-medium"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t(`gamification.ranks.${rank}`, rank)}
          </motion.p>

          <motion.p
            className="text-sm text-white/50 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {t('gamification.newLevel', { level })}
          </motion.p>
        </motion.div>

        {/* Confetti particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
