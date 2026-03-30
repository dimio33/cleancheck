import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { APIProvider, Map, AdvancedMarker, Marker } from '@vis.gl/react-google-maps';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistance, getScoreColor } from '../utils/geo';
import { useRestaurantStore } from '../stores/restaurantStore';
import { useAuthStore } from '../stores/authStore';
import { useGamificationStore } from '../stores/gamificationStore';
import { useShallow } from 'zustand/react/shallow';
import RestaurantCard from '../components/ui/RestaurantCard';
import PullToRefresh from '../components/ui/PullToRefresh';
import StreakBadge from '../components/ui/StreakBadge';
import XpGainToast from '../components/ui/XpGainToast';
import AvatarFrame from '../components/ui/AvatarFrame';
import { RestaurantCardSkeleton } from '../components/ui/Skeleton';
import GuestRegistrationCTA from '../components/ui/GuestRegistrationCTA';
import api from '../services/api';
import { hapticLight } from '../utils/haptics';

/** Inline trending list for discovery mode (no location) */
function TrendingInline() {
 const navigate = useNavigate();
 const { t } = useTranslation();
 const [items, setItems] = useState<{ id: string; name: string; clean_score: string | null; recent_ratings: string; city: string | null }[]>([]);
 const [loaded, setLoaded] = useState(false);
 const [error, setError] = useState(false);

 useEffect(() => {
 let cancelled = false;
 api.get('/restaurants/trending')
 .then(({ data }) => { if (!cancelled) setItems(data.restaurants || []); })
 .catch(() => { if (!cancelled) setError(true); })
 .finally(() => { if (!cancelled) setLoaded(true); });
 return () => { cancelled = true; };
 }, []);

 if (!loaded) {
 return (
 <div className="flex items-center justify-center py-8">
 <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 if (error) {
 return (
 <div className="text-center py-8">
 <span className="text-3xl block mb-2">⚠️</span>
 <p className="text-sm text-stone-400">Trends konnten nicht geladen werden</p>
 </div>
 );
 }

 if (items.length === 0) {
 return (
 <div className="text-center py-8">
 <span className="text-3xl block mb-2">📊</span>
 <p className="text-sm text-stone-400">{t('trending.empty')}</p>
 </div>
 );
 }

 return (
 <div className="space-y-2">
 {items.map((r, i) => {
 const score = r.clean_score ? parseFloat(r.clean_score) : null;
 const color = getScoreColor(score);
 return (
 <motion.button
 key={r.id}
 className="flex items-center gap-3 p-3.5 bg-white rounded-2xl shadow-sm w-full text-left active:scale-[0.98] transition-transform"
 onClick={() => navigate(`/restaurant/${r.id}`)}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 >
 <div
 className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm"
 style={{ backgroundColor: `${color}15`, color }}
 >
 {score !== null ? score.toFixed(1) : '\u2014'}
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-stone-800 block truncate">{r.name}</span>
 <span className="text-xs text-stone-400">{r.city || ''} · {r.recent_ratings} {t('trending.recentRatings', { count: Number(r.recent_ratings) })}</span>
 </div>
 </motion.button>
 );
 })}
 </div>
 );
}

const DEFAULT_MAP_ZOOM = 14;

/** Time-based greeting key */
function getGreetingKey(): string {
 const h = new Date().getHours();
 if (h < 12) return 'home.greetingMorning';
 if (h < 18) return 'home.greetingAfternoon';
 return 'home.greetingEvening';
}

export default function Home() {
 const geo = useGeolocation();
 const { lat, lng } = geo;
 const { t } = useTranslation();
 const navigate = useNavigate();
 const user = useAuthStore((s) => s.user);
 const [sortBy, setSortBy] = useState<'distance' | 'score'>('distance');
 const [visibleCount, setVisibleCount] = useState(20);
 const { restaurants, loading, error: storeError, fetchRestaurants } = useRestaurantStore(useShallow((s) => ({ restaurants: s.restaurants, loading: s.loading, error: s.error, fetchRestaurants: s.fetchRestaurants })));
 const [citySearch, setCitySearch] = useState('');
 const [cityResults, setCityResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
 const [searchOverride, setSearchOverride] = useState<{ lat: number; lng: number } | null>(null);
 const [nameFilter, setNameFilter] = useState('');
 const [cuisineFilter, setCuisineFilter] = useState('All');
 const [showMap, setShowMap] = useState(true);
 const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const searchIdRef = useRef(0);

 const { streak, xpGains, activeFrame, fetchGamification, recordDailyLogin, clearXpGains } = useGamificationStore(useShallow((s) => ({ streak: s.streak, xpGains: s.xpGains, activeFrame: s.activeFrame, fetchGamification: s.fetchGamification, recordDailyLogin: s.recordDailyLogin, clearXpGains: s.clearXpGains })));

 // Fetch gamification data and record daily login on mount
 useEffect(() => {
 if (user && user.id !== 'guest') {
 fetchGamification(user.id);
 recordDailyLogin(user.id);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [user?.id]);

 const searchCity = useCallback((q: string) => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 setCitySearch(q);
 if (q.length < 2) { setCityResults([]); return; }
 const id = ++searchIdRef.current;
 debounceRef.current = setTimeout(() => {
 fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0&countrycodes=de,at,ch`)
 .then(r => r.json())
 .then(data => { if (searchIdRef.current === id) setCityResults(data || []); })
 .catch(() => { if (searchIdRef.current === id) setCityResults([]); });
 }, 300);
 }, []);

 const selectCity = (result: { lat: string; lon: string; display_name: string }) => {
 const newLat = parseFloat(result.lat);
 const newLng = parseFloat(result.lon);
 setSearchOverride({ lat: newLat, lng: newLng });
 setMapCenter({ lat: newLat, lng: newLng });
 setCitySearch(result.display_name.split(',')[0]);
 setCityResults([]);
 useRestaurantStore.setState({ lastFetchLocation: null });
 };

 const resetToGps = () => {
 setSearchOverride(null);
 setMapCenter(lat && lng ? { lat, lng } : null);
 setCitySearch('');
 useRestaurantStore.setState({ lastFetchLocation: null });
 };

 const effectiveLat = searchOverride?.lat ?? lat;
 const effectiveLng = searchOverride?.lng ?? lng;

 // No location = no map, show discovery mode instead
 const hasLocation = geo.permissionState === 'granted' || searchOverride !== null;

 useEffect(() => {
 const hasRealCoords = searchOverride || !geo.loading;
 if (hasLocation && hasRealCoords) {
 fetchRestaurants(effectiveLat, effectiveLng);
 }
 }, [effectiveLat, effectiveLng, geo.loading, hasLocation, searchOverride, fetchRestaurants]);

 const cuisines = useMemo(() => {
 const set = new Set(restaurants.map((r) => r.cuisine).filter((c): c is string => !!c));
 return ['All', ...Array.from(set).sort()];
 }, [restaurants]);

 const restaurantsWithDistance = useMemo(() => {
 const withDist = restaurants
 .map((r) => ({
 ...r,
 distance: getDistance(effectiveLat, effectiveLng, r.lat, r.lng),
 }))
 .filter((r) => {
 if (nameFilter && !r.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
 if (cuisineFilter !== 'All' && r.cuisine !== cuisineFilter) return false;
 return true;
 });

 if (sortBy === 'score') {
 return withDist.sort((a, b) => {
   const scoreA = a.clean_score ?? -1;
   const scoreB = b.clean_score ?? -1;
   if (scoreB !== scoreA) return scoreB - scoreA;
   return a.distance - b.distance; // Same score → sort by distance
 });
 }
 return withDist.sort((a, b) => a.distance - b.distance);
 }, [effectiveLat, effectiveLng, restaurants, sortBy, nameFilter, cuisineFilter]);

 const mapZoom = DEFAULT_MAP_ZOOM;

 const handleRefresh = useCallback(async () => {
   useRestaurantStore.getState().invalidate();
   await fetchRestaurants(effectiveLat, effectiveLng);
 }, [fetchRestaurants, effectiveLat, effectiveLng]);

 // User initial for avatar
 const userInitial = user?.username?.charAt(0)?.toUpperCase() || 'G';

 // ── Discovery Mode (no location) ──
 if (!hasLocation) {
 return (
 <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
 {/* Personalized Header */}
 <div className="px-5 pt-5 pb-2">
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-[12px] text-stone-400 font-medium">{t('home.searchCity')}</p>
 <h1 className="text-[20px] font-bold text-stone-900 tracking-[-0.5px]">
 {t(getGreetingKey())} 👋
 </h1>
 </div>
 <div className="flex items-center gap-2">
 {user?.id !== 'guest' && <StreakBadge streak={streak} />}
 <button onClick={() => navigate('/profile')} className="active:scale-95 transition-transform">
 <AvatarFrame frame={activeFrame} size="sm">
 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-sm">
 <span className="text-[14px] font-bold text-white">{userInitial}</span>
 </div>
 </AvatarFrame>
 </button>
 </div>
 </div>
 </div>

 {/* XP Gain Toast or Guest CTA */}
 {user?.id === 'guest' ? (
 <div className="px-5 pb-2">
 <GuestRegistrationCTA variant="inline" />
 </div>
 ) : (
 <XpGainToast gains={xpGains} onDone={clearXpGains} />
 )}

 {/* City Search */}
 <div className="px-5 pb-3">
 <div className="relative">
 <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
 </svg>
 <input
 type="text"
 value={citySearch}
 onChange={(e) => searchCity(e.target.value)}
 placeholder={t('home.searchCity')}
 className="w-full pl-10 pr-4 h-11 rounded-xl bg-stone-100 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 border-0"
 />
 </div>
 {cityResults.length > 0 && (
 <div className="mt-1 bg-white rounded-xl shadow-lg border border-stone-200/50 overflow-hidden">
 {cityResults.map((r, i) => (
 <button
 key={i}
 onClick={() => selectCity(r)}
 className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0 truncate"
 >
 {r.display_name}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Enable location hint */}
 <motion.div
 className="mx-5 mb-4 p-4 bg-teal-50 rounded-2xl flex items-center gap-3"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
 <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-teal-800">{t('home.enableLocationHint')}</p>
 <p className="text-xs text-teal-600 mt-0.5">{t('home.enableLocationHintDesc')}</p>
 </div>
 </motion.div>

 {/* Trending section */}
 <div className="px-5">
 <h2 className="text-[11px] uppercase tracking-[1.5px] text-stone-400 font-medium mb-3">{t('trending.title')}</h2>
 <TrendingInline />
 </div>
 </div>
 );
 }

 // ── Content-first Mode (has location) ──
 return (
 <PullToRefresh onRefresh={handleRefresh}>
 <div className="pb-24 max-w-lg mx-auto w-full">
 {/* Personalized Header */}
 <div className="px-5 pt-5 pb-1">
 <div className="flex items-center justify-between mb-3">
 <div>
 <p className="text-[12px] text-stone-400 font-medium">
 {searchOverride ? citySearch || t('home.searchCity') : t('home.myLocation')}
 </p>
 <h1 className="text-[20px] font-bold text-stone-900 tracking-[-0.5px]">
 {t(getGreetingKey())} 👋
 </h1>
 </div>
 <div className="flex items-center gap-2">
 {user?.id !== 'guest' && <StreakBadge streak={streak} />}
 <button onClick={() => navigate('/profile')} className="active:scale-95 transition-transform">
 <AvatarFrame frame={activeFrame} size="sm">
 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-sm">
 <span className="text-[14px] font-bold text-white">{userInitial}</span>
 </div>
 </AvatarFrame>
 </button>
 </div>
 </div>
 </div>

 {/* Guest CTA in content mode */}
 {user?.id === 'guest' && (
 <div className="px-5 pb-2">
 <GuestRegistrationCTA variant="inline" />
 </div>
 )}

 {/* Search bar */}
 <div className="px-5 pb-3 relative">
 <div className="relative">
 <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
 </svg>
 <input
 type="text"
 value={citySearch}
 onChange={(e) => searchCity(e.target.value)}
 placeholder={t('home.searchCity')}
 className="w-full pl-10 pr-10 h-11 rounded-xl bg-stone-100 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 border-0"
 />
 {searchOverride && (
 <button
 onClick={resetToGps}
 className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white"
 title={t('home.myLocation')}
 >
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 </button>
 )}
 </div>
 {cityResults.length > 0 && (
 <div className="absolute left-5 right-5 mt-1 bg-white rounded-xl shadow-lg border border-stone-200/50 overflow-hidden z-30">
 {cityResults.map((r, i) => (
 <button
 key={i}
 onClick={() => selectCity(r)}
 className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0 truncate"
 >
 {r.display_name}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Quick Action Chips */}
 <div className="flex gap-2 px-5 mb-4">
 <button
 onClick={() => navigate('/trending')}
 className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
 >
 <div className="w-9 h-9 rounded-[10px] bg-emerald-50 flex items-center justify-center mx-auto mb-1.5">
 <svg className="w-[18px] h-[18px] text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
 </svg>
 </div>
 <span className="text-[11px] font-semibold text-stone-900">{t('home.topRated')}</span>
 </button>

 <button
 onClick={() => navigate('/rate')}
 className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
 >
 <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center mx-auto mb-1.5">
 <svg className="w-[18px] h-[18px] text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
 </svg>
 </div>
 <span className="text-[11px] font-semibold text-stone-900">{t('home.rateAction')}</span>
 </button>

 <button
 onClick={() => setShowMap(!showMap)}
 className={`flex-1 rounded-xl p-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${showMap ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-white'}`}
 >
 <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-1.5 ${showMap ? 'bg-teal-100' : 'bg-sky-50'}`}>
 <svg className={`w-[18px] h-[18px] ${showMap ? 'text-teal-600' : 'text-sky-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
 </svg>
 </div>
 <span className="text-[11px] font-semibold text-stone-900">{t('home.mapAction')}</span>
 </button>

 <button
 onClick={() => navigate('/leaderboard')}
 className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
 >
 <div className="w-9 h-9 rounded-[10px] bg-purple-50 flex items-center justify-center mx-auto mb-1.5">
 <svg className="w-[18px] h-[18px] text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.624a48.374 48.374 0 00-6-1.5m12.915 2.52a48.374 48.374 0 00-6-1.5m.915 4.98a6.023 6.023 0 01-2.77-.896" />
 </svg>
 </div>
 <span className="text-[11px] font-semibold text-stone-900">{t('gamification.leaderboard')}</span>
 </button>
 </div>

 {/* Map (toggled by Karte quick action) */}
 {showMap && (
 <div className="mx-5 mb-4 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ height: 300 }}>
 <APIProvider apiKey={import.meta.env.VITE_GOOGLE_PLACES_KEY || ''}>
 <Map
 center={mapCenter || { lat: effectiveLat, lng: effectiveLng }}
 defaultZoom={mapZoom}
 onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
 mapId={!Capacitor.isNativePlatform() ? (import.meta.env.VITE_GOOGLE_MAPS_ID || undefined) : undefined}
 gestureHandling="greedy"
 disableDefaultUI={false}
 zoomControl={true}
 mapTypeControl={false}
 streetViewControl={false}
 fullscreenControl={false}
 style={{ width: '100%', height: '100%' }}
 >
 {Capacitor.isNativePlatform() ? (
   <>
     {restaurantsWithDistance.slice(0, 20).map((r) => {
       const markerColor = r.clean_score !== null
         ? (r.clean_score >= 7 ? '#10B981' : r.clean_score >= 4 ? '#F59E0B' : '#EF4444')
         : '#9CA3AF';
       return (
         <Marker
           key={r.id}
           position={{ lat: r.lat, lng: r.lng }}
           onClick={() => navigate(`/restaurant/${r.id}`)}
           icon={{
             path: 0,
             scale: 14,
             fillColor: markerColor,
             fillOpacity: 1,
             strokeColor: 'white',
             strokeWeight: 2.5,
           }}
           label={{
             text: r.clean_score !== null ? r.clean_score.toFixed(1) : '?',
             fontSize: '10px',
             fontWeight: '700',
             color: 'white',
           }}
         />
       );
     })}
     <Marker
       position={{ lat: effectiveLat, lng: effectiveLng }}
       icon={{
         path: 0,
         scale: 8,
         fillColor: '#0D9488',
         fillOpacity: 1,
         strokeColor: 'white',
         strokeWeight: 3,
       }}
     />
   </>
 ) : (
   <>
     {restaurantsWithDistance.slice(0, 20).map((r) => (
       <AdvancedMarker
         key={r.id}
         position={{ lat: r.lat, lng: r.lng }}
         onClick={() => navigate(`/restaurant/${r.id}`)}
       >
         <div style={{
           width: 36, height: 36, borderRadius: '50%',
           background: r.clean_score !== null
             ? (r.clean_score >= 7 ? '#10B981' : r.clean_score >= 4 ? '#F59E0B' : '#EF4444')
             : '#E7E5E4',
           border: '3px solid white',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: 11, fontWeight: 700,
           color: r.clean_score !== null ? 'white' : '#A8A29E',
           boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
           cursor: 'pointer',
           fontFamily: "'Inter', system-ui, sans-serif",
         }}>
           {r.clean_score !== null ? r.clean_score.toFixed(1) : '?'}
         </div>
       </AdvancedMarker>
     ))}
     <AdvancedMarker position={{ lat: effectiveLat, lng: effectiveLng }}>
       <div style={{
         width: 16, height: 16, borderRadius: '50%',
         background: '#0D9488', border: '3px solid white',
         boxShadow: '0 0 0 6px rgba(13,148,136,0.2), 0 2px 4px rgba(0,0,0,0.15)',
       }} />
     </AdvancedMarker>
   </>
 )}
 </Map>
 </APIProvider>
 </div>
 )}

 {/* Sort toggle + filter chips */}
 <div className="px-5 pb-2">
 {/* Sort toggle */}
 <div className="flex items-center gap-2 mb-2">
 <span className="text-[10px] uppercase tracking-widest text-stone-400">{t('home.sortBy')}:</span>
 <button
 onClick={() => { hapticLight(); setSortBy('distance'); }}
 className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
 sortBy === 'distance' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'
 }`}
 >
 {t('search.distance')}
 </button>
 <button
 onClick={() => { hapticLight(); setSortBy('score'); }}
 className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
 sortBy === 'score' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'
 }`}
 >
 {t('home.sortScore')}
 </button>
 </div>

 {/* Restaurant name search */}
 <div className="relative mb-2">
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
 </svg>
 <input
 type="text"
 value={nameFilter}
 onChange={(e) => setNameFilter(e.target.value)}
 placeholder={t('search.placeholder')}
 className="w-full pl-8 pr-4 h-9 rounded-lg bg-stone-50 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
 />
 </div>

 {/* Cuisine chips */}
 <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
 {cuisines.map((cuisine) => (
 <button
 key={cuisine}
 onClick={() => { hapticLight(); setCuisineFilter(cuisine); }}
 className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
 cuisineFilter === cuisine
 ? 'bg-stone-800 text-white'
 : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
 }`}
 >
 {cuisine === 'All' ? t('search.allCuisines') : cuisine}
 </button>
 ))}
 </div>
 </div>

 {/* Section heading with location info */}
 <div className="px-5 pb-2 pt-1">
 {searchOverride && (
   <div className="flex items-center justify-between mb-2 px-3 py-2 bg-teal-50 rounded-xl">
     <div className="flex items-center gap-2">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
       <span className="text-[13px] font-medium text-teal-700">{citySearch || 'Gesuchter Ort'}</span>
     </div>
     <button onClick={resetToGps} className="text-[12px] font-medium text-teal-600 flex items-center gap-1">
       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/></svg>
       Mein Standort
     </button>
   </div>
 )}
 <p className="text-[11px] uppercase tracking-[1.5px] text-stone-400 font-medium mb-1">
 {t('home.nearby')}
 </p>
 <h2 className="text-[16px] font-bold text-stone-900 tracking-[-0.3px]">
 {t('home.nearby')} ({restaurantsWithDistance.length})
 </h2>
 </div>

 {/* Restaurant card list */}
 <div className="px-5 pb-24">
 {(loading || geo.loading) && restaurantsWithDistance.length === 0 ? (
 <div className="py-4">
 <RestaurantCardSkeleton count={5} />
 </div>
 ) : storeError === 'fetch_error' && restaurantsWithDistance.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <span className="text-3xl mb-3">⚠️</span>
 <p className="text-sm text-stone-500 font-medium">Server nicht erreichbar</p>
 <p className="text-xs text-stone-400 mt-1 max-w-xs">Die Restaurant-Daten konnten nicht geladen werden. Bitte versuche es gleich nochmal.</p>
 <button onClick={() => { useRestaurantStore.getState().invalidate(); fetchRestaurants(effectiveLat, effectiveLng); }} className="mt-4 px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl active:scale-[0.98] transition-transform">
   Nochmal versuchen
 </button>
 </div>
 ) : restaurantsWithDistance.length === 0 && !loading ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <span className="text-3xl mb-3">🍽️</span>
 <p className="text-sm text-stone-400">{t('search.noResults')}</p>
 <p className="text-xs text-stone-300 mt-1">{t('search.noResultsDesc')}</p>
 </div>
 ) : (
 <div className="space-y-2">
 {restaurantsWithDistance.slice(0, visibleCount).map((r, i) => (
 <RestaurantCard key={r.id} restaurant={r} distance={r.distance} index={i} />
 ))}
 {restaurantsWithDistance.length > visibleCount && (
 <button
 onClick={() => setVisibleCount((c) => c + 20)}
 className="w-full py-3 text-sm font-medium text-teal-600 active:text-teal-700 transition-colors"
 >
 {t('common.loadMore')} ({restaurantsWithDistance.length - visibleCount} {t('common.remaining')})
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 </PullToRefresh>
 );
}
