import { BrowserRouter } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import AppRouter from './router';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ToastContainer from './components/ui/Toast';
import OfflineBanner from './components/ui/OfflineBanner';
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen bg-slate-50">
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
