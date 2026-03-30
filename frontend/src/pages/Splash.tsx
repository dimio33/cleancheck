import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

const CRITERIA_ICONS = [
 { icon: '🧹', key: 'cleanliness' },
 { icon: '👃', key: 'smell' },
 { icon: '🧻', key: 'supplies' },
 { icon: '🔧', key: 'maintenance' },
 { icon: '✨', key: 'ambiente' },
 { icon: '♿', key: 'accessibility' },
];

const FEATURE_PILLS = [
 { emoji: '🧹', label: '6 Kriterien' },
 { emoji: '📍', label: 'In deiner Nähe' },
 { emoji: '🏆', label: 'XP & Rewards' },
];

const cardStagger = {
 hidden: { opacity: 0 },
 visible: {
   transition: { staggerChildren: 0.05 },
 },
};

const cardItem = {
 hidden: { opacity: 0, y: 12, scale: 0.95 },
 visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Splash() {
 const [step, setStep] = useState(0);
 const navigate = useNavigate();
 const { t } = useTranslation();
 const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

 const handleFinish = () => {
 localStorage.setItem('cleancheck_onboarded', 'true');
 navigate('/');
 };

 // Auto-skip splash after 30 seconds of inactivity
 useEffect(() => {
 const timer = setTimeout(() => {
 loginAsGuest();
 localStorage.setItem('cleancheck_onboarded', 'true');
 navigate('/');
 }, 30000);
 return () => clearTimeout(timer);
 }, [navigate, loginAsGuest]);

 const handleGuestContinue = () => {
 loginAsGuest();
 handleFinish();
 };

 const slides = [
 // Slide 1: Hero — logo, heading, feature pills, subtle gradient
 <motion.div
 key="slide1"
 className="relative flex flex-col items-center justify-center h-full px-8"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
 {/* Subtle bottom gradient */}
 <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-teal-50/30 to-transparent" />

 {/* Logo with float animation */}
 <motion.img
 src="/logo.png"
 alt="CleanCheck"
 className="w-[120px] h-[120px] rounded-3xl shadow-lg mb-6"
 animate={{ y: [0, -14, 0] }}
 transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
 />

 <h1 className="text-xl font-bold tracking-tight text-stone-900 whitespace-pre-line leading-tight text-center">
 {t('splash.slide1Title')}
 </h1>
 <div className="w-12 h-0.5 bg-teal-600 rounded-full mt-5 mb-5" />
 <p className="text-stone-500 text-center max-w-xs text-sm leading-relaxed">
 {t('splash.slide1Desc')}
 </p>

 {/* Feature pills */}
 <motion.div
 className="flex gap-2 mt-6"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3, duration: 0.4 }}
 >
 {FEATURE_PILLS.map((pill) => (
 <span
   key={pill.label}
   className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium"
 >
   {pill.emoji} {pill.label}
 </span>
 ))}
 </motion.div>
 </motion.div>,

 // Slide 2: How it works — 2-column card grid with stagger
 <motion.div
 key="slide2"
 className="flex flex-col items-center justify-center h-full px-6"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
 <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-5">
 {t('splash.slide2Title')}
 </h2>
 <motion.div
 className="w-full max-w-sm grid grid-cols-2 gap-2.5"
 variants={cardStagger}
 initial="hidden"
 animate="visible"
 >
 {CRITERIA_ICONS.map((c) => (
 <motion.div
   key={c.key}
   variants={cardItem}
   className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm p-3 border border-stone-100/60"
 >
   <span className="text-xl shrink-0">{c.icon}</span>
   <span className="text-sm font-medium text-stone-700 leading-tight">
     {t(`splash.criteria.${c.key}`)}
   </span>
 </motion.div>
 ))}
 </motion.div>
 <p className="text-stone-500 max-w-xs text-center mt-5 text-sm leading-relaxed">
 {t('splash.slide2Desc')}
 </p>
 </motion.div>,

 // Slide 3: Join — social proof avatars, register / guest
 <motion.div
 key="slide3"
 className="flex flex-col items-center justify-center h-full px-8"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
 {/* Social proof avatars */}
 <motion.div
 className="flex flex-col items-center mb-6"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.15, duration: 0.4 }}
 >
 <div className="flex -space-x-3 mb-2.5">
   <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-base">😊</div>
   <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-base">🧑‍🍳</div>
   <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-base">⭐</div>
 </div>
 <p className="text-xs font-medium text-teal-700">1.247 Hygiene-Helden dabei</p>
 </motion.div>

 <h2 className="text-xl font-bold tracking-tight text-stone-900 mb-2 text-center">
 {t('splash.slide3Title')}
 </h2>
 <p className="text-stone-500 mb-8 max-w-xs text-center text-sm leading-relaxed">
 {t('splash.slide3Desc')}
 </p>
 <button
 onClick={() => { handleFinish(); navigate('/auth'); }}
 className="w-full max-w-xs py-3.5 rounded-xl bg-teal-600 text-white font-medium active:scale-95 transition-transform"
 >
 {t('splash.getStarted')}
 </button>
 <button
 onClick={handleGuestContinue}
 className="mt-4 text-stone-400 text-xs font-medium hover:text-teal-600 transition-colors active:scale-95 transition-transform"
 >
 {t('splash.continueAsGuest')}
 </button>
 <p className="mt-2 text-xs text-stone-300">{t('splash.noAccountNeeded')}</p>
 </motion.div>,
 ];

 return (
 <div className="fixed inset-0 bg-[#FAFAF9] z-50 flex flex-col">
 {/* Skip button */}
 {step < 2 && (
 <div className="flex justify-end p-5">
 <button
 onClick={handleGuestContinue}
 className="text-xs text-stone-400 font-medium tracking-wide hover:text-stone-500 transition-colors"
 >
 {t('splash.skip')}
 </button>
 </div>
 )}

 {/* Slides — swipeable */}
 <motion.div
 className="flex-1 overflow-hidden touch-pan-y"
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.3}
 onDragEnd={(_e, info) => {
 if (info.offset.x < -60 && step < 2) setStep((s) => s + 1);
 if (info.offset.x > 60 && step > 0) setStep((s) => s - 1);
 }}
 >
 <AnimatePresence mode="wait">
 {slides[step]}
 </AnimatePresence>
 </motion.div>

 {/* Dots + Next */}
 <div className="flex flex-col items-center gap-5 pb-12 px-8">
 {/* Dot indicators */}
 <div className="flex gap-2">
 {[0, 1, 2].map((i) => (
 <motion.div
 key={i}
 className="rounded-full h-1.5"
 animate={{
 width: i === step ? 24 : 6,
 backgroundColor: i === step ? '#0D9488' : '#D6D3D1',
 }}
 transition={{ type: 'spring', stiffness: 400, damping: 25 }}
 />
 ))}
 </div>

 {/* Next button (not on last slide) */}
 {step < 2 && (
 <button
 onClick={() => setStep((s) => s + 1)}
 className="w-full max-w-xs py-3.5 rounded-xl bg-teal-600 text-white font-medium active:scale-95 transition-transform"
 >
 {t('splash.next')}
 </button>
 )}
 </div>
 </div>
 );
}
