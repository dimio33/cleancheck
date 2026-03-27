import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparkleEffect, GlowPulse } from './animations/particles';
import { hapticSuccess } from '../../utils/haptics';

interface RewardUnlockedOverlayProps {
  reward: { name: string; icon?: string; type: string };
  onClose: () => void;
}

// Simple treasure chest SVG — golden body, brown lid, keyhole
function TreasureChest({ lidOpen }: { lidOpen: boolean }) {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* Body — golden rectangle with rounded bottom */}
      <rect x="15" y="45" width="90" height="50" rx="6" fill="url(#chestGold)" stroke="#B45309" strokeWidth="2" />
      {/* Horizontal band */}
      <rect x="15" y="60" width="90" height="8" fill="#D97706" opacity="0.5" />
      {/* Keyhole */}
      <circle cx="60" cy="70" r="6" fill="#78350F" />
      <rect x="57" y="70" width="6" height="10" rx="1" fill="#78350F" />

      {/* Lid — trapezoidal, rotates open */}
      <g style={{
        transformOrigin: '60px 48px',
        transform: lidOpen ? 'rotate(-30deg)' : 'rotate(0deg)',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <path
          d="M10 48 L20 20 L100 20 L110 48 Z"
          fill="url(#chestLid)"
          stroke="#92400E"
          strokeWidth="2"
        />
        {/* Lid band */}
        <rect x="20" y="30" width="80" height="6" rx="1" fill="#B45309" opacity="0.4" />
        {/* Lid top highlight */}
        <path d="M25 22 L95 22" stroke="#FBBF24" strokeWidth="1" opacity="0.6" />
      </g>

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="chestGold" x1="15" y1="45" x2="105" y2="95">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="chestLid" x1="10" y1="20" x2="110" y2="48">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="40%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function RewardUnlockedOverlay({ reward, onClose }: RewardUnlockedOverlayProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    hapticSuccess();
    const timers = [
      setTimeout(() => setPhase(1), 400),    // Chest appears
      setTimeout(() => setPhase(2), 1200),   // Chest opens + glow
      setTimeout(() => setPhase(3), 2000),   // Reward floats up
      setTimeout(() => setPhase(4), 3000),   // "Belohnung freigeschaltet!" text
      setTimeout(() => setPhase(5), 4000),   // Fade out
      setTimeout(() => onClose(), 4500),
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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)',
            }}
            animate={{ opacity: phase >= 5 ? 0 : 1 }}
            transition={{ duration: phase >= 5 ? 0.5 : 0.3 }}
          />

          {/* Content */}
          <motion.div
            className="relative flex flex-col items-center z-10"
            animate={{ opacity: phase >= 5 ? 0 : 1, scale: phase >= 5 ? 0.8 : 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Phase 1: Treasure chest */}
            {phase >= 1 && (
              <motion.div
                className="relative"
                initial={{ scale: 0, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 10, stiffness: 120 }}
              >
                <TreasureChest lidOpen={phase >= 2} />

                {/* Phase 2: Golden glow from opening */}
                {phase >= 2 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2" style={{ pointerEvents: 'none' }}>
                    <GlowPulse color="#F59E0B" size={160} />
                  </div>
                )}
              </motion.div>
            )}

            {/* Phase 3: Reward floats up from chest */}
            {phase >= 3 && (
              <motion.div
                className="relative flex flex-col items-center -mt-8"
                initial={{ y: 40, opacity: 0, scale: 0.3 }}
                animate={{ y: -20, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              >
                {/* Sparkles around reward */}
                <div className="absolute inset-0" style={{ width: 120, height: 120, left: -20, top: -30 }}>
                  <SparkleEffect count={8} color="#F59E0B" size={12} />
                </div>

                {/* Reward icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-200/50 mb-3">
                  <span className="text-3xl">{reward.icon || '🎁'}</span>
                </div>

                {/* Reward name */}
                <motion.p
                  className="text-lg font-bold text-white text-center px-4"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {reward.name}
                </motion.p>
              </motion.div>
            )}

            {/* Phase 4: "Belohnung freigeschaltet!" */}
            {phase >= 4 && (
              <motion.p
                className="text-sm font-semibold mt-4 tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                Belohnung freigeschaltet!
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
