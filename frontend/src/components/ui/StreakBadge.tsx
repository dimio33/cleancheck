import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const { t } = useTranslation();

  if (streak <= 0) return null;

  return (
    <motion.div
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-500 rounded-full"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 14 }}
    >
      <motion.span
        className="text-sm"
        animate={streak >= 7 ? { scale: [1, 1.2, 1] } : undefined}
        transition={streak >= 7 ? { repeat: Infinity, duration: 1.5 } : undefined}
      >
        🔥
      </motion.span>
      <span className="text-xs font-semibold text-white">
        {t('gamification.streak', { days: streak })}
      </span>
    </motion.div>
  );
}
