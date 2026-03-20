import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Restaurant } from '../../types';
import { getScoreLabel, formatDistance } from '../../utils/geo';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distance?: number;
  index?: number;
}

export default function RestaurantCard({ restaurant, distance, index = 0 }: RestaurantCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getScoreColor = (s: number | null) => {
    if (s === null) return { stroke: '#D6D3D1', text: 'text-stone-400' };
    if (s >= 8) return { stroke: '#10B981', text: 'text-emerald-600' };
    if (s >= 5) return { stroke: '#F59E0B', text: 'text-amber-600' };
    return { stroke: '#F43F5E', text: 'text-rose-600' };
  };

  const colors = getScoreColor(restaurant.clean_score);
  const circumference = 2 * Math.PI * 19;

  return (
    <motion.button
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
      className="w-full flex items-center gap-3.5 p-3.5 bg-white rounded-2xl shadow-sm shadow-stone-200/50 hover:shadow-md hover:-translate-y-px transition-all duration-200 text-left"
      initial={{ opacity: 0.6, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
    >
      {/* Score circle */}
      <div className="relative flex-shrink-0 w-11 h-11">
        <svg width="44" height="44" className="-rotate-90">
          <circle cx="22" cy="22" r="19" fill="none" stroke="#F5F5F4" strokeWidth="2.5" />
          {restaurant.clean_score !== null && (
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${(restaurant.clean_score / 10) * circumference} ${circumference}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-semibold ${colors.text}`}>
            {getScoreLabel(restaurant.clean_score)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-stone-800 truncate">{restaurant.name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {restaurant.cuisine && (
            <span className="text-xs bg-stone-100 text-stone-500 rounded-full px-2 py-0.5">
              {restaurant.cuisine}
            </span>
          )}
          {distance !== undefined && (
            <>
              <span className="text-xs text-stone-400">
                {formatDistance(distance)} {t('home.away')}
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-stone-400 mt-0.5">
          {restaurant.rating_count > 0
            ? `${restaurant.rating_count} ${t('home.ratings')}`
            : t('home.noRatings')}
        </p>
      </div>

      {/* Chevron */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="flex-shrink-0 text-stone-300"
      >
        <path
          d="M6 3L11 8L6 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}
