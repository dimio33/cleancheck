import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface XpBarProps {
  xp: number;
  level: number;
  rank: string;
  xpForNextLevel: number;
  progress: number;
}

export default function XpBar({ xp, level, rank, xpForNextLevel, progress }: XpBarProps) {
  const { t } = useTranslation();
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/90">
          {t('gamification.level')} {level}
        </span>
        <span className="text-xs text-white/70">
          {xp} / {xpForNextLevel} {t('gamification.xp')}
        </span>
      </div>
      <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[11px] text-white/60 mt-1 text-center">
        {t(`gamification.ranks.${rank}`, rank)}
      </p>
    </div>
  );
}
