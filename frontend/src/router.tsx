import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Lazy-loaded pages — each becomes its own chunk
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const RatingFlow = lazy(() => import('./pages/RatingFlow'));
const RestaurantDetail = lazy(() => import('./pages/RestaurantDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Auth = lazy(() => import('./pages/Auth'));
const Splash = lazy(() => import('./pages/Splash'));
const Trending = lazy(() => import('./pages/Trending'));
const QuickRate = lazy(() => import('./pages/QuickRate'));
const LocationPermission = lazy(() => import('./pages/LocationPermission'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Rewards = lazy(() => import('./pages/Rewards'));

function PageLoader() {
 return (
 <div className="flex-1 flex items-center justify-center">
 <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
 </div>
 );
}

function HomeOrSplash() {
 const [onboarded] = useState(() => localStorage.getItem('cleancheck_onboarded') === 'true');
 const [geoAsked] = useState(() => localStorage.getItem('cleancheck_geo_asked') === 'true');

 if (!onboarded) return <Navigate to="/splash" replace />;
 if (!geoAsked) return <Navigate to="/location-permission" replace />;
 return <Home />;
}

function NotFound() {
 return (
 <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-24">
 <span className="text-5xl mb-4">🚽</span>
 <h2 className="text-lg font-semibold text-stone-800 mb-2">404</h2>
 <p className="text-sm text-stone-500 mb-6">Diese Seite wurde nicht gefunden.</p>
 <a href="/" className="px-6 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium">
 Zurück zur Karte
 </a>
 </div>
 );
}

export default function AppRouter() {
 return (
 <Suspense fallback={<PageLoader />}>
 <ErrorBoundary>
 <Routes>
 <Route path="/" element={<HomeOrSplash />} />
 <Route path="/splash" element={<Splash />} />
 <Route path="/location-permission" element={<LocationPermission />} />
 <Route path="/search" element={<Search />} />
 <Route path="/rate" element={<RatingFlow />} />
 <Route path="/rate/:id" element={<QuickRate />} />
 <Route path="/restaurant/:id" element={<RestaurantDetail />} />
 <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
 <Route path="/auth" element={<Auth />} />
 <Route path="/trending" element={<Trending />} />
 <Route path="/leaderboard" element={<Leaderboard />} />
 <Route path="/rewards" element={<Rewards />} />
 <Route path="*" element={<NotFound />} />
 </Routes>
 </ErrorBoundary>
 </Suspense>
 );
}
