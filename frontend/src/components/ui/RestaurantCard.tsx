import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Restaurant } from '../../types';
import { formatDistance } from '../../utils/geo';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { hapticLight } from '../../utils/haptics';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distance?: number;
  index?: number;
}

function getScoreBadgeBg(score: number | null): string {
  if (score === null) return 'bg-stone-100';
  if (score >= 7.0) return 'bg-[#10B981]';
  if (score >= 4.0) return 'bg-[#F59E0B]';
  return 'bg-[#EF4444]';
}

function RestaurantCardInner({ restaurant, distance, index = 0 }: RestaurantCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isFavorite = useFavoritesStore((s) => s.favorites.includes(restaurant.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const score = restaurant.clean_score;
  const hasScore = score !== null;

  // Build subtitle parts: cuisine, distance, rating count
  const subtitleParts: string[] = [];
  if (restaurant.cuisine) subtitleParts.push(restaurant.cuisine);
  if (distance !== undefined) subtitleParts.push(`${formatDistance(distance)} ${t('home.away')}`);
  if (restaurant.rating_count > 0) {
    subtitleParts.push(t('home.ratings', { count: restaurant.rating_count }));
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => { hapticLight(); navigate(`/restaurant/${restaurant.id}`); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/restaurant/${restaurant.id}`); }}
      className="w-full flex items-center gap-3.5 p-4 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] text-left cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20, stiffness: 300 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Score badge — squircle */}
      {hasScore ? (
        <motion.div
          className={`flex-shrink-0 w-12 h-12 rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${getScoreBadgeBg(score)}`}
          initial={{ scale: 0.85 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span className="text-[15px] font-bold tracking-tight text-white">
            {score!.toFixed(1)}
          </span>
        </motion.div>
      ) : (
        <div className="flex-shrink-0 w-12 h-12 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-dashed border-teal-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-stone-900 tracking-[-0.2px] truncate">
          {restaurant.name}
        </h3>
        <p className="text-[13px] text-stone-400 truncate mt-0.5">
          {subtitleParts.join(' \u00B7 ')}
        </p>
        {!hasScore && (
          <p className="text-[11px] text-teal-500 font-medium mt-0.5">{t('home.beFirstToRate')}</p>
        )}
      </div>

      {/* Favorite heart */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          hapticLight();
          toggleFavorite(restaurant.id);
        }}
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
          animate={isFavorite ? { scale: [1, 1.3, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
      </motion.button>

      {/* Chevron right */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D6D3D1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </motion.div>
  );
}

const RestaurantCard = memo(RestaurantCardInner);
export default RestaurantCard;
