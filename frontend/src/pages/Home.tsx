import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistance, getScoreColor, getScoreLabel } from '../utils/geo';
import { useRestaurantStore } from '../stores/restaurantStore';
import RestaurantCard from '../components/ui/RestaurantCard';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function createScoreIcon(score: number | null) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  return L.divIcon({
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
}

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

function UserLocationMarker({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();

  useMemo(() => {
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
  const { restaurants, loading, fetchRestaurants, radius, setRadius } = useRestaurantStore();

  useEffect(() => {
    if (!geo.loading) {
      fetchRestaurants(lat, lng);
    }
  }, [lat, lng, radius, geo.loading, fetchRestaurants]);

  const restaurantsWithDistance = useMemo(() => {
    const withDist = restaurants.map((r) => ({
      ...r,
      distance: getDistance(lat, lng, r.lat, r.lng),
    }));

    if (sortBy === 'score') {
      return withDist.sort((a, b) => (b.clean_score ?? -1) - (a.clean_score ?? -1));
    }
    return withDist.sort((a, b) => a.distance - b.distance);
  }, [lat, lng, restaurants, sortBy]);

  const mapZoom = zoomForRadius(radius);

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
          <UserLocationMarker lat={lat} lng={lng} zoom={mapZoom} />
          <Circle
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: '#0d9488',
              weight: 2.5,
              fillColor: '#14b8a6',
              fillOpacity: 0.1,
              dashArray: '10 6',
            }}
          />
          {restaurantsWithDistance.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={createScoreIcon(r.clean_score)}
              eventHandlers={{
                click: () => navigate(`/restaurant/${r.id}`),
              }}
            >
              <Popup>
                <div className="text-center p-1">
                  <strong className="text-sm">{r.name}</strong>
                  <br />
                  <span className="text-xs" style={{ color: getScoreColor(r.clean_score) }}>
                    {r.clean_score !== null ? `CleanScore: ${r.clean_score}` : t('home.noRatings')}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Sheet - Restaurant List */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-2px_20px_rgba(0,0,0,0.06)] max-w-lg mx-auto"
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
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
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
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
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
                sortBy === 'distance' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'
              }`}
            >
              {t('search.distance')}
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                sortBy === 'score' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'
              }`}
            >
              Score
            </button>
          </div>

          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium">
            {t('home.nearby')} ({restaurantsWithDistance.length})
          </h2>
        </div>

        <div className="overflow-y-auto px-4 pb-24" style={{ height: 'calc(100% - 56px)' }}>
          {(loading || geo.loading) ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-stone-400">{t('common.loading')}</span>
            </div>
          ) : restaurantsWithDistance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl mb-3">🍽️</span>
              <p className="text-sm text-stone-400">{t('search.noResults')}</p>
              <p className="text-xs text-stone-300 mt-1">{t('search.noResultsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {restaurantsWithDistance.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} distance={r.distance} index={i} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
