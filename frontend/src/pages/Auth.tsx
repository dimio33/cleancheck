import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

export default function Auth() {
 const [mode, setMode] = useState<'login' | 'register'>('login');
 const [email, setEmail] = useState('');
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const navigate = useNavigate();
 const { t } = useTranslation();
 const { login, register, loginAsGuest } = useAuthStore();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError('');

 // Client-side validation
 if (mode === 'register') {
 if (username.trim().length < 3) {
 setError(t('auth.errorUsernameShort'));
 setLoading(false);
 return;
 }
 if (password.length < 6) {
 setError(t('auth.errorPasswordShort'));
 setLoading(false);
 return;
 }
 }

 if (!email.includes('@') || !email.includes('.')) {
 setError(t('auth.errorEmailInvalid'));
 setLoading(false);
 return;
 }

 try {
 if (mode === 'login') {
 await login(email, password);
 } else {
 await register(username, email, password);
 }
 localStorage.setItem('cleancheck_onboarded', 'true');
 navigate('/');
 } catch (err: any) {
 const msg = err.response?.data?.error || 'Something went wrong';
 setError(msg);
 setTimeout(() => setError(''), 5000);
 } finally {
 setLoading(false);
 }
 };

 const handleGuest = () => {
 loginAsGuest();
 navigate('/');
 };

 return (
 <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 max-w-lg mx-auto w-full">
 {/* Logo */}
 <motion.div
 className="mb-10 text-center"
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <h1 className="text-2xl font-light tracking-tight bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
 CleanCheck
 </h1>
 </motion.div>

 {/* Tabs */}
 <div className="flex w-full max-w-xs mb-8">
 {(['login', 'register'] as const).map((m) => (
 <button
 key={m}
 onClick={() => { setMode(m); setError(''); }}
 className={`flex-1 pb-2.5 text-sm font-medium transition-all border-b-2 ${
 mode === m
 ? 'text-stone-800 border-teal-500'
 : 'text-stone-400 border-transparent'
 }`}
 >
 {t(`auth.${m}`)}
 </button>
 ))}
 </div>

 {/* Error message */}
 {error && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="w-full mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl"
 >
 <p className="text-sm text-rose-600 text-center">{error}</p>
 </motion.div>
 )}

 {/* Form */}
 <motion.form
 onSubmit={handleSubmit}
 className="w-full space-y-3"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 key={mode}
 >
 {mode === 'register' && (
 <input
 type="text"
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder={t('auth.username')}
 required
 className="w-full px-4 h-12 rounded-xl bg-stone-50 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
 />
 )}
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder={t('auth.email')}
 required
 className="w-full px-4 h-12 rounded-xl bg-stone-50 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
 />
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder={t('auth.password')}
 required
 className="w-full px-4 h-12 rounded-xl bg-stone-50 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
 />

 <div className="pt-1">
 <button
 type="submit"
 disabled={loading}
 className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
 >
 {loading ? t('common.loading') : t(`auth.${mode}`)}
 </button>
 </div>
 </motion.form>

 {/* Switch mode */}
 <p className="text-sm text-stone-400 mt-5">
 {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
 <button
 onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
 className="text-teal-600 font-medium"
 >
 {t(`auth.${mode === 'login' ? 'register' : 'login'}`)}
 </button>
 </p>

 {/* Guest */}
 <button
 onClick={handleGuest}
 className="mt-6 text-sm text-stone-400 font-medium hover:text-teal-600 transition-colors"
 >
 {t('auth.continueAsGuest')}
 </button>
 </div>
 );
}
