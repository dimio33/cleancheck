import { useTranslation } from 'react-i18next';

interface FirstRaterBadgeProps {
  username: string;
}

export default function FirstRaterBadge({ username }: FirstRaterBadgeProps) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-medium">
      <span>👑</span>
      <span>{t('gamification.firstRater')}</span>
      <span className="text-amber-400 ml-0.5">{username}</span>
    </span>
  );
}
