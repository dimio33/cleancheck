import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import RatingFlow from './pages/RatingFlow';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Splash from './pages/Splash';
import Trending from './pages/Trending';
import QuickRate from './pages/QuickRate';

function HomeOrSplash() {
  const [onboarded] = useState(() => localStorage.getItem('cleancheck_onboarded') === 'true');
  if (!onboarded) return <Navigate to="/splash" replace />;
  return <Home />;
}

function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-24">
      <span className="text-5xl mb-4">🚽</span>
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-2">404</h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Diese Seite wurde nicht gefunden.</p>
      <a href="/" className="px-6 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium">
        Zurück zur Karte
      </a>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeOrSplash />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/search" element={<Search />} />
      <Route path="/rate" element={<RatingFlow />} />
      <Route path="/rate/:id" element={<QuickRate />} />
      <Route path="/restaurant/:id" element={<RestaurantDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/trending" element={<Trending />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
