import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ConfettiRain, SparkleEffect, RingExpansion, GlowPulse } from './animations/particles';
import { hapticCelebration } from '../../utils/haptics';

interface LevelUpOverlayProps {
  level: number;
  rank: string;
  onClose: () => void;
}

export default function LevelUpOverlay({ level, rank, onClose }: LevelUpOverlayProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Phase timeline
    const timers = [
      setTimeout(() => { hapticCelebration(); setPhase(1); }, 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 5000),
      setTimeout(() => onClose(), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {phase < 6 && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          {/* Backdrop — dark gradient */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 5 ? 0 : 1 }}
            transition={{ duration: phase >= 5 ? 0.5 : 0.3 }}
          />

          {/* Phase 0: Screen flash */}
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            style={{ zIndex: 50 }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Phase 1: Ring expansions + glow */}
          {phase >= 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <RingExpansion color="#14B8A6" delay={0} duration={1.2} />
              <RingExpansion color="#10B981" delay={0.2} duration={1.2} />
              <RingExpansion color="#F59E0B" delay={0.4} duration={1.2} />
              <GlowPulse color="#14B8A6" size={250} />
            </div>
          )}

          {/* Phase 2: Confetti */}
          {phase >= 2 && <ConfettiRain count={60} duration={3.5} />}

          {/* Content container */}
          <motion.div
            className="relative flex flex-col items-center z-10"
            animate={{ opacity: phase >= 5 ? 0 : 1, scale: phase >= 5 ? 0.8 : 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Phase 3: "LEVEL UP!" slides down from above */}
            {phase >= 3 && (
              <motion.p
                className="text-lg font-black tracking-[0.3em] uppercase mb-6"
                style={{
                  background: 'linear-gradient(135deg, #5EEAD4, #14B8A6, #10B981)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 12px rgba(20,184,166,0.5))',
                }}
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 120 }}
              >
                {t('gamification.levelUp')}
              </motion.p>
            )}

            {/* Phase 2: Level number — dramatic spring entry */}
            {phase >= 2 && (
              <motion.div
                className="relative w-36 h-36 flex items-center justify-center mb-6"
                initial={{ scale: 0, rotate: -20 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  ...(phase >= 4 ? {} : {}),
                }}
                transition={{
                  type: 'spring',
                  damping: 8,
                  stiffness: 100,
                }}
              >
                {/* Outer animated ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '3px solid rgba(20,184,166,0.4)',
                    boxShadow: '0 0 30px rgba(20,184,166,0.2), inset 0 0 30px rgba(20,184,166,0.1)',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                />

                {/* Inner glow */}
                <motion.div
                  className="absolute inset-4 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
                  }}
                />

                {/* Level number with subtle pulse in phase 4 */}
                <motion.span
                  className="text-7xl font-black text-white relative"
                  style={{
                    textShadow: '0 0 40px rgba(20,184,166,0.6), 0 4px 20px rgba(0,0,0,0.3)',
                  }}
                  animate={phase >= 4 ? { scale: [1, 1.05, 1] } : {}}
                  transition={phase >= 4 ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  {level}
                </motion.span>

                {/* Phase 3: Sparkles around level number */}
                {phase >= 3 && (
                  <SparkleEffect count={12} color="#F59E0B" size={14} />
                )}
              </motion.div>
            )}

            {/* Phase 3: Rank title */}
            {phase >= 3 && (
              <>
                <motion.p
                  className="text-base text-white/80 font-semibold"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {t(`gamification.ranks.${rank}`, rank)}
                </motion.p>

                <motion.p
                  className="text-sm text-white/50 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {t('gamification.newLevel', { level })}
                </motion.p>
              </>
            )}

            {/* Phase 4: "Tap to continue" blink */}
            {phase >= 4 && (
              <motion.p
                className="text-xs text-white/30 mt-8 tracking-wide"
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {t('gamification.tapToContinue', 'Tippe zum Fortfahren')}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
