import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { EmptyLeaderboard } from '../components/ui/EmptyState';
import api from '../services/api';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  rank_title: string;
  rating_count: number;
  xp: number;
}

const RANK_COLORS: Record<number, string> = {
  1: '#F59E0B', // gold
  2: '#9CA3AF', // silver
  3: '#CD7F32', // bronze
};

export default function Leaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard/cities')
      .then(({ data }) => setCities(data.cities || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : '';
    api.get(`/leaderboard/weekly${params}`)
      .then(({ data }) => {
        setEntries(data.leaderboard || []);
        setUserRank(data.user_rank ?? null);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            {t('gamification.leaderboard')}
          </h1>
        </div>

        {/* City filter */}
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="w-full h-10 px-3 rounded-xl bg-stone-100 border-0 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option value="">{t('gamification.allCities')}</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Your Rank callout */}
      {userRank && selectedCity && (
        <motion.div
          className="mx-5 mb-3 p-3 bg-teal-50 rounded-xl text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-sm font-medium text-teal-700">
            {t('gamification.yourRank', { rank: userRank, city: selectedCity || t('gamification.allCities') })}
          </span>
        </motion.div>
      )}

      {/* Section title */}
      <div className="px-5 pb-2">
        <p className="text-[11px] uppercase tracking-[1.5px] text-stone-400 font-medium">
          {t('gamification.weeklyTop')}
        </p>
      </div>

      {/* Leaderboard list */}
      <div className="px-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyLeaderboard />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
            {entries.map((entry, i) => {
              const rankNum = i + 1;
              const isCurrentUser = user?.id === entry.user_id;
              const rankColor = RANK_COLORS[rankNum] || '#A8A29E';

              return (
                <motion.div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3.5 ${
                    isCurrentUser ? 'bg-teal-50' : ''
                  } ${i < entries.length - 1 ? 'border-b border-stone-50' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {/* Rank number */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{
                      backgroundColor: rankNum <= 3 ? `${rankColor}20` : '#F5F5F4',
                      color: rankColor,
                    }}
                  >
                    {rankNum}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {entry.username?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block truncate ${isCurrentUser ? 'text-teal-700' : 'text-stone-800'}`}>
                      {entry.username}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {t(`gamification.ranks.${entry.rank_title}`, entry.rank_title)}
                    </span>
                  </div>

                  {/* Rating count */}
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-stone-700">{entry.rating_count}</span>
                    <span className="text-[10px] text-stone-400 block">{t('home.ratings')}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
