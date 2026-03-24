import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
// Note: useMemo still used for restaurantsWithDistance
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistance, getScoreColor, getScoreLabel } from '../utils/geo';
import { useRestaurantStore } from '../stores/restaurantStore';
import RestaurantCard from '../components/ui/RestaurantCard';
import { RestaurantCardSkeleton } from '../components/ui/Skeleton';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';

/** Inline trending list for discovery mode (no location) */
function TrendingInline() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<{ id: string; name: string; clean_score: string | null; recent_ratings: string; city: string | null }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/restaurants/trending')
      .then(({ data }) => { if (!cancelled) setItems(data.restaurants || []); })
      .catch(() => {})
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
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-stone-900 rounded-2xl shadow-sm w-full text-left active:scale-[0.98] transition-transform"
            onClick={() => navigate(`/restaurant/${r.id}`)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {score !== null ? score.toFixed(1) : '—'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200 block truncate">{r.name}</span>
              <span className="text-xs text-stone-400">{r.city || ''} · {r.recent_ratings} {t('trending.recentRatings')}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Icon cache — avoids recreating DivIcon objects on every render
const iconCache = new Map<string, L.DivIcon>();

function createScoreIcon(score: number | null) {
  const key = score !== null ? score.toFixed(1) : 'null';
  const cached = iconCache.get(key);
  if (cached) return cached;

  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: white; border: 3px solid ${color};
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 11px; color: ${color};
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      font-family: 'Inter', system-ui, sans-serif;
    ">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  iconCache.set(key, icon);
  return icon;
}

// Values in meters — divided by 1000 before API call (backend expects km)
const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

function zoomForRadius(r: number): number {
  if (r <= 1000) return 15;
  if (r <= 2000) return 14;
  if (r <= 5000) return 13;
  if (r <= 10000) return 12;
  return 11;
}

// Marker cluster component using leaflet.markercluster directly
function MarkerClusterGroup({ restaurants, navigate }: { restaurants: { id: string; name: string; lat: number; lng: number; clean_score: number | null }[]; navigate: (path: string) => void }) {
  const map = useMap();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 42 : 48;
        return L.divIcon({
          className: 'custom-cluster',
          html: `<div style="
            width: ${size}px; height: ${size}px; border-radius: 50%;
            background: linear-gradient(135deg, #14B8A6, #10B981);
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: ${size < 42 ? 12 : 14}px; color: white;
            box-shadow: 0 2px 8px rgba(20,184,166,0.3);
            font-family: 'Inter', system-ui, sans-serif;
          ">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    for (const r of restaurants) {
      const marker = L.marker([r.lat, r.lng], { icon: createScoreIcon(r.clean_score) });
      marker.bindPopup(`<div style="text-align:center;padding:2px"><strong style="font-size:13px">${r.name.replace(/</g, '&lt;')}</strong></div>`);
      marker.on('click', () => navigateRef.current(`/restaurant/${r.id}`));
      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);
    return () => {
      clusterGroup.clearLayers();
      map.removeLayer(clusterGroup);
    };
  }, [restaurants, map]);

  return null;
}

function MapStateTracker() {
  const map = useMap();
  const { setMapView } = useRestaurantStore();
  useEffect(() => {
    const handler = () => {
      const c = map.getCenter();
      setMapView(c.lat, c.lng, map.getZoom());
    };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, setMapView]);
  return null;
}

function UserLocationMarker({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  const { mapCenter, mapZoom } = useRestaurantStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    // On first mount, restore saved position if available
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (mapCenter && mapZoom) {
        map.setView([mapCenter.lat, mapCenter.lng], mapZoom);
        return;
      }
    }
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);

  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 50%;
      background: #14b8a6; border: 3px solid white;
      box-shadow: 0 0 0 6px rgba(20,184,166,0.2), 0 1px 4px rgba(0,0,0,0.15);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return <Marker position={[lat, lng]} icon={userIcon} />;
}

const SNAP_POINTS = [0.3, 0.55, 0.85];

export default function Home() {
  const geo = useGeolocation();
  const { lat, lng } = geo;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sheetHeight, setSheetHeight] = useState(0.55);
  const [sortBy, setSortBy] = useState<'distance' | 'score'>('distance');
  const [visibleCount, setVisibleCount] = useState(20);
  const { restaurants, loading, fetchRestaurants, radius, setRadius } = useRestaurantStore();
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searchOverride, setSearchOverride] = useState<{ lat: number; lng: number } | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

  const searchCity = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCitySearch(q);
    if (q.length < 2) { setCityResults([]); return; }
    const id = ++searchIdRef.current;
    debounceRef.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0`)
        .then(r => r.json())
        .then(data => { if (searchIdRef.current === id) setCityResults(data || []); })
        .catch(() => { if (searchIdRef.current === id) setCityResults([]); });
    }, 300);
  }, []);

  const selectCity = (result: { lat: string; lon: string }) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    setSearchOverride({ lat: newLat, lng: newLng });
    setCitySearch('');
    setCityResults([]);
    // Force refetch with new location
    useRestaurantStore.setState({ lastFetchLocation: null });
  };

  const resetToGps = () => {
    setSearchOverride(null);
    useRestaurantStore.setState({ lastFetchLocation: null });
  };

  const effectiveLat = searchOverride?.lat ?? lat;
  const effectiveLng = searchOverride?.lng ?? lng;

  // No location = no map, show discovery mode instead
  const hasLocation = geo.permissionState === 'granted' || searchOverride !== null;

  useEffect(() => {
    // Don't fetch with default coordinates — wait for real GPS or city search
    const hasRealCoords = searchOverride || !geo.loading;
    if (hasLocation && hasRealCoords) {
      fetchRestaurants(effectiveLat, effectiveLng);
    }
  }, [effectiveLat, effectiveLng, radius, geo.loading, hasLocation, searchOverride, fetchRestaurants]);

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
        if (r.distance > radius) return false;
        if (nameFilter && !r.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
        if (cuisineFilter !== 'All' && r.cuisine !== cuisineFilter) return false;
        return true;
      });

    if (sortBy === 'score') {
      return withDist.sort((a, b) => (b.clean_score ?? -1) - (a.clean_score ?? -1));
    }
    return withDist.sort((a, b) => a.distance - b.distance);
  }, [effectiveLat, effectiveLng, restaurants, sortBy, radius, nameFilter, cuisineFilter]);

  const mapZoom = zoomForRadius(radius);

  // ── Discovery Mode (no location) ──
  if (!hasLocation) {
    return (
      <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
        {/* City Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={citySearch}
              onChange={(e) => searchCity(e.target.value)}
              placeholder={t('home.searchCity')}
              className="w-full pl-9 pr-4 h-11 rounded-xl bg-white dark:bg-stone-900 shadow-sm text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 border border-stone-200/50 dark:border-stone-700"
            />
          </div>
          {cityResults.length > 0 && (
            <div className="mt-1 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200/50 dark:border-stone-700 overflow-hidden">
              {cityResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectCity(r)}
                  className="w-full text-left px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 border-b border-stone-100 dark:border-stone-800 last:border-0 truncate"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Enable location hint */}
        <motion.div
          className="mx-4 mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800 dark:text-teal-200">{t('home.enableLocationHint')}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{t('home.enableLocationHintDesc')}</p>
          </div>
        </motion.div>

        {/* Trending section */}
        <div className="px-4">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('trending.title')}</h2>
          <TrendingInline />
        </div>
      </div>
    );
  }

  // ── Map Mode (has location) ──
  return (
    <div className="flex-1 relative" style={{ marginBottom: '-64px' }}>
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer
          center={[lat, lng]}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapStateTracker />
          <UserLocationMarker lat={effectiveLat} lng={effectiveLng} zoom={mapZoom} />
          <Circle
            center={[effectiveLat, effectiveLng]}
            radius={radius}
            pathOptions={{
              color: '#0d9488',
              weight: 2.5,
              fillColor: '#14b8a6',
              fillOpacity: 0.1,
              dashArray: '10 6',
            }}
          />
          <MarkerClusterGroup restaurants={restaurantsWithDistance} navigate={navigate} />
        </MapContainer>
      </div>

      {/* City Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 max-w-lg mx-auto">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={citySearch}
            onChange={(e) => searchCity(e.target.value)}
            placeholder={t('home.searchCity')}
            className="w-full pl-9 pr-10 h-10 rounded-xl bg-white dark:bg-stone-900 shadow-md text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 border border-stone-200/50 dark:border-stone-700"
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
          <div className="mt-1 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200/50 dark:border-stone-700 overflow-hidden">
            {cityResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectCity(r)}
                className="w-full text-left px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 border-b border-stone-100 dark:border-stone-800 last:border-0 truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet - Restaurant List */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-stone-900 rounded-t-3xl shadow-[0_-2px_20px_rgba(0,0,0,0.06)] dark:shadow-none max-w-lg mx-auto"
        style={{ height: `${sheetHeight * 100}vh` }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY;
            const startHeight = sheetHeight;

            const onMove = (e2: TouchEvent) => {
              const deltaY = startY - e2.touches[0].clientY;
              const deltaPercent = deltaY / window.innerHeight;
              const newHeight = Math.max(0.2, Math.min(0.9, startHeight + deltaPercent));
              setSheetHeight(newHeight);
            };

            const onEnd = () => {
              // Snap to nearest point
              const nearest = SNAP_POINTS.reduce((prev, curr) =>
                Math.abs(curr - sheetHeight) < Math.abs(prev - sheetHeight) ? curr : prev
              );
              setSheetHeight(nearest);
              document.removeEventListener('touchmove', onMove);
              document.removeEventListener('touchend', onEnd);
            };

            document.addEventListener('touchmove', onMove);
            document.addEventListener('touchend', onEnd);
          }}
        >
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full" />
        </div>

        <div className="px-4 pb-2">
          <div className="flex gap-1.5 mb-3">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  radius === opt.value
                    ? 'bg-teal-500 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-2 mt-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-stone-400">{t('home.sortBy')}:</span>
            <button
              onClick={() => setSortBy('distance')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                sortBy === 'distance' ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}
            >
              {t('search.distance')}
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                sortBy === 'score' ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}
            >
              Score
            </button>
          </div>

          {/* Restaurant name search */}
          <div className="relative mt-2 mb-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-8 pr-4 h-9 rounded-lg bg-stone-50 dark:bg-stone-800 border-0 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>

          {/* Cuisine chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-1">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => setCuisineFilter(cuisine)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  cuisineFilter === cuisine
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cuisine === 'All' ? t('search.allCuisines') : cuisine}
              </button>
            ))}
          </div>

          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium">
            {t('home.nearby')} ({restaurantsWithDistance.length})
          </h2>
        </div>

        <div className="overflow-y-auto px-4 pb-24" style={{ height: 'calc(100% - 56px)' }}>
          {(loading || geo.loading) && restaurantsWithDistance.length === 0 ? (
            <div className="py-4">
              <RestaurantCardSkeleton count={5} />
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
                  className="w-full py-3 text-sm font-medium text-teal-600 dark:text-teal-400 active:text-teal-700 transition-colors"
                >
                  {t('common.loadMore')} ({restaurantsWithDistance.length - visibleCount} {t('common.remaining')})
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
