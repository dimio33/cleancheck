import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { useShallow } from 'zustand/react/shallow';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/* ---------- SVG logos ---------- */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const AppleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

/* ---------- Inner component (needs GoogleOAuthProvider context) ---------- */
function AuthInner() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNickname, setShowNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, register, loginAsGuest, loginWithGoogle, loginWithApple } = useAuthStore(useShallow((s) => ({ login: s.login, register: s.register, loginAsGuest: s.loginAsGuest, loginWithGoogle: s.loginWithGoogle, loginWithApple: s.loginWithApple })));

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

  /* --- Google Sign-In --- */
  const googleLogin = GOOGLE_CLIENT_ID
    ? useGoogleLogin({
        onSuccess: async (response) => {
          try {
            setLoading(true);
            setError('');
            await loginWithGoogle(response.access_token);
            localStorage.setItem('cleancheck_onboarded', 'true');
            const currentUser = useAuthStore.getState().user;
            if (currentUser?.needs_nickname) {
              setShowNickname(true);
            } else {
              navigate('/');
            }
          } catch {
            setError(t('auth.socialLoginFailed'));
            setTimeout(() => setError(''), 5000);
          } finally {
            setLoading(false);
          }
        },
        onError: () => {
          setError(t('auth.socialLoginFailed'));
          setTimeout(() => setError(''), 5000);
        },
      })
    : null;

  /* --- Apple Sign-In --- */
  // Uses Apple JS SDK with popup flow (works in both web and Capacitor WebView)
  const appleAvailable = typeof window !== 'undefined' && !!(window as any).AppleID;

  const handleAppleLogin = async () => {
    const AppleID = (window as any).AppleID;
    if (!AppleID) {
      setError(t('auth.appleNotAvailable', 'Mit Apple anmelden ist noch nicht verfügbar'));
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Initialize Apple JS SDK with popup mode
      AppleID.auth.init({
        clientId: 'de.e-findo.cleancheck.web',
        scope: 'name email',
        redirectURI: 'https://wc-cleancheck.de',
        usePopup: true,
      });

      const response = await AppleID.auth.signIn();
      await loginWithApple(response.authorization.id_token, response.user);
      localStorage.setItem('cleancheck_onboarded', 'true');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.needs_nickname) {
        setShowNickname(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // User cancelled = don't show error
      const errStr = String(err?.error || err?.message || err || '');
      if (errStr.includes('popup_closed') || errStr.includes('cancel') || err?.code === 1001) {
        // User cancelled — silent
      } else {
        console.error('Apple Sign-In error:', err);
        setError(t('auth.appleSetupNeeded', 'Apple-Anmeldung wird eingerichtet. Bitte nutze vorerst E-Mail.'));
        setTimeout(() => setError(''), 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  const showSocialButtons = !!GOOGLE_CLIENT_ID || appleAvailable;

  // Nickname selection screen (after social login)
  const handleNicknameSubmit = async () => {
    if (nickname.trim().length < 3) {
      setError(t('auth.nicknameTooShort'));
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.patch('/users/username', { username: nickname.trim() });
      const user = useAuthStore.getState().user;
      if (user) {
        useAuthStore.getState().setUser({ ...user, username: data.username, needs_nickname: false });
      }
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || t('auth.nicknameTaken');
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (showNickname) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 max-w-lg mx-auto w-full">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎭</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('auth.nicknameTitle')}</h1>
            <p className="text-sm text-stone-500 leading-relaxed">{t('auth.nicknameDesc')}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl mb-4 text-center">{error}</div>
          )}

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('auth.nicknamePlaceholder')}
            maxLength={30}
            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-lg font-medium mb-4"
            autoFocus
          />

          <button
            onClick={handleNicknameSubmit}
            disabled={loading || nickname.trim().length < 3}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? '...' : t('auth.nicknameSubmit')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 max-w-lg mx-auto w-full">
      {/* Logo */}
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-light tracking-tight text-teal-600">
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
            className="w-full px-4 h-12 rounded-xl bg-stone-100 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.email')}
          required
          className="w-full px-4 h-12 rounded-xl bg-stone-100 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.password')}
          required
          className="w-full px-4 h-12 rounded-xl bg-stone-100 border-0 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? t('common.loading') : t(`auth.${mode}`)}
          </button>
        </div>
      </motion.form>

      {/* Social Login */}
      {showSocialButtons && (
        <div className="w-full mt-6">
          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 whitespace-nowrap">{t('auth.orContinueWith')}</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <div className="space-y-3">
            {/* Google Button */}
            {GOOGLE_CLIENT_ID && googleLogin && (
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-white border border-stone-200 flex items-center justify-center gap-3 text-sm font-medium text-stone-700 active:scale-[0.98] transition-transform disabled:opacity-50 hover:bg-stone-50"
              >
                <GoogleLogo />
                {t('auth.signInWithGoogle')}
              </button>
            )}

            {/* Apple Button */}
            {appleAvailable && (
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-black text-white flex items-center justify-center gap-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50 hover:bg-stone-900"
              >
                <AppleLogo />
                {t('auth.signInWithApple')}
              </button>
            )}
          </div>
        </div>
      )}

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

/* ---------- Wrapper with GoogleOAuthProvider ---------- */
export default function Auth() {
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthInner />
      </GoogleOAuthProvider>
    );
  }
  return <AuthInner />;
}
