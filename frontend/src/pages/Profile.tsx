import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import BadgeCard from '../components/ui/BadgeCard';
import { MOCK_USER, MOCK_BADGES, getUserRatings, getScoreColor } from '../data/mockData';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Use mock data for display
  const displayUser = user?.id === 'guest' || !user ? MOCK_USER : { ...MOCK_USER, ...user };
  const badges = displayUser.badges.length > 0 ? displayUser.badges : MOCK_BADGES;
  const userRatings = getUserRatings(displayUser.id);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-24">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-stone-800 mb-1">{t('profile.title')}</h2>
        <p className="text-sm text-stone-500 mb-6">{t('profile.loginPrompt')}</p>
        <button
          onClick={() => navigate('/auth')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20"
        >
          {t('profile.login')}
        </button>
      </div>
    );
  }

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('de') ? 'en' : 'de';
    i18n.changeLanguage(next);
  };

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <span className="text-xl text-white font-semibold">
            {displayUser.username.charAt(0).toUpperCase()}
          </span>
        </motion.div>
        <h2 className="text-lg font-semibold text-stone-800">{displayUser.username}</h2>
        <p className="text-xs text-stone-400 mt-0.5">
          {t('profile.memberSince')} {new Date(displayUser.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4">
          <div className="grid grid-cols-3 divide-x divide-stone-100">
            {[
              { value: displayUser.rating_count, label: t('profile.totalRatings') },
              { value: displayUser.restaurant_count, label: t('profile.restaurants') },
              { value: displayUser.average_score.toFixed(1), label: t('profile.avgScore') },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center px-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
              >
                <span className="text-2xl font-light text-stone-800 block">{stat.value}</span>
                <span className="text-[10px] uppercase tracking-widest text-stone-400">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="px-4 mb-6">
        <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.badges')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((badge, i) => (
            <BadgeCard key={badge.id} badge={badge} index={i} />
          ))}
        </div>
      </div>

      {/* Rating History */}
      <div className="px-4 mb-6">
        <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.history')}</h3>
        <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
          {userRatings.slice(0, 5).map((rating, i) => (
            <motion.div
              key={rating.id}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50 transition-colors ${
                i < Math.min(userRatings.length, 5) - 1 ? 'border-b border-stone-50' : ''
              }`}
              onClick={() => navigate(`/restaurant/${rating.restaurant_id}`)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${getScoreColor(rating.overall_score)}12`,
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: getScoreColor(rating.overall_score) }}>
                  {rating.overall_score.toFixed(1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-stone-800 block truncate">
                  {rating.restaurant_name}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(rating.created_at).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-4">
        <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.settings')}</h3>
        <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
          {/* Language */}
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-between w-full p-4 hover:bg-stone-50 transition-colors"
          >
            <span className="text-sm text-stone-700">{t('profile.language')}</span>
            <span className="text-sm text-teal-600 font-medium">
              {i18n.language.startsWith('de') ? 'Deutsch' : 'English'}
            </span>
          </button>

          {/* Logout */}
          {isAuthenticated && (
            <>
              <div className="h-px bg-stone-50" />
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
              >
                <span className="text-sm text-rose-500 font-medium">{t('profile.logout')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
