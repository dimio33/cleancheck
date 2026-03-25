import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGeoStore } from '../stores/geoStore';
import { detectPlatform } from '../utils/platform';

export default function LocationPermission() {
 const navigate = useNavigate();
 const { t } = useTranslation();
 const { permissionState, requestPermission, setPermissionAsked } = useGeoStore();
 const platform = detectPlatform();

 const handleEnable = async () => {
 const result = await requestPermission();
 setPermissionAsked();
 if (result === 'granted') {
   navigate('/', { replace: true });
 } else {
   // Denied or unavailable — show instructions briefly, then navigate
   // Short delay so user sees the feedback before redirect
   setTimeout(() => navigate('/', { replace: true }), 1500);
 }
 };

 const handleSkip = () => {
 setPermissionAsked();
 navigate('/', { replace: true });
 };

 const instructionKey = `locationPermission.instructions.${
 platform === 'ios-safari' ? 'iosSafari' :
 platform === 'android-chrome' ? 'androidChrome' :
 platform === 'desktop-chrome' ? 'desktopChrome' :
 platform === 'desktop-safari' ? 'desktopSafari' :
 platform === 'firefox' ? 'firefox' : 'generic'
 }`;

 const isDenied = permissionState === 'denied';
 const isUnavailable = permissionState === 'unavailable';
 const showInstructions = isDenied || isUnavailable;

 return (
 <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 min-h-screen bg-white">
 <motion.div
 className="w-full max-w-sm text-center"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 >
 {/* Icon */}
 <motion.div
 className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
 showInstructions
 ? 'bg-amber-100'
 : 'bg-teal-600'
 }`}
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', delay: 0.2, damping: 12 }}
 >
 {showInstructions ? (
 <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
 </svg>
 ) : (
 <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 )}
 </motion.div>

 {/* Title */}
 <motion.h1
 className="text-xl font-bold tracking-tight text-stone-900 mb-2"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.3 }}
 >
 {showInstructions
 ? (isDenied ? t('locationPermission.deniedTitle') : t('locationPermission.unavailableTitle'))
 : t('locationPermission.title')
 }
 </motion.h1>

 {/* Description */}
 <motion.p
 className="text-sm text-stone-500 mb-6 leading-relaxed"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.4 }}
 >
 {showInstructions
 ? (isDenied ? t('locationPermission.deniedDescription') : t('locationPermission.unavailableDescription'))
 : t('locationPermission.description')
 }
 </motion.p>

 {/* Platform-specific instructions */}
 {showInstructions && (
 <motion.div
 className="bg-white rounded-2xl p-4 mb-6 text-left shadow-sm"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 >
 <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-2">
 {t('locationPermission.howToEnable')}
 </p>
 <p className="text-sm text-stone-700 leading-relaxed">
 {t(instructionKey)}
 </p>
 </motion.div>
 )}

 {/* Primary button */}
 <motion.button
 onClick={handleEnable}
 className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-medium active:scale-[0.98] transition-transform mb-3"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 whileTap={{ scale: 0.98 }}
 >
 {showInstructions ? t('locationPermission.tryAgain') : t('locationPermission.enableButton')}
 </motion.button>

 {/* Skip link */}
 <motion.button
 onClick={handleSkip}
 className="text-sm text-stone-400 font-medium active:text-stone-600 transition-colors"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.7 }}
 >
 {t('locationPermission.skipLink')}
 </motion.button>
 </motion.div>
 </div>
 );
}
