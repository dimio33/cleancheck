import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface XpGainToastProps {
  gains: { amount: number; source: string }[];
  onDone: () => void;
}

export default function XpGainToast({ gains, onDone }: XpGainToastProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (gains.length === 0) return;
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [gains, onDone]);

  if (gains.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[9990] flex flex-col items-center gap-1.5 pointer-events-none">
      <AnimatePresence>
        {gains.map((gain, i) => (
          <motion.div
            key={`${gain.source}-${gain.amount}-${i}`}
            className="px-4 py-2 bg-teal-50 border border-teal-200 rounded-full shadow-md"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          >
            <span className="text-sm font-bold text-teal-600">
              {t('gamification.xpGained', { amount: gain.amount })}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
