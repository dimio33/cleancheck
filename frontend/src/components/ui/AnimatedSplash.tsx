import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Sparkle star SVG — bigger, brighter, with glow
function Sparkle({ size = 16, delay = 0, x = 0, y = 0 }: { size?: number; delay?: number; x?: number; y?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.4, 1, 0], rotate: [0, 200] }}
      transition={{ duration: 1.4, delay, ease: 'easeOut' }}
    >
      <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </motion.svg>
  );
}

// Water drop — bigger, more visible, with trail effect
function WaterDrop({ delay = 0, startX = 0, startY = 0, size = 1 }: { delay?: number; startX?: number; startY?: number; size?: number }) {
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []);
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: 10 * size,
        height: 16 * size,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        background: 'rgba(255,255,255,0.7)',
        boxShadow: '0 0 8px rgba(255,255,255,0.4)',
      }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{ opacity: [0, 0.9, 0.6, 0], y: [0, -80, -130], scale: [0, 1.2, 0.4], x: [0, drift * 0.5, drift] }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
    />
  );
}

// Floating bubble particle for ambient effect
function Bubble({ delay = 0, x = 0, size = 4 }: { delay?: number; x?: number; size?: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        bottom: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 0.5, 0], y: [0, -400, -600] }}
      transition={{ duration: 3, delay, ease: 'easeOut' }}
    />
  );
}

interface AnimatedSplashProps {
  onComplete: () => void;
}

export default function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // sparkles + drops
      setTimeout(() => setPhase(2), 1000),  // checkmark
      setTimeout(() => setPhase(3), 1600),  // text + reflection
      setTimeout(() => setPhase(4), 5000),  // exit start — hold for impact
      setTimeout(() => onComplete(), 5800), // done - remove splash
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 5 && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, #0F766E 0%, #0D9488 40%, #0F766E 100%)',
            overflow: 'hidden',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {/* Ambient floating bubbles */}
          <Bubble delay={0.2} x={60} size={6} />
          <Bubble delay={0.5} x={150} size={4} />
          <Bubble delay={0.8} x={250} size={8} />
          <Bubble delay={1.0} x={100} size={5} />
          <Bubble delay={1.3} x={300} size={3} />
          <Bubble delay={0.4} x={200} size={7} />

          {/* Pulsing glow behind logo */}
          <motion.div
            style={{
              position: 'absolute',
              width: 350,
              height: 350,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20,184,166,0.5) 0%, rgba(20,184,166,0.1) 40%, transparent 70%)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1, 1.1, 1], opacity: [0, 0.7, 0.5, 0.6, 0.5] }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />

          {/* Expanding rings (flush swirl) */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                border: `${2 - i * 0.5}px solid rgba(255,255,255,${0.2 - i * 0.05})`,
              }}
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5 + i * 0.4, 2.5 + i * 0.5],
                rotate: [0, (i % 2 === 0 ? 1 : -1) * (300 + i * 60)],
                opacity: [0, 0.4, 0],
              }}
              transition={{ duration: 1.8 + i * 0.3, delay: 0.1 + i * 0.2, ease: 'easeOut' }}
            />
          ))}

          {/* Main logo container */}
          <div style={{ position: 'relative', width: 180, height: 180, zIndex: 10 }}>
            {/* Logo drops in */}
            <motion.img
              src="/logo.png"
              alt="WC-CleanCheck"
              style={{
                width: 180,
                height: 180,
                borderRadius: 36,
                filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.35))',
              }}
              initial={{ y: -500, rotate: -20, scale: 0.3, opacity: 0 }}
              animate={{
                y: [null, 15, -8, 3, 0],
                rotate: [null, 8, -4, 1, 0],
                scale: [null, 1.08, 0.96, 1.02, 1],
                opacity: [null, 1, 1, 1, 1],
              }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1.2, 0.36, 1],
                times: [0, 0.5, 0.7, 0.85, 1],
              }}
            />

            {/* Checkmark badge */}
            {phase >= 2 && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)',
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.4, 0.9, 1.1, 1], rotate: [null, 0] }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}

            {/* Sparkles — more, bigger, spread wider */}
            {phase >= 1 && (
              <>
                <Sparkle size={18} delay={0} x={-30} y={15} />
                <Sparkle size={12} delay={0.1} x={180} y={30} />
                <Sparkle size={15} delay={0.25} x={165} y={155} />
                <Sparkle size={10} delay={0.05} x={-20} y={140} />
                <Sparkle size={20} delay={0.2} x={75} y={-25} />
                <Sparkle size={8} delay={0.35} x={200} y={85} />
                <Sparkle size={14} delay={0.15} x={-35} y={80} />
                <Sparkle size={11} delay={0.4} x={100} y={190} />
              </>
            )}

            {/* Water drops — bigger, more visible */}
            {phase >= 1 && (
              <>
                <WaterDrop delay={0.05} startX={30} startY={165} size={1.3} />
                <WaterDrop delay={0.15} startX={85} startY={170} size={1.5} />
                <WaterDrop delay={0.1} startX={135} startY={165} size={1.2} />
                <WaterDrop delay={0.25} startX={55} startY={163} size={1} />
                <WaterDrop delay={0.2} startX={110} startY={168} size={1.4} />
                <WaterDrop delay={0.3} startX={70} startY={172} size={0.8} />
                <WaterDrop delay={0.35} startX={150} startY={160} size={1.1} />
              </>
            )}
          </div>

          {/* Reflection of logo */}
          {phase >= 1 && (
            <motion.img
              src="/logo.png"
              alt=""
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                marginTop: 8,
                transform: 'scaleY(-0.4) perspective(200px) rotateX(30deg)',
                opacity: 0.15,
                filter: 'blur(4px)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          )}

          {/* App name + tagline */}
          {phase >= 3 && (
            <motion.div
              style={{ marginTop: 20, textAlign: 'center', zIndex: 10 }}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.h1
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '-0.5px',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  margin: 0,
                  textShadow: '0 2px 16px rgba(0,0,0,0.2)',
                }}
              >
                WC-CleanCheck
              </motion.h1>
              <motion.p
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 8,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600,
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Bewerte. Vergleiche. Entscheide besser.
              </motion.p>
            </motion.div>
          )}

          {/* Smooth exit — zoom into logo + fade to stone-50 (app bg color) */}
          {phase >= 4 && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FAFAF9',
                zIndex: 20,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
