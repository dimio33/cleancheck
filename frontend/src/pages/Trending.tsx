import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getScoreColor } from '../utils/geo';
import api from '../services/api';

interface TrendingRestaurant {
 id: string;
 name: string;
 city: string | null;
 clean_score: string | null;
 recent_ratings: string;
 recent_avg_score: string | null;
}

export default function Trending() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const [restaurants, setRestaurants] = useState<TrendingRestaurant[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api.get('/restaurants/trending')
 .then(({ data }) => setRestaurants(data.restaurants || []))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 return (
 <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
 <div className="px-4 pt-6 pb-2">
 <h1 className="text-xl font-bold tracking-tight text-stone-900">{t('trending.title')}</h1>
 <p className="text-sm text-stone-500 mt-1">{t('trending.desc')}</p>
 </div>

 <div className="px-4">
 {loading ? (
 <div className="flex items-center justify-center py-16">
 <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
 </div>
 ) : restaurants.length === 0 ? (
 <div className="text-center py-16">
 <span className="text-4xl block mb-3">📊</span>
 <p className="text-sm text-stone-400 mb-4">{t('trending.empty')}</p>
 <button
 onClick={() => navigate('/rate')}
 className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium active:scale-95 transition-transform"
 >
 {t('restaurant.rateThis')}
 </button>
 </div>
 ) : (
 <div className="space-y-2.5">
 {restaurants.map((r, i) => {
 const score = r.clean_score ? parseFloat(r.clean_score) : null;
 const color = getScoreColor(score);
 return (
 <motion.button
 key={r.id}
 className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm shadow-stone-200/50 w-full text-left active:scale-[0.98] transition-transform"
 onClick={() => navigate(`/restaurant/${r.id}`)}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 >
 <div
 className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 font-semibold text-sm"
 style={{ backgroundColor: `${color}15`, color }}
 >
 {score !== null ? score.toFixed(1) : '—'}
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-stone-800 block truncate">{r.name}</span>
 <span className="text-xs text-stone-400">
 {r.city || ''} · {r.recent_ratings} {t('trending.recentRatings')}
 </span>
 </div>
 <div className="flex items-center gap-1 text-teal-500">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5-5v3h7v4h-7v3l-5-5z" />
 </svg>
 </div>
 </motion.button>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
