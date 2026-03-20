import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const showBack = location.pathname !== '/' && location.pathname !== '/search' && location.pathname !== '/profile';

  const toggleLang = () => {
    const next = i18n.language.startsWith('de') ? 'en' : 'de';
    i18n.changeLanguage(next);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-stone-100">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 -ml-1" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : <div className="w-8" />}

        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
          <span className="font-semibold text-stone-800 tracking-tight">CleanCheck</span>
        </div>

        <button
          onClick={toggleLang}
          className="text-xs font-medium text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors"
        >
          {i18n.language.startsWith('de') ? 'EN' : 'DE'}
        </button>
      </div>
    </header>
  );
}
