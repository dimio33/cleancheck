import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useGeoStore } from '../../stores/geoStore';

export default function LocationDeniedBanner() {
  const { permissionState, requestPermission, checkPermission } = useGeoStore();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  if (permissionState !== 'denied' || dismissed) return null;

  const handleRetry = async () => {
    if (isNative) {
      // On native, after deny we need to open system settings
      // But first try re-checking — user might have changed it in settings
      await checkPermission();
      const state = useGeoStore.getState().permissionState;
      if (state === 'granted') {
        useGeoStore.getState().startWatching();
        return;
      }
      // Open app settings on iOS/Android
      try {
        const { NativeSettings, IOSSettings } = await import('capacitor-native-settings');
        await NativeSettings.openIOS({ option: IOSSettings.App });
      } catch {
        // Fallback: just try requesting again
        await requestPermission();
      }
    } else {
      await requestPermission();
    }
  };

  // Re-check permission when app comes back from settings
  const handleVisibilityChange = async () => {
    if (!document.hidden && isNative) {
      await checkPermission();
      const state = useGeoStore.getState().permissionState;
      if (state === 'granted') {
        useGeoStore.getState().startWatching();
      }
    }
  };

  // Listen for app resume (user comes back from settings)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3"
      >
        <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <span className="text-amber-700 text-xs flex-1">
          {t('geo.locationDenied')}
        </span>
        <button
          onClick={handleRetry}
          className="text-xs font-semibold text-teal-600 whitespace-nowrap bg-teal-50 px-3 py-1.5 rounded-full"
        >
          {isNative ? t('geo.openSettings', 'Einstellungen') : t('locationPermission.tryAgain')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-stone-400 text-lg leading-none"
        >
          &times;
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
