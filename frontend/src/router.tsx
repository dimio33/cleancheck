import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import RatingFlow from './pages/RatingFlow';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Splash from './pages/Splash';

function HomeOrSplash() {
  const [onboarded] = useState(() => localStorage.getItem('cleancheck_onboarded') === 'true');
  if (!onboarded) return <Navigate to="/splash" replace />;
  return <Home />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeOrSplash />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/search" element={<Search />} />
      <Route path="/rate" element={<RatingFlow />} />
      <Route path="/restaurant/:id" element={<RestaurantDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth" element={<Auth />} />
    </Routes>
  );
}
