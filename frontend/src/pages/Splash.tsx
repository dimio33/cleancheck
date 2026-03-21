import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

const CRITERIA_ICONS = [
  { icon: '🧹', key: 'cleanliness' },
  { icon: '👃', key: 'smell' },
  { icon: '🧻', key: 'supplies' },
  { icon: '🔧', key: 'maintenance' },
  { icon: '♿', key: 'accessibility' },
];

export default function Splash() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

  const handleFinish = () => {
    localStorage.setItem('cleancheck_onboarded', 'true');
    navigate('/');
  };

  // Auto-skip splash after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('cleancheck_onboarded', 'true');
      navigate('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleGuestContinue = () => {
    loginAsGuest();
    handleFinish();
  };

  const slides = [
    // Slide 1: Hero — elegant heading with gradient accent line
    <motion.div
      key="slide1"
      className="flex flex-col items-center justify-center h-full px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-stone-100 whitespace-pre-line leading-tight text-center">
        {t('splash.slide1Title')}
      </h1>
      <div className="w-12 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full mt-5 mb-5" />
      <p className="text-stone-500 text-center max-w-xs text-sm leading-relaxed">
        {t('splash.slide1Desc')}
      </p>
    </motion.div>,

    // Slide 2: How it works — timeline-style vertical list
    <motion.div
      key="slide2"
      className="flex flex-col items-center justify-center h-full px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-6">
        {t('splash.slide2Title')}
      </h2>
      <div className="w-full max-w-xs">
        {CRITERIA_ICONS.map((c, i) => (
          <div key={c.key} className="flex items-center gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-lg border border-stone-100">
                {c.icon}
              </div>
              {i < CRITERIA_ICONS.length - 1 && (
                <div className="w-px h-6 bg-stone-200" />
              )}
            </div>
            <span className="text-sm font-medium text-stone-700 pb-1">
              {t(`splash.criteria.${c.key}`)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-stone-500 max-w-xs text-center mt-6 text-sm leading-relaxed">
        {t('splash.slide2Desc')}
      </p>
    </motion.div>,

    // Slide 3: Join — register / guest
    <motion.div
      key="slide3"
      className="flex flex-col items-center justify-center h-full px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h2 className="text-2xl font-light tracking-tight text-stone-900 dark:text-stone-100 mb-2 text-center">
        {t('splash.slide3Title')}
      </h2>
      <p className="text-stone-500 mb-8 max-w-xs text-center text-sm leading-relaxed">
        {t('splash.slide3Desc')}
      </p>
      <button
        onClick={() => { handleFinish(); navigate('/auth'); }}
        className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-95 transition-transform"
      >
        {t('splash.getStarted')}
      </button>
      <button
        onClick={handleGuestContinue}
        className="mt-4 text-stone-400 text-sm font-medium hover:text-teal-600 transition-colors"
      >
        {t('splash.continueAsGuest')}
      </button>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 bg-[#FAFAF9] dark:bg-stone-950 z-50 flex flex-col">
      {/* Skip button */}
      {step < 2 && (
        <div className="flex justify-end p-5">
          <button
            onClick={handleGuestContinue}
            className="text-xs text-stone-400 font-medium uppercase tracking-widest hover:text-stone-600 transition-colors"
          >
            {t('splash.skip')}
          </button>
        </div>
      )}

      {/* Slides */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {slides[step]}
        </AnimatePresence>
      </div>

      {/* Dots + Next */}
      <div className="flex flex-col items-center gap-5 pb-12 px-8">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'bg-teal-500 w-1.5 h-1.5' : 'bg-stone-200 w-1.5 h-1.5'
              }`}
              layout
            />
          ))}
        </div>

        {/* Next button (not on last slide) */}
        {step < 2 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-95 transition-transform"
          >
            {t('splash.next')}
          </button>
        )}
      </div>
    </div>
  );
}
