import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import RatingFlow from './pages/RatingFlow';
import RestaurantDetail from './pages/RestaurantDetail';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Splash from './pages/Splash';

function hasOnboarded(): boolean {
  return localStorage.getItem('cleancheck_onboarded') === 'true';
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={hasOnboarded() ? <Home /> : <Navigate to="/splash" replace />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/search" element={<Search />} />
      <Route path="/rate" element={<RatingFlow />} />
      <Route path="/restaurant/:id" element={<RestaurantDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth" element={<Auth />} />
    </Routes>
  );
}
