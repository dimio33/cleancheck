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
 { icon: '♿', key: 'accessibility' },
];

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
 // Slide 1: Hero — elegant heading with gradient accent line
 <motion.div
 key="slide1"
 className="flex flex-col items-center justify-center h-full px-8"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
 <h1 className="text-xl font-bold tracking-tight text-stone-900 whitespace-pre-line leading-tight text-center">
 {t('splash.slide1Title')}
 </h1>
 <div className="w-12 h-0.5 bg-teal-600 rounded-full mt-5 mb-5" />
 <p className="text-stone-500 text-center max-w-xs text-sm leading-relaxed">
 {t('splash.slide1Desc')}
 </p>
 </motion.div>,

 // Slide 2: How it works — timeline-style vertical list
 <motion.div
 key="slide2"
 className="flex flex-col items-center justify-center h-full px-8"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
 <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-6">
 {t('splash.slide2Title')}
 </h2>
 <div className="w-full max-w-xs">
 {CRITERIA_ICONS.map((c, i) => (
 <div key={c.key} className="flex items-center gap-4">
 {/* Timeline connector */}
 <div className="flex flex-col items-center">
 <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-lg border border-stone-100">
 {c.icon}
 </div>
 {i < CRITERIA_ICONS.length - 1 && (
 <div className="w-px h-6 bg-stone-200" />
 )}
 </div>
 <span className="text-sm font-medium text-stone-700 pb-1">
 {t(`splash.criteria.${c.key}`)}
 </span>
 </div>
 ))}
 </div>
 <p className="text-stone-500 max-w-xs text-center mt-6 text-sm leading-relaxed">
 {t('splash.slide2Desc')}
 </p>
 </motion.div>,

 // Slide 3: Join — register / guest
 <motion.div
 key="slide3"
 className="flex flex-col items-center justify-center h-full px-8"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: 'easeOut' }}
 >
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
 className="mt-4 text-stone-400 text-sm font-medium hover:text-teal-600 transition-colors active:scale-95 transition-transform"
 >
 {t('splash.continueAsGuest')}
 </button>
 <p className="mt-2 text-xs text-stone-300">{t('splash.noAccountNeeded')}</p>
 </motion.div>,
 ];

 return (
 <div className="fixed inset-0 bg-white z-50 flex flex-col">
 {/* Skip button */}
 {step < 2 && (
 <div className="flex justify-end p-5">
 <button
 onClick={handleGuestContinue}
 className="text-xs text-stone-400 font-medium uppercase tracking-widest hover:text-stone-600 transition-colors"
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
 backgroundColor: i === step ? '#14B8A6' : '#D6D3D1',
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
