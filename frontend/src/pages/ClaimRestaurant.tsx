import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../components/ui/Toast';
import api from '../services/api';

export default function ClaimRestaurant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const restaurantName = (location.state as any)?.restaurantName || '';

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect guests to auth
  if (!isAuthenticated || !user || user.id === 'guest') {
    navigate('/auth', { state: { returnTo: `/claim/${id}` } });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/restaurants/${id}/claim`, {
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.error || t('common.errorOccurred');
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-stone-500 text-sm mb-6 active:opacity-70 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t('common.back')}
        </button>

        <h1 className="text-xl font-bold text-stone-900 mb-1">{t('claim.title')}</h1>
        {restaurantName && (
          <p className="text-base font-medium text-teal-600 mb-2">{restaurantName}</p>
        )}
        <p className="text-sm text-stone-500 mb-6">{t('claim.desc')}</p>
      </div>

      {success ? (
        /* Success state */
        <div className="mx-5 claim-fade-in">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">{t('claim.success')}</p>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="mx-5 space-y-4 claim-fade-in">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">
              {t('claim.contactName')} *
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">
              {t('claim.contactEmail')} *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors"
              placeholder="info@restaurant.de"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">
              {t('claim.contactPhone')}
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors"
              placeholder="+49 123 456789"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !contactName.trim() || !contactEmail.trim()}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold text-[15px] shadow-[0_4px_12px_rgba(13,148,136,0.2)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? t('common.loading') : t('claim.submit')}
          </button>
        </form>
      )}

      <style>{`
        .claim-fade-in {
          animation: claimFadeIn 0.3s ease-out;
        }
        @keyframes claimFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
