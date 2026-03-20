import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ScoreGauge from '../components/ui/ScoreGauge';
import { getRestaurantRatings, getScoreColor } from '../data/mockData';
import { useRestaurantStore } from '../stores/restaurantStore';
import api from '../services/api';

const CRITERIA_KEYS = ['cleanliness', 'smell', 'supplies', 'maintenance', 'accessibility'] as const;
const CRITERIA_ICONS: Record<string, string> = {
  cleanliness: '🧹',
  smell: '👃',
  supplies: '🧻',
  maintenance: '🔧',
  accessibility: '♿',
};

function getKitchenConfidence(score: number | null): { label: string; color: string; emoji: string } {
  if (score === null) return { label: 'Unknown', color: '#9ca3af', emoji: '?' };
  if (score >= 8.5) return { label: 'Excellent', color: '#10b981', emoji: '👨‍🍳' };
  if (score >= 7) return { label: 'Good', color: '#22c55e', emoji: '👍' };
  if (score >= 5) return { label: 'Moderate', color: '#f59e0b', emoji: '🤔' };
  return { label: 'Concerning', color: '#ef4444', emoji: '⚠️' };
}

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const restaurant = useRestaurantStore((s) => s.getById(id || ''));

  const [apiRatings, setApiRatings] = useState<any[]>([]);

  useEffect(() => {
    if (id && !id.startsWith('osm-')) {
      api.get(`/restaurants/${id}`)
        .then(({ data }) => {
          setApiRatings(data.ratings || []);
        })
        .catch(() => {});
    }
  }, [id]);

  // Use apiRatings when available, otherwise fall back to mock
  const ratings = apiRatings.length > 0 ? apiRatings : (id ? getRestaurantRatings(id) : []);

  if (!restaurant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Restaurant not found</p>
      </div>
    );
  }

  const kitchen = getKitchenConfidence(restaurant.clean_score);

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-b from-teal-500 to-teal-600 px-6 pt-5 pb-10 rounded-b-3xl text-white">
        <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
        {restaurant.address && (
          <p className="text-teal-100 text-sm mt-1">{restaurant.address}</p>
        )}
        {restaurant.cuisine && (
          <span className="inline-block mt-2.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
            {restaurant.cuisine}
          </span>
        )}
      </div>

      {/* Score section */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-6 text-center">
          <div className="flex justify-center mb-3">
            <ScoreGauge score={restaurant.clean_score} size={140} strokeWidth={10} />
          </div>
          <p className="text-sm font-medium text-stone-500">{t('restaurant.cleanScore')}</p>

          {/* Kitchen Confidence */}
          <motion.div
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: `${kitchen.color}10` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <span>{kitchen.emoji}</span>
            <span className="text-xs font-medium" style={{ color: kitchen.color }}>
              {t('restaurant.kitchenConfidence')}: {kitchen.label}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Criteria bars */}
      {restaurant.criteria_averages && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
            {CRITERIA_KEYS.map((key, i) => {
              const value = restaurant.criteria_averages![key];
              const percent = (value / 5) * 100;
              const color = getScoreColor(value * 2);
              return (
                <motion.div
                  key={key}
                  className="flex items-center gap-3 py-2.5"
                  initial={{ opacity: 0.4, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                >
                  <span className="text-base w-6 text-center">{CRITERIA_ICONS[key]}</span>
                  <span className="text-xs text-stone-500 w-24 shrink-0">
                    {t(`restaurant.criteria.${key}`)}
                  </span>
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-700 w-8 text-right">
                    {value.toFixed(1)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 mt-4">
        <motion.button
          onClick={() => navigate('/rate', { state: { restaurantId: restaurant.id } })}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
          whileTap={{ scale: 0.98 }}
        >
          {t('restaurant.rateThis')}
        </motion.button>
      </div>

      {/* Reviews */}
      <div className="mx-4 mt-6">
        <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
          {t('restaurant.reviews')} ({ratings.length})
        </h2>
        {ratings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-stone-400">{t('restaurant.noReviews')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ratings.map((rating, i) => (
              <motion.div
                key={rating.id}
                className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4"
                initial={{ opacity: 0.5, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-medium">
                      {(rating.user_name || rating.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-stone-800">{rating.user_name || rating.username}</span>
                      <span className="text-[10px] text-stone-400 block">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${getScoreColor(rating.overall_score)}12`,
                      color: getScoreColor(rating.overall_score),
                    }}
                  >
                    {Number(rating.overall_score).toFixed(1)}
                  </div>
                </div>
                {rating.comment && (
                  <p className="text-sm text-stone-600 leading-relaxed">{rating.comment}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
