import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Restaurant } from '../../types';
import { getScoreLabel, formatDistance } from '../../data/mockData';

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
              {/* Proximity indicator: green pin if within 200m, gray if farther */}
              <span title={distance <= 200 ? t('geo.withinRange') : t('geo.outOfRange')}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={distance <= 200 ? '#10B981' : '#D6D3D1'}
                  className="flex-shrink-0"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
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
