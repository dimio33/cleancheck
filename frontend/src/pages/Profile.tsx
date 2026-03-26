import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useRestaurantStore } from '../stores/restaurantStore';
import { useDraftStore } from '../stores/draftStore';
import BadgeCard from '../components/ui/BadgeCard';
import XpBar from '../components/ui/XpBar';
import AvatarFrame from '../components/ui/AvatarFrame';
import { getScoreColor } from '../utils/geo';
import api from '../services/api';
import type { Badge, Rating } from '../types';

export default function Profile() {
 const { t, i18n } = useTranslation();
 const navigate = useNavigate();
 const { user, isAuthenticated, logout } = useAuthStore();

 const [profileData, setProfileData] = useState<any>(null);
 const [userRatings, setUserRatings] = useState<Rating[]>([]);
 const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
 const [profileLoading, setProfileLoading] = useState(false);
 const [profileError, setProfileError] = useState(false);

 useEffect(() => {
 if (user && user.id !== 'guest' && isAuthenticated) {
 setProfileLoading(true);
 setProfileError(false);
 Promise.all([
 api.get(`/users/${user.id}/profile`).then(({ data }) => setProfileData(data)),
 api.get(`/ratings/user/${user.id}`).then(({ data }) => setUserRatings(data.ratings || [])),
 api.get('/rewards').then(({ data }) => setClaimedRewards(data.claimed || [])).catch(() => {}),
 ]).catch(() => setProfileError(true)).finally(() => setProfileLoading(false));
 }
 }, [user, isAuthenticated]);

 const displayUser = profileData?.user
 ? {
 username: profileData.user.username,
 email: profileData.user.email,
 created_at: profileData.user.created_at,
 rating_count: profileData.stats?.total_ratings || 0,
 restaurant_count: profileData.stats?.unique_restaurants || 0,
 average_score: profileData.stats?.avg_score || 0,
 }
 : user
 ? { username: user.username, email: user.email, created_at: user.created_at, rating_count: 0, restaurant_count: 0, average_score: 0 }
 : null;

 const badges: Badge[] = profileData?.badges || [];
 const activeFrame: string | null = profileData?.user?.active_frame || null;
 const hasAnimatedProfile = claimedRewards.some((r: any) => r.name_en === 'Animated Profile');

 const gamification = profileData?.gamification || {};
 const xp = gamification.xp ?? profileData?.user?.xp ?? 0;
 const level = gamification.level ?? profileData?.user?.level ?? 1;
 const rankObj = gamification.rank;
 const rank = typeof rankObj === 'object' && rankObj !== null
   ? (i18n.language === 'de' ? rankObj.de : rankObj.en) || 'newbie'
   : rankObj ?? 'newbie';
 const xpForNextLevel = gamification.xpForNextLevel ?? 100;
 const xpProgress = gamification.progress ?? 0;

 if (!user) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-24">
 <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-5">
 <svg className="w-7 h-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
 </svg>
 </div>
 <h2 className="text-lg font-semibold text-stone-800 mb-1">{t('profile.title')}</h2>
 <p className="text-sm text-stone-500 mb-6">{t('profile.loginPrompt')}</p>
 <button
 onClick={() => navigate('/auth')}
 className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20"
 >
 {t('profile.login')}
 </button>
 </div>
 );
 }

 const toggleLanguage = () => {
 const next = i18n.language.startsWith('de') ? 'en' : 'de';
 i18n.changeLanguage(next);
 };

 if (profileError) {
 return (
 <div className="flex-1 flex items-center justify-center pb-24">
 <div className="text-center">
 <p className="text-stone-500 mb-3">{t('common.errorOccurred')}</p>
 <button onClick={() => window.location.reload()} className="text-teal-500 font-medium">{t('common.tryAgain')}</button>
 </div>
 </div>
 );
 }

 return (
 <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
 {/* Teal Gradient Hero */}
 <div
   className={`px-5 pb-14 text-center ${hasAnimatedProfile ? 'animate-gradient-shift bg-[length:200%_200%]' : ''}`}
   style={hasAnimatedProfile
     ? { backgroundImage: 'linear-gradient(135deg, #0d9488, #14b8a6, #0891b2, #0d9488)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }
     : { backgroundImage: 'linear-gradient(to bottom right, #0d9488, #14b8a6)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }
   }
 >
 <div className="relative w-[72px] h-[72px] mx-auto mb-4">
 <AvatarFrame frame={activeFrame} size="lg">
 <motion.div
 className="w-full h-full rounded-full bg-white/20 flex items-center justify-center"
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', damping: 12 }}
 >
 <span className="text-[28px] text-white font-bold">
 {displayUser?.username?.charAt(0)?.toUpperCase() || '?'}
 </span>
 </motion.div>
 </AvatarFrame>
 {/* Level badge */}
 <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center z-10">
 <span className="text-[11px] font-bold text-white">{level}</span>
 </div>
 </div>
 <h2 className="text-xl font-bold text-white tracking-[-0.3px]">
 {displayUser?.username}
 <span className="text-sm font-normal text-white/60 ml-1.5">
 — {rank}
 </span>
 </h2>
 <p className="text-[13px] text-white/70 mt-1.5">
 {t('profile.memberSince')} {displayUser && new Date(displayUser.created_at).toLocaleDateString()}
 </p>
 {/* XP Bar */}
 <div className="mt-5 px-4">
 <XpBar xp={xp} level={level} rank={rank} xpForNextLevel={xpForNextLevel} progress={xpProgress} />
 </div>
 </div>

 {/* Overlapping Stat Cards */}
 <div className="flex gap-2 px-5 -mt-6 relative z-10">
 {profileLoading ? (
 <div className="flex-1 flex items-center justify-center py-6">
 <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
 </div>
 ) : (
 [
 { value: displayUser?.rating_count || 0, label: t('profile.totalRatings') },
 { value: displayUser?.restaurant_count || 0, label: t('profile.restaurants') },
 { value: (displayUser?.average_score || 0).toFixed(1), label: t('profile.avgScore') },
 ].map((stat, i) => (
 <motion.div
 key={stat.label}
 className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 text-center"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 + i * 0.1 }}
 >
 <span className="text-[28px] font-extrabold text-stone-900 block">{stat.value}</span>
 <span className="text-[11px] text-stone-400 font-medium mt-0.5 block">{stat.label}</span>
 </motion.div>
 ))
 )}
 </div>

 {/* Badges */}
 {badges.length > 0 && (
 <div className="px-4 mt-6 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.badges')}</h3>
 <div className="grid grid-cols-2 gap-2.5">
 {badges.map((badge: Badge, i: number) => (
 <BadgeCard key={badge.id || badge.slug} badge={badge} index={i} />
 ))}
 </div>
 </div>
 )}

 {/* Saved Restaurants */}
 {(() => {
 const favorites = useFavoritesStore((s) => s.favorites);
 const { restaurants } = useRestaurantStore();
 if (favorites.length === 0) return (
 <div className="px-4 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.saved')} (0)</h3>
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-6 text-center">
 <span className="text-2xl block mb-2">&#10084;&#65039;</span>
 <p className="text-sm text-stone-400">{t('profile.noSaved')}</p>
 </div>
 </div>
 );
 return (
 <div className="px-4 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.saved')} ({favorites.length})</h3>
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
 {favorites.slice(0, 5).map((id, i) => {
 const r = restaurants.find((r) => r.id === id);
 return (
 <motion.div
 key={id}
 className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50 transition-colors ${
 i < Math.min(favorites.length, 5) - 1 ? 'border-b border-stone-50' : ''
 }`}
 onClick={() => navigate(`/restaurant/${id}`)}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.05 + i * 0.03 }}
 >
 <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
 <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
 <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
 </svg>
 </div>
 <span className="text-sm font-medium text-stone-800 truncate flex-1">
 {r?.name || (id.startsWith('osm-') ? `Restaurant #${id.slice(4, 10)}` : id.slice(0, 8))}
 </span>
 </motion.div>
 );
 })}
 </div>
 </div>
 );
 })()}

 {/* Offline Drafts */}
 {useDraftStore.getState().drafts.length > 0 && (
 <div className="px-4 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.drafts')} ({useDraftStore.getState().drafts.length})</h3>
 <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
 <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-amber-800">{t('profile.draftsHint')}</p>
 </div>
 </div>
 </div>
 )}

 {/* Rating History — Score-left mini cards */}
 <div className="px-4 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.history')}</h3>
 {userRatings.length === 0 ? (
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-8 text-center">
 <p className="text-sm text-stone-400">{t('home.noRatings')}</p>
 </div>
 ) : (
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
 {userRatings.slice(0, 5).map((rating, i) => (
 <motion.div
 key={rating.id}
 className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50 transition-colors ${
 i < Math.min(userRatings.length, 5) - 1 ? 'border-b border-stone-100' : ''
 }`}
 onClick={() => navigate(`/restaurant/${rating.restaurant_id}`)}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.1 + i * 0.05 }}
 >
 <div
 className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
 style={{ backgroundColor: getScoreColor(rating.overall_score) }}
 >
 <span className="text-[13px] font-bold text-white">
 {Number(rating.overall_score).toFixed(1)}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-stone-800 block truncate">
 {rating.restaurant_name}
 </span>
 <span className="text-xs text-stone-400">
 {new Date(rating.created_at).toLocaleDateString()}
 </span>
 </div>
 </motion.div>
 ))}
 </div>
 )}
 </div>

 {/* Settings */}
 <div className="px-4">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.settings')}</h3>
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 overflow-hidden">
 <button
 onClick={toggleLanguage}
 className="flex items-center justify-between w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-stone-700">{t('profile.language')}</span>
 <span className="text-sm text-teal-600 font-medium">
 {i18n.language.startsWith('de') ? 'Deutsch' : 'English'}
 </span>
 </button>
 {isAuthenticated && (
 <>
 <div className="h-px bg-stone-50" />
 <button
 onClick={() => navigate('/rewards')}
 className="flex items-center justify-between w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-stone-700 flex items-center gap-2">
 <span>🎁</span> {t('rewards.title')}
 </span>
 <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
 </svg>
 </button>
 <div className="h-px bg-stone-50" />
 <button
 onClick={() => { navigate('/'); setTimeout(logout, 50); }}
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-rose-500 font-medium">{t('profile.logout')}</span>
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
