import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ParticleBurst, SparkleEffect } from './animations/particles';
import { hapticLight } from '../../utils/haptics';

interface XpGainToastProps {
  gains: { amount: number; source: string }[];
  onDone: () => void;
}

export default function XpGainToast({ gains, onDone }: XpGainToastProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (gains.length === 0) return;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [gains, onDone]);

  // Fire haptic for each gain on mount
  useEffect(() => {
    if (gains.length === 0) return;
    gains.forEach((_, i) => {
      setTimeout(() => { hapticLight(); }, i * 150);
    });
  }, [gains]);

  if (gains.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[9990] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {gains.map((gain, i) => (
          <motion.div
            key={`${gain.source}-${gain.amount}-${i}`}
            className="relative"
            initial={{ opacity: 0, y: 30, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{
              delay: i * 0.15,
              type: 'spring',
              damping: 12,
              stiffness: 200,
            }}
          >
            {/* Particle burst on entry */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: i * 0.15 + 0.6, duration: 0.1 }}
            >
              <ParticleBurst x={60} y={18} count={12} color="#14B8A6" />
            </motion.div>

            {/* Sparkles around pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15 + 0.1 }}
              style={{ position: 'absolute', inset: -20, pointerEvents: 'none' }}
            >
              <SparkleEffect count={4} color="#F59E0B" size={10} />
            </motion.div>

            {/* The pill — floats up slightly over lifetime */}
            <motion.div
              className="px-5 py-2.5 rounded-full shadow-lg shadow-amber-500/15 border"
              style={{
                background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7, #FDE68A)',
                borderColor: '#F59E0B55',
              }}
              animate={{ y: [0, -15] }}
              transition={{ duration: 3, delay: i * 0.15, ease: 'easeOut' }}
            >
              <span
                className="text-base font-extrabold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #B45309, #D97706)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('gamification.xpGained', { amount: gain.amount })}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
