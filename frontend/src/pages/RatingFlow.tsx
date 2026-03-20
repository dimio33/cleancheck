import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import CriteriaSlider from '../components/ui/CriteriaSlider';
import ScoreGauge from '../components/ui/ScoreGauge';
import { useGeolocation, getHighAccuracyPosition } from '../hooks/useGeolocation';
import { MOCK_RESTAURANTS, getDistance, formatDistance } from '../data/mockData';
import type { Restaurant, CriteriaScores } from '../types';

// Geo-verification constants
const GEO_MAX_DISTANCE_METERS = 200;
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const CRITERIA = [
  { key: 'cleanliness' as const, icon: '🧹' },
  { key: 'smell' as const, icon: '👃' },
  { key: 'supplies' as const, icon: '🧻' },
  { key: 'maintenance' as const, icon: '🔧' },
  { key: 'accessibility' as const, icon: '♿' },
];

export default function RatingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { lat, lng } = useGeolocation();

  const preselectedId = (location.state as { restaurantId?: string } | null)?.restaurantId;
  const preselected = preselectedId ? MOCK_RESTAURANTS.find((r) => r.id === preselectedId) : undefined;

  const [step, setStep] = useState(preselected ? 2 : 1);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(preselected || null);
  const [scores, setScores] = useState<CriteriaScores>({
    cleanliness: 3,
    smell: 3,
    supplies: 3,
    maintenance: 3,
    accessibility: 3,
  });
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Geo-verification state
  const [geoChecking, setGeoChecking] = useState(false);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);

  const overallScore = useMemo(() => {
    const vals = Object.values(scores);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return (avg / 5) * 10;
  }, [scores]);

  const nearbyRestaurants = useMemo(() => {
    return MOCK_RESTAURANTS.map((r) => ({
      ...r,
      distance: getDistance(lat, lng, r.lat, r.lng),
    }))
      .filter((r) => {
        if (!searchQuery) return true;
        return r.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, searchQuery ? 10 : 3);
  }, [lat, lng, searchQuery]);

  const updateScore = useCallback((key: keyof CriteriaScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Verify user is close enough to the restaurant.
   * In demo mode, always passes.
   */
  const verifyGeoLocation = async (restaurant: Restaurant): Promise<boolean> => {
    if (IS_DEMO_MODE) {
      setGeoBlocked(false);
      setGeoDistance(0);
      return true;
    }

    setGeoChecking(true);
    setGeoBlocked(false);
    setGeoDistance(null);

    try {
      const pos = await getHighAccuracyPosition();
      const dist = getDistance(pos.lat, pos.lng, restaurant.lat, restaurant.lng);
      setGeoDistance(Math.round(dist));

      if (dist > GEO_MAX_DISTANCE_METERS) {
        setGeoBlocked(true);
        setGeoChecking(false);
        return false;
      }

      setGeoChecking(false);
      return true;
    } catch {
      // If geolocation fails, use the cached position from the hook
      const dist = getDistance(lat, lng, restaurant.lat, restaurant.lng);
      setGeoDistance(Math.round(dist));

      if (dist > GEO_MAX_DISTANCE_METERS) {
        setGeoBlocked(true);
        setGeoChecking(false);
        return false;
      }

      setGeoChecking(false);
      return true;
    }
  };

  const handleRefreshLocation = async () => {
    if (!selectedRestaurant) return;
    await verifyGeoLocation(selectedRestaurant);
  };

  const handleSelectRestaurant = async (r: Restaurant) => {
    setSelectedRestaurant(r);
    const allowed = await verifyGeoLocation(r);
    if (allowed) {
      setStep(2);
    }
    // If not allowed, geoBlocked state is set and we stay on step 1 showing the blocker
  };

  const handleSubmit = () => {
    // Mock submit - in real app, would call API with geo headers
    console.log('Rating submitted:', {
      restaurant: selectedRestaurant?.id,
      scores,
      overall: overallScore,
      comment,
    });
    setStep(4);
  };

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-0.5 rounded-full flex-1 transition-all duration-300 ${
                s <= step ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Restaurant Selection */}
        {step === 1 && (
          <motion.div
            key="step1"
            className="px-4 pt-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-stone-900">{t('rating.step1Title')}</h2>
            <p className="text-sm text-stone-500 mt-1 mb-4">{t('rating.step1Desc')}</p>

            {/* Geo-checking indicator */}
            {geoChecking && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-xl mb-4">
                <svg className="w-4 h-4 text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-teal-700">{t('geo.checking')}</span>
              </div>
            )}

            {/* Geo-blocked message */}
            {geoBlocked && !geoChecking && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-rose-700">{t('geo.tooFar')}</h3>
                </div>
                <p className="text-xs text-rose-600 mb-3">{t('geo.tooFarDesc')}</p>

                {geoDistance !== null && (
                  <div className="flex gap-4 mb-3">
                    <div className="text-xs text-rose-600">
                      <span className="font-medium">{t('geo.currentDistance')}:</span> {geoDistance}m
                    </div>
                    <div className="text-xs text-rose-600">
                      <span className="font-medium">{t('geo.maxDistance')}:</span> {GEO_MAX_DISTANCE_METERS}m
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRefreshLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-rose-200 text-xs font-medium text-rose-600 active:scale-[0.97] transition-transform"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  {t('geo.updateLocation')}
                </button>
              </motion.div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('rating.searchRestaurant')}
                className="w-full pl-11 pr-4 h-11 rounded-xl bg-stone-50 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>

            <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">
              {searchQuery ? t('search.placeholder') : t('rating.nearYou')}
            </p>

            <div className="space-y-2">
              {nearbyRestaurants.map((r) => (
                <motion.button
                  key={r.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm shadow-stone-200/50 w-full text-left active:ring-2 active:ring-teal-500 transition-all"
                  onClick={() => handleSelectRestaurant(r)}
                  whileTap={{ scale: 0.98 }}
                  disabled={geoChecking}
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-base">
                    🏪
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stone-800 block truncate">{r.name}</span>
                    <span className="text-xs text-stone-400">
                      {r.cuisine && `${r.cuisine} · `}{formatDistance(r.distance)}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Rate Criteria */}
        {step === 2 && (
          <motion.div
            key="step2"
            className="px-4 pt-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            {selectedRestaurant && (
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-stone-100 rounded-full">
                <span className="text-sm">🏪</span>
                <span className="text-xs font-medium text-stone-600">{selectedRestaurant.name}</span>
              </div>
            )}

            <h2 className="text-xl font-semibold text-stone-900">{t('rating.step2Title')}</h2>
            <p className="text-sm text-stone-500 mt-1 mb-2">{t('rating.step2Desc')}</p>

            <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4 mb-4">
              {CRITERIA.map((c) => (
                <CriteriaSlider
                  key={c.key}
                  icon={c.icon}
                  label={t(`restaurant.criteria.${c.key}`)}
                  value={scores[c.key]}
                  onChange={(v) => updateScore(c.key, v)}
                />
              ))}
            </div>

            {/* Overall score preview */}
            <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-2xl shadow-sm shadow-stone-200/50 mb-6">
              <ScoreGauge score={overallScore} size={80} strokeWidth={6} />
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400 font-medium">{t('rating.overall')}</p>
                <p className="text-2xl font-light text-stone-800">{overallScore.toFixed(1)}</p>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
            >
              {t('splash.next')}
            </button>
          </motion.div>
        )}

        {/* Step 3: Photo + Comment */}
        {step === 3 && (
          <motion.div
            key="step3"
            className="px-4 pt-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-stone-900">{t('rating.step3Title')}</h2>
            <p className="text-sm text-stone-500 mt-1 mb-6">{t('rating.step3Desc')}</p>

            {/* Photo upload */}
            <label className="flex flex-col items-center justify-center w-full py-8 bg-white rounded-xl border border-dashed border-stone-200 cursor-pointer hover:border-teal-400 transition-colors mb-4">
              <svg className="w-8 h-8 text-stone-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-sm text-stone-400">{t('rating.addPhoto')}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
              />
            </label>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('rating.addComment')}
              className="w-full h-28 p-3 bg-stone-50 rounded-xl border-0 text-sm text-stone-900 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 mb-6 transition-all"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 py-3.5 text-stone-400 text-sm font-medium active:scale-[0.98] transition-transform"
              >
                {t('rating.skip')}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
              >
                {t('rating.submit')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <motion.div
            key="step4"
            className="px-4 pt-16 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Animated checkmark */}
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, damping: 12 }}
            >
              <motion.svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>

            <motion.h2
              className="text-lg font-medium text-stone-800 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {t('rating.thankYou')}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <p className="text-sm text-stone-500 mb-4">{t('rating.yourScore')}</p>
              <div className="flex justify-center">
                <ScoreGauge score={overallScore} size={160} strokeWidth={12} />
              </div>
            </motion.div>

            {/* Confetti-like dots */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: ['#14B8A6', '#10B981', '#F59E0B', '#3B82F6'][i % 4],
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 30}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -50 - Math.random() * 100],
                }}
                transition={{ delay: 0.3 + i * 0.05, duration: 1.5 }}
              />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform"
              >
                {t('rating.done')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
