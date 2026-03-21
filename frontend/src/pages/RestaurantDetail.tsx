import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreGauge from '../components/ui/ScoreGauge';
import QRCodeModal from '../components/ui/QRCodeModal';
import { getScoreColor } from '../utils/geo';
import { useRestaurantStore } from '../stores/restaurantStore';
import { useToastStore } from '../components/ui/Toast';
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

function getPhotoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return base.replace('/api', '') + url;
}

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);

  const restaurant = useRestaurantStore((s) => s.getById(id || ''));

  const [apiRatings, setApiRatings] = useState<any[]>([]);
  const [apiRestaurant, setApiRestaurant] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!id) return;
    setApiLoading(true);

    if (id.startsWith('osm-')) {
      const storeRestaurant = useRestaurantStore.getState().getById(id);
      if (storeRestaurant) {
        const osmId = id.replace('osm-', '');
        api.get(`/restaurants?lat=${storeRestaurant.lat}&lng=${storeRestaurant.lng}&radius=0.5`)
          .then(({ data }) => {
            const match = data.restaurants?.find((r: any) => String(r.osm_id) === osmId);
            if (match) return api.get(`/restaurants/${match.id}`);
            // Wider radius fallback
            return api.get(`/restaurants?lat=${storeRestaurant.lat}&lng=${storeRestaurant.lng}&radius=5`)
              .then(({ data: wider }) => {
                const m = wider.restaurants?.find((r: any) => String(r.osm_id) === osmId);
                return m ? api.get(`/restaurants/${m.id}`) : null;
              });
          })
          .then((res) => {
            if (res?.data) {
              setApiRatings(res.data.ratings || []);
              if (res.data.restaurant) setApiRestaurant(res.data.restaurant);
            }
          })
          .catch(() => {})
          .finally(() => setApiLoading(false));
      } else {
        setApiLoading(false);
      }
    } else {
      // UUID from DB (e.g. from Trending page)
      api.get(`/restaurants/${id}`)
        .then(({ data }) => {
          setApiRatings(data.ratings || []);
          if (data.restaurant) setApiRestaurant(data.restaurant);
        })
        .catch(() => {})
        .finally(() => setApiLoading(false));
    }
  }, [id]);

  const ratings = apiRatings;

  // Build display data: prefer store restaurant, fall back to API restaurant (for Trending/QR links)
  const baseRestaurant = restaurant || (apiRestaurant ? {
    id: apiRestaurant.id,
    name: apiRestaurant.name,
    lat: parseFloat(apiRestaurant.lat),
    lng: parseFloat(apiRestaurant.lng),
    address: apiRestaurant.address,
    cuisine: apiRestaurant.cuisine_type,
    clean_score: parseFloat(apiRestaurant.clean_score) || null,
    rating_count: apiRestaurant.total_ratings || 0,
  } : null) as (typeof restaurant) | null;

  if (!baseRestaurant && !apiLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 dark:text-stone-500 text-sm">{t('restaurant.notFound')}</p>
      </div>
    );
  }

  if (!baseRestaurant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayRestaurant = apiRestaurant
    ? { ...baseRestaurant, clean_score: parseFloat(apiRestaurant.clean_score), rating_count: apiRestaurant.total_ratings }
    : baseRestaurant;

  const kitchen = getKitchenConfidence(displayRestaurant.clean_score);
  const dbId = apiRestaurant?.id || (id && !id.startsWith('osm-') ? id : null);

  const handleShare = async () => {
    const text = `${baseRestaurant.name} — CleanScore: ${displayRestaurant.clean_score?.toFixed(1) || '?'}/10`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'CleanCheck', text, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      addToast(t('share.copied'), 'success');
    }
  };

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-b from-teal-500 to-teal-600 px-6 pt-5 pb-10 rounded-b-3xl text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{baseRestaurant.name}</h1>
            {baseRestaurant.address && (
              <p className="text-teal-100 text-sm mt-1">{baseRestaurant.address}</p>
            )}
            {baseRestaurant.cuisine && (
              <span className="inline-block mt-2.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                {baseRestaurant.cuisine}
              </span>
            )}
          </div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
              title={t('share.title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {dbId && (
              <button
                onClick={() => setShowQR(true)}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
                title={t('qr.title')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Score section */}
      <div className="px-4 -mt-6">
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm shadow-stone-200/50 dark:shadow-none p-6 text-center">
          <div className="flex justify-center mb-3">
            <ScoreGauge score={displayRestaurant.clean_score} size={140} strokeWidth={10} />
          </div>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{t('restaurant.cleanScore')}</p>

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
      {baseRestaurant.criteria_averages && (
        <div className="px-4 mt-3">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm shadow-stone-200/50 dark:shadow-none p-5">
            {CRITERIA_KEYS.map((key, i) => {
              const value = baseRestaurant.criteria_averages![key];
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
                  <span className="text-xs text-stone-500 dark:text-stone-400 w-24 shrink-0">
                    {t(`restaurant.criteria.${key}`)}
                  </span>
                  <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300 w-8 text-right">
                    {value.toFixed(1)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-30 max-w-lg mx-auto">
        <motion.button
          onClick={() => navigate('/rate', { state: { restaurantId: baseRestaurant.id } })}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/30 active:scale-[0.98] transition-transform text-base"
          whileTap={{ scale: 0.98 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
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
            <p className="text-sm text-stone-400 dark:text-stone-500">{t('restaurant.noReviews')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ratings.map((rating, i) => (
              <motion.div
                key={rating.id}
                className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm shadow-stone-200/50 dark:shadow-none p-4"
                initial={{ opacity: 0.5, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 text-xs font-medium">
                      {(rating.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {rating.username || t('restaurant.anonymous')}
                      </span>
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
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{rating.comment}</p>
                )}

                {/* Photo gallery */}
                {rating.photos && rating.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-3 rounded-xl overflow-hidden">
                    {rating.photos.map((photo: { id: string; photo_url: string }) => (
                      <button
                        key={photo.id}
                        onClick={() => setLightboxPhoto(getPhotoUrl(photo.photo_url))}
                        className="aspect-square overflow-hidden"
                      >
                        <img
                          src={getPhotoUrl(photo.photo_url)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              onClick={() => setLightboxPhoto(null)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <motion.img
              src={lightboxPhoto}
              alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      {dbId && (
        <QRCodeModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          restaurantId={dbId}
          restaurantName={baseRestaurant.name}
        />
      )}
    </div>
  );
}
