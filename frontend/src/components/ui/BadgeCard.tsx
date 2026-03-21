import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Badge } from '../../types';

interface BadgeCardProps {
  badge: Badge;
  index?: number;
}

export default function BadgeCard({ badge, index = 0 }: BadgeCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

  // Use slug for i18n lookup, fall back to API name fields
  const badgeName = badge.slug
    ? t(`badges.${badge.slug}.name`, lang === 'de' ? (badge.name_de || badge.name) : (badge.name_en || badge.name))
    : badge.name;
  const badgeDesc = badge.slug
    ? t(`badges.${badge.slug}.description`, lang === 'de' ? (badge.description_de || badge.description) : (badge.description_en || badge.description))
    : badge.description;

  // Badges returned from profile API are always earned (presence = earned)
  const isEarned = badge.earned !== false;

  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl min-h-[130px] transition-all ${
        isEarned
          ? 'bg-white dark:bg-stone-900 shadow-sm shadow-stone-200/50 dark:shadow-none ring-1 ring-teal-100 dark:ring-teal-900'
          : 'bg-stone-50 dark:bg-stone-800 opacity-60'
      }`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isEarned ? 1 : 0.6, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <span className="text-2xl mb-2">{badge.icon}</span>
      <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-0.5">{badgeName}</h4>
      <p className="text-[11px] text-stone-400 leading-tight">{badgeDesc}</p>
      {isEarned && badge.earned_at && (
        <span className="text-[10px] text-teal-600 font-medium mt-1.5">
          {new Date(badge.earned_at).toLocaleDateString()}
        </span>
      )}
    </motion.div>
  );
}
