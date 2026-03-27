import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistance } from '../utils/geo';
import { useRestaurantStore } from '../stores/restaurantStore';
import { useShallow } from 'zustand/react/shallow';
import RestaurantCard from '../components/ui/RestaurantCard';

export default function Search() {
 const { t } = useTranslation();
 const geo = useGeolocation();
 const { lat, lng } = geo;
 const { restaurants, fetchRestaurants } = useRestaurantStore(useShallow((s) => ({ restaurants: s.restaurants, fetchRestaurants: s.fetchRestaurants })));
 const [query, setQuery] = useState('');
 const [selectedCuisine, setSelectedCuisine] = useState('All');
 const [minScore, setMinScore] = useState(0);

 useEffect(() => {
 if (!geo.loading) fetchRestaurants(lat, lng);
 }, [lat, lng, fetchRestaurants]);

 // Build cuisine list dynamically from actual restaurants
 const cuisines = useMemo(() => {
 const set = new Set(restaurants.map((r) => r.cuisine).filter((c): c is string => !!c));
 return ['All', ...Array.from(set).sort()];
 }, [restaurants]);

 const results = useMemo(() => {
 return restaurants.map((r) => ({
 ...r,
 distance: getDistance(lat, lng, r.lat, r.lng),
 }))
 .filter((r) => {
 const matchesQuery = !query || r.name.toLowerCase().includes(query.toLowerCase());
 const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
 const matchesScore = minScore === 0 || (r.clean_score !== null && r.clean_score >= minScore);
 return matchesQuery && matchesCuisine && matchesScore;
 })
 .sort((a, b) => a.distance - b.distance);
 }, [query, selectedCuisine, minScore, lat, lng, restaurants]);

 return (
 <div className="flex-1 px-4 pt-4 pb-24 max-w-lg mx-auto w-full">
 {/* Search input */}
 <div className="relative mb-4">
 <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
 </svg>
 <input
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder={t('search.placeholder')}
 className="w-full pl-11 pr-4 h-11 rounded-xl bg-stone-100 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
 />
 </div>

 {/* Cuisine chips */}
 <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-2">
 {cuisines.map((cuisine) => (
 <button
 key={cuisine}
 onClick={() => setSelectedCuisine(cuisine)}
 className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
 selectedCuisine === cuisine
 ? 'bg-stone-800 text-white'
 : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
 }`}
 >
 {cuisine === 'All' ? t('search.allCuisines') : cuisine}
 </button>
 ))}
 </div>

 {/* Min score filter */}
 <div className="flex items-center gap-3 mb-5 px-1">
 <span className="text-xs text-stone-400 shrink-0">{t('search.minScore')}:</span>
 <div className="flex gap-1.5">
 {[0, 5, 6, 7, 8].map((score) => (
 <button
 key={score}
 onClick={() => setMinScore(score)}
 className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
 minScore === score
 ? 'bg-stone-800 text-white'
 : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
 }`}
 >
 {score === 0 ? t('search.allCuisines') : `${score}+`}
 </button>
 ))}
 </div>
 </div>

 {/* Results */}
 {results.length > 0 ? (
 <div className="space-y-2">
 {results.map((r, i) => (
 <RestaurantCard key={r.id} restaurant={r} distance={r.distance} index={i} />
 ))}
 </div>
 ) : (
 <motion.div
 className="flex flex-col items-center justify-center py-20 text-center"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 >
 <h3 className="text-sm font-medium text-stone-400">{t('search.noResults')}</h3>
 <p className="text-xs text-stone-300 mt-1.5 max-w-xs">{t('search.noResultsDesc')}</p>
 </motion.div>
 )}
 </div>
 );
}
