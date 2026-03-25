import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"/>
    <path d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z"/>
  </svg>
);

const TrendingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7L18 2M18 2H13M18 2V7" />
    <path d="M3 17L9 11L13 15L21 7" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5V19M5 12H19"/>
  </svg>
);

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Hide on splash/auth paths
  const hiddenPaths = ['/splash', '/auth'];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const Tab = ({ path, icon, label }: { path: string; icon: React.ReactNode; label: string }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => navigate(path)}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors relative ${
          active ? 'text-teal-600' : 'text-stone-400'
        }`}
      >
        <motion.div animate={{ scale: active ? 1.15 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          {icon}
        </motion.div>
        <span className="text-[10px] font-medium mt-0.5">{label}</span>
        {active && (
          <motion.div
            className="w-1 h-1 rounded-full bg-teal-500 mt-0.5"
            layoutId="nav-indicator"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-black/[0.04] pb-safe" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="flex items-center h-16 max-w-lg mx-auto px-2">
        <Tab path="/" icon={<MapIcon />} label={t('nav.home')} />
        <Tab path="/trending" icon={<TrendingIcon />} label={t('nav.trending')} />

        <div className="flex items-center justify-center flex-1">
          <button
            onClick={() => navigate('/rate')}
            className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-teal-600 text-white shadow-[0_4px_16px_rgba(13,148,136,0.3)] active:scale-95 transition-transform"
          >
            <PlusIcon />
          </button>
        </div>

        <Tab path="/profile" icon={<ProfileIcon />} label={t('nav.profile')} />
      </div>
    </nav>
  );
}
