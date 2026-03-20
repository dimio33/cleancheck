import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { MOCK_RESTAURANTS, getDistance, getScoreColor, getScoreLabel } from '../data/mockData';
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

function UserLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useMemo(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);

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

export default function Home() {
  const { lat, lng } = useGeolocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(true);

  const restaurantsWithDistance = useMemo(() => {
    return MOCK_RESTAURANTS.map((r) => ({
      ...r,
      distance: getDistance(lat, lng, r.lat, r.lng),
    })).sort((a, b) => a.distance - b.distance);
  }, [lat, lng]);

  return (
    <div className="flex-1 relative" style={{ marginBottom: '-64px' }}>
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <UserLocationMarker lat={lat} lng={lng} />
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
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-2px_20px_rgba(0,0,0,0.06)] max-w-lg mx-auto"
            style={{ height: '42vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div
              className="flex justify-center pt-3 pb-1 cursor-grab"
              onClick={() => setSheetOpen(!sheetOpen)}
            >
              <div className="w-9 h-1 bg-stone-200 rounded-full" />
            </div>

            <div className="px-4 pb-2">
              <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('home.nearby')}</h2>
            </div>

            <div className="overflow-y-auto px-4 pb-24" style={{ height: 'calc(100% - 56px)' }}>
              <div className="space-y-2">
                {restaurantsWithDistance.map((r, i) => (
                  <RestaurantCard key={r.id} restaurant={r} distance={r.distance} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
