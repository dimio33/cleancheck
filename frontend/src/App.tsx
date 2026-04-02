import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import AppRouter from './router';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ToastContainer from './components/ui/Toast';
import OfflineBanner from './components/ui/OfflineBanner';
import LocationDeniedBanner from './components/ui/LocationDeniedBanner';
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt';
import AnimatedSplash from './components/ui/AnimatedSplash';
import { useThemeStore } from './stores/themeStore';
import { useDraftStore } from './stores/draftStore';
import { useGeoStore } from './stores/geoStore';
import { useToastStore } from './components/ui/Toast';
import { initNativePushListeners } from './services/pushNotifications';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const initTheme = useThemeStore((s) => s.init);
  const initGeo = useGeoStore((s) => s.initGeo);
  const addToast = useToastStore((s) => s.addToast);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    initTheme();
    initGeo();
    initNativePushListeners();

    // Sync offline drafts when coming back online
    const handleOnline = async () => {
      const synced = await useDraftStore.getState().syncDrafts();
      if (synced > 0) {
        addToast(`${synced} offline rating(s) synced!`, 'success');
      }
    };
    window.addEventListener('online', handleOnline);

    // Also try syncing on app start
    if (navigator.onLine && useDraftStore.getState().drafts.length > 0) {
      handleOnline();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [initTheme, initGeo, addToast]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {showSplash && <AnimatedSplash onComplete={handleSplashComplete} />}
        <div className="flex flex-col min-h-screen bg-stone-50">
          <TopBar />
          <OfflineBanner />
          <LocationDeniedBanner />
          <ToastContainer />
          <main className="flex-1 flex flex-col">
            <AppRouter />
          </main>
          <BottomNav />
          <PWAUpdatePrompt />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
