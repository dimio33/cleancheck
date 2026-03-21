import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function PWAUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-[60] max-w-lg mx-auto"
        >
          <div className="bg-stone-800 text-white rounded-xl p-4 shadow-xl flex items-center justify-between gap-3">
            <p className="text-sm">{t('pwa.updateAvailable')}</p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 bg-teal-500 rounded-lg text-xs font-medium"
              >
                {t('pwa.update')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
