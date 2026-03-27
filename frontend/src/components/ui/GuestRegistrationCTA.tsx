import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface GuestRegistrationCTAProps {
  variant: 'inline' | 'card';
  className?: string;
}

export default function GuestRegistrationCTA({ variant, className = '' }: GuestRegistrationCTAProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (variant === 'inline') {
    return (
      <motion.button
        onClick={() => navigate('/auth')}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/60 active:scale-[0.98] transition-transform ${className}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Lock/sparkle icon */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-teal-500/20">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <span className="flex-1 text-left text-sm font-medium text-teal-800">
          {t('guest.ctaInline')}
        </span>
        <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </motion.button>
    );
  }

  // Card variant
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Teal gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400" />

      <div className="p-6 text-center">
        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </motion.div>

        <h3 className="text-lg font-bold text-stone-900 mb-1.5">
          {t('guest.ctaTitle')}
        </h3>
        <p className="text-sm text-stone-500 mb-5 max-w-[260px] mx-auto leading-relaxed">
          {t('guest.ctaDescription')}
        </p>

        <button
          onClick={() => navigate('/auth')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.97] transition-transform"
        >
          {t('guest.ctaButton')}
        </button>
      </div>
    </motion.div>
  );
}
