import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeoStore } from '../../stores/geoStore';

export default function LocationDeniedBanner() {
  const { permissionState, requestPermission } = useGeoStore();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (permissionState !== 'denied' || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-3"
      >
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <span className="text-amber-700 dark:text-amber-300 text-xs flex-1">
          {t('geo.locationDenied')}
        </span>
        <button
          onClick={() => requestPermission()}
          className="text-xs font-medium text-teal-600 dark:text-teal-400 whitespace-nowrap"
        >
          {t('locationPermission.tryAgain')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-stone-400 dark:text-stone-500 text-lg leading-none"
        >
          &times;
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
