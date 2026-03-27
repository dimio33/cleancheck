import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useRestaurantStore } from '../stores/restaurantStore';
import { useDraftStore } from '../stores/draftStore';
import { useShallow } from 'zustand/react/shallow';
import BadgeCard from '../components/ui/BadgeCard';
import XpBar from '../components/ui/XpBar';
import AvatarFrame from '../components/ui/AvatarFrame';
import GuestRegistrationCTA from '../components/ui/GuestRegistrationCTA';
import { getScoreColor } from '../utils/geo';
import api from '../services/api';
import type { Badge, Rating } from '../types';

export default function Profile() {
 const { t, i18n } = useTranslation();
 const navigate = useNavigate();
 const { user, isAuthenticated, logout } = useAuthStore(useShallow((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, logout: s.logout })));

 const [profileData, setProfileData] = useState<any>(null);
 const [userRatings, setUserRatings] = useState<Rating[]>([]);
 const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
 const [profileLoading, setProfileLoading] = useState(false);
 const [profileError, setProfileError] = useState(false);
 const [editingNickname, setEditingNickname] = useState(false);
 const [newNickname, setNewNickname] = useState('');
 const [nicknameError, setNicknameError] = useState('');
 const [nicknameSaving, setNicknameSaving] = useState(false);

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

 if (!user || user.id === 'guest' || !isAuthenticated) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-24">
 {/* Grayed-out XP preview */}
 <div className="w-full max-w-xs mb-6 opacity-40 pointer-events-none">
 <div className="bg-white rounded-2xl shadow-sm p-4">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
 <span className="text-lg font-bold text-stone-400">?</span>
 </div>
 <div className="flex-1">
 <div className="h-3 bg-stone-200 rounded-full w-24 mb-1.5" />
 <div className="h-2 bg-stone-100 rounded-full w-16" />
 </div>
 </div>
 <div className="h-2 bg-stone-100 rounded-full w-full mb-1" />
 <div className="flex justify-between">
 <span className="text-[10px] text-stone-300">0 XP</span>
 <span className="text-[10px] text-stone-300">Level 1</span>
 </div>
 </div>
 </div>

 <GuestRegistrationCTA variant="card" className="w-full max-w-xs" />
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
 <>
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
 <button
   onClick={() => setEditingNickname(true)}
   className="text-[11px] text-white/50 mt-0.5 hover:text-white/80 transition-colors"
 >
   ✏️ {t('profile.changeNickname')}
 </button>
 <p className="text-[13px] text-white/70 mt-1">
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

 {/* Reward Roadmap */}
 <div className="px-4 mb-6">
 <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">{t('profile.rewardRoadmap', 'Belohnungen & Level')}</h3>
 <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4">
 {[
   { lvl: 5, icon: '🥉', title: t('rewards.bronze', 'Bronze-Rahmen'), desc: t('rewards.bronzeDesc', 'Dein erster Rahmen') },
   { lvl: 10, icon: '🥈', title: t('rewards.silver', 'Silber-Rahmen'), desc: t('rewards.silverDesc', 'Exklusiver Silber-Look') },
   { lvl: 15, icon: '🥇', title: t('rewards.gold', 'Gold-Rahmen + 5€ Gutschein'), desc: t('rewards.goldDesc', 'Dein erster echter Reward') },
   { lvl: 20, icon: '✏️', title: t('rewards.customTitle', 'Custom Titel'), desc: t('rewards.customTitleDesc', 'Wähle deinen eigenen Titel') },
   { lvl: 25, icon: '💎', title: t('rewards.diamond', 'Diamant-Rahmen + 10€ Gutschein'), desc: t('rewards.diamondDesc', 'Premium-Status freigeschaltet') },
   { lvl: 30, icon: '✨', title: t('rewards.animated', 'Animiertes Profil'), desc: t('rewards.animatedDesc', 'Dein Profil wird lebendig') },
   { lvl: 40, icon: '👑', title: t('rewards.legendary', 'Legendärer Rahmen + 25€ Gutschein'), desc: t('rewards.legendaryDesc', 'Der ultimative Reward') },
 ].map((reward, i) => {
   const reached = level >= reward.lvl;
   return (
     <div key={reward.lvl} className="flex items-start gap-3 relative">
       {i < 6 && <div className={`absolute left-[15px] top-[32px] w-[2px] h-[calc(100%)] ${reached ? 'bg-teal-300' : 'bg-stone-200'}`} />}
       <div className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 text-sm z-10 ${reached ? 'bg-teal-100 ring-2 ring-teal-400' : 'bg-stone-100'}`}>
         {reward.icon}
       </div>
       <div className={`flex-1 pb-4 ${!reached ? 'opacity-50' : ''}`}>
         <div className="flex items-center gap-2">
           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reached ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-400'}`}>Level {reward.lvl}</span>
           {reached && <span className="text-[10px] text-teal-500 font-medium">✓</span>}
         </div>
         <p className="text-sm font-medium text-stone-800 mt-0.5">{reward.title}</p>
         <p className="text-xs text-stone-400">{reward.desc}</p>
       </div>
     </div>
   );
 })}
 </div>
 </div>

 {/* Saved Restaurants */}
 {(() => {
 const favorites = useFavoritesStore((s) => s.favorites);
 const restaurants = useRestaurantStore((s) => s.restaurants);
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
 onClick={async () => {
   try {
     const { data } = await api.get(`/users/${user!.id}/data-export`);
     const json = JSON.stringify(data, null, 2);
     const blob = new Blob([json], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'meine-daten.json';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   } catch (err) {
     console.error('Data export failed:', err);
   }
 }}
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-stone-700">{t('profile.exportData')}</span>
 </button>
 <div className="h-px bg-stone-50" />
 <a
 href="https://wc-cleancheck.de/datenschutz"
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-stone-700">{t('profile.privacy')}</span>
 </a>
 <div className="h-px bg-stone-50" />
 <a
 href="https://wc-cleancheck.de/impressum"
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-stone-700">{t('profile.imprint')}</span>
 </a>
 <div className="h-px bg-stone-50" />
 <button
 onClick={() => { navigate('/'); setTimeout(logout, 50); }}
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-sm text-rose-500 font-medium">{t('profile.logout')}</span>
 </button>
 <div className="h-px bg-stone-50" />
 <button
 onClick={async () => {
   if (!window.confirm(t('profile.deleteAccountConfirm'))) return;
   try {
     await api.delete(`/users/${user!.id}`);
     navigate('/');
     setTimeout(logout, 50);
   } catch (err) {
     console.error('Account deletion failed:', err);
   }
 }}
 className="flex items-center w-full p-4 hover:bg-stone-50 transition-colors"
 >
 <span className="text-xs text-rose-400">{t('profile.deleteAccount')}</span>
 </button>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Nickname Edit Modal — inside return via fragment */}
 {editingNickname && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={() => setEditingNickname(false)}>
     <motion.div
       className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
       initial={{ scale: 0.9, opacity: 0 }}
       animate={{ scale: 1, opacity: 1 }}
       onClick={(e) => e.stopPropagation()}
     >
       <h3 className="text-lg font-bold text-stone-800 mb-1">{t('profile.changeNickname')}</h3>
       <p className="text-xs text-stone-400 mb-4">Dein Nickname ist öffentlich bei Bewertungen sichtbar.</p>

       {nicknameError && (
         <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{nicknameError}</div>
       )}

       <input
         type="text"
         value={newNickname}
         onChange={(e) => setNewNickname(e.target.value)}
         placeholder={user?.username || ''}
         maxLength={30}
         className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center font-medium mb-3"
         autoFocus
       />

       <div className="flex gap-2">
         <button
           onClick={() => setEditingNickname(false)}
           className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-medium text-sm"
         >
           {t('common.cancel')}
         </button>
         <button
           onClick={async () => {
             if (newNickname.trim().length < 3) {
               setNicknameError(t('auth.nicknameTooShort'));
               setTimeout(() => setNicknameError(''), 3000);
               return;
             }
             try {
               setNicknameSaving(true);
               const { data } = await api.patch('/users/username', { username: newNickname.trim() });
               if (user) {
                 useAuthStore.getState().setUser({ ...user, username: data.username });
               }
               setEditingNickname(false);
               setNewNickname('');
             } catch (err: any) {
               setNicknameError(err.response?.data?.error || t('auth.nicknameTaken'));
               setTimeout(() => setNicknameError(''), 5000);
             } finally {
               setNicknameSaving(false);
             }
           }}
           disabled={nicknameSaving || newNickname.trim().length < 3}
           className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-medium text-sm disabled:opacity-50"
         >
           {nicknameSaving ? '...' : t('common.save')}
         </button>
       </div>
     </motion.div>
   </div>
 )}
 </>
 );
}
