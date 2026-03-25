import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
// motion used for heart bounce animation
import type { Restaurant } from '../../types';
import { getScoreLabel, formatDistance } from '../../utils/geo';
import { useFavoritesStore } from '../../stores/favoritesStore';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distance?: number;
  index?: number;
}

function RestaurantCardInner({ restaurant, distance, index = 0 }: RestaurantCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(restaurant.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

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

      {/* Favorite heart */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(restaurant.id); }}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
        aria-label="Favorite"
        whileTap={{ scale: 1.4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        <motion.svg
          width="16" height="16" viewBox="0 0 24 24"
          fill={isFavorite ? '#F43F5E' : 'none'}
          stroke={isFavorite ? '#F43F5E' : '#D6D3D1'}
          strokeWidth="2"
          animate={{ scale: isFavorite ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
      </motion.button>
    </motion.button>
  );
}

const RestaurantCard = memo(RestaurantCardInner);
export default RestaurantCard;
