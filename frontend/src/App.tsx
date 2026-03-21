import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import AppRouter from './router';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ToastContainer from './components/ui/Toast';
import OfflineBanner from './components/ui/OfflineBanner';
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt';
import { useThemeStore } from './stores/themeStore';
import './App.css';

function App() {
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-stone-950">
          <TopBar />
          <OfflineBanner />
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
