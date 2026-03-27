import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import GuestRegistrationCTA from '../components/ui/GuestRegistrationCTA';
import RewardUnlockedOverlay from '../components/ui/RewardUnlockedOverlay';
import api from '../services/api';

interface Reward {
  id: string;
  type: string;
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  icon: string;
  unlock_level: number;
  unlock_type: string;
  unlock_threshold: number;
  voucher_value: number | null;
  voucher_currency: string;
  partner_name: string | null;
  levels_remaining?: number;
  claimed_at?: string;
  redeemed_at?: string | null;
  redeem_code?: string | null;
}

interface RewardsData {
  unlocked: Reward[];
  locked: Reward[];
  claimed: Reward[];
}

export default function Rewards() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [data, setData] = useState<RewardsData>({ unlocked: [], locked: [], claimed: [] });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [activeFrame, setActiveFrame] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unlockedReward, setUnlockedReward] = useState<{ name: string; icon?: string; type: string } | null>(null);

  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get('/rewards')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleClaim = async (rewardId: string) => {
    setClaiming(rewardId);
    try {
      const { data: result } = await api.post(`/rewards/${rewardId}/claim`);
      if (result.success) {
        // Find the reward that was just claimed for the overlay
        const claimed = data.unlocked.find(r => r.id === rewardId);
        if (claimed) {
          setUnlockedReward({
            name: getName(claimed),
            icon: claimed.icon,
            type: claimed.type,
          });
        }
        setToast(t('rewards.claimSuccess'));
        setTimeout(() => setToast(null), 3000);
        // Refresh rewards
        const { data: refreshed } = await api.get('/rewards');
        setData(refreshed);
      }
    } catch {
      // Error handled silently
    } finally {
      setClaiming(null);
    }
  };

  const handleActivate = async (rewardId: string) => {
    setActivating(rewardId);
    try {
      const { data: result } = await api.post(`/rewards/${rewardId}/activate`);
      if (result.success) {
        setActiveFrame(result.active_frame);
        setToast(lang === 'de' ? 'Rahmen aktiviert!' : 'Frame activated!');
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      // Error handled silently
    } finally {
      setActivating(null);
    }
  };

  const isFrameReward = (r: Reward) => r.name_en?.includes('Frame') || r.name_de?.includes('Rahmen');

  const getName = (r: Reward) => lang === 'de' ? r.name_de : r.name_en;
  const getDesc = (r: Reward) => lang === 'de' ? r.description_de : r.description_en;

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center px-5 pb-24 pt-8">
        {/* Guest CTA */}
        <GuestRegistrationCTA variant="card" className="w-full max-w-sm mb-6" />

        {/* Locked reward previews */}
        <div className="w-full max-w-sm">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
            {t('rewards.locked')}
          </h3>
          <div className="space-y-2.5 opacity-50 pointer-events-none">
            {[
              { lvl: 5, icon: '🥉', label: 'Bronze Frame' },
              { lvl: 10, icon: '🥈', label: 'Silver Frame' },
              { lvl: 15, icon: '🥇', label: 'Gold Frame + 5\u20AC Voucher' },
              { lvl: 25, icon: '💎', label: 'Diamond Frame + 10\u20AC Voucher' },
            ].map((reward) => (
              <div key={reward.lvl} className="bg-stone-50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-stone-200/60 flex items-center justify-center shrink-0 relative">
                    <span className="text-xl grayscale">{reward.icon}</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-stone-400 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-stone-500">{reward.label}</span>
                    <span className="text-[11px] text-stone-400 font-medium block">
                      {t('rewards.levelRequired', { level: reward.lvl })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            {t('rewards.title')}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.unlocked.length === 0 && data.claimed.length === 0 && data.locked.length === 0 ? (
        <div className="text-center py-12 px-5">
          <span className="text-4xl block mb-3">🎁</span>
          <p className="text-sm text-stone-400">{t('rewards.noRewards')}</p>
        </div>
      ) : (
        <>
          {/* Unlocked rewards */}
          {data.unlocked.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
                {t('rewards.unlocked')} ({data.unlocked.length})
              </h3>
              <div className="space-y-2.5">
                {data.unlocked.map((reward, i) => (
                  <motion.div
                    key={reward.id}
                    className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4 border border-emerald-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">{reward.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-stone-800">{getName(reward)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            Lv. {reward.unlock_threshold}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mb-2">{getDesc(reward)}</p>
                        <button
                          onClick={() => handleClaim(reward.id)}
                          disabled={claiming === reward.id}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-medium shadow-sm disabled:opacity-50"
                        >
                          {claiming === reward.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mx-2" />
                          ) : (
                            t('rewards.claim')
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Claimed rewards */}
          {data.claimed.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
                {t('rewards.claimed')} ({data.claimed.length})
              </h3>
              <div className="space-y-2.5">
                {data.claimed.map((reward, i) => (
                  <motion.div
                    key={reward.id}
                    className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-4 border border-teal-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 relative">
                        <span className="text-xl">{reward.icon}</span>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-stone-800">{getName(reward)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                            {t('rewards.claimed')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">{getDesc(reward)}</p>
                        {reward.redeem_code && (
                          <div className="mt-2 px-3 py-1.5 bg-stone-50 rounded-lg inline-block">
                            <span className="text-[10px] text-stone-400 block">{t('rewards.redeemCode')}</span>
                            <span className="text-sm font-mono font-semibold text-stone-700">{reward.redeem_code}</span>
                          </div>
                        )}
                        {isFrameReward(reward) && (
                          <button
                            onClick={() => handleActivate(reward.id)}
                            disabled={activating === reward.id}
                            className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              activeFrame && reward.name_en?.toLowerCase().includes(activeFrame)
                                ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300'
                                : 'bg-stone-100 text-stone-600 hover:bg-teal-50 hover:text-teal-600'
                            }`}
                          >
                            {activating === reward.id ? (
                              <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-2" />
                            ) : activeFrame && reward.name_en?.toLowerCase().includes(activeFrame) ? (
                              <span>✓ {lang === 'de' ? 'Aktiv' : 'Active'}</span>
                            ) : (
                              <span>{lang === 'de' ? 'Aktivieren' : 'Activate'}</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Locked rewards */}
          {data.locked.length > 0 && (
            <div className="px-5 mb-6">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-3">
                {t('rewards.locked')} ({data.locked.length})
              </h3>
              <div className="space-y-2.5">
                {data.locked.map((reward, i) => (
                  <motion.div
                    key={reward.id}
                    className="bg-stone-50 rounded-2xl p-4 opacity-70"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.7, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-stone-200/60 flex items-center justify-center shrink-0 relative">
                        <span className="text-xl grayscale">{reward.icon}</span>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-stone-400 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-stone-500 block">{getName(reward)}</span>
                        <p className="text-xs text-stone-400 mb-1">{getDesc(reward)}</p>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {t('rewards.levelsRemaining', { count: reward.levels_remaining })} — {t('rewards.levelRequired', { level: reward.unlock_threshold })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Partner rewards promo */}
          <div className="px-5 mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 text-center border border-amber-100">
              <span className="text-3xl block mb-2">🍽️</span>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">{t('rewards.partnerRewards')}</h3>
              <p className="text-xs text-amber-600">{t('rewards.partnerRewardsDesc')}</p>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 bg-stone-800 text-white rounded-xl shadow-lg text-sm font-medium z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {toast}
        </motion.div>
      )}

      {/* Reward Unlocked Overlay */}
      {unlockedReward && (
        <RewardUnlockedOverlay
          reward={unlockedReward}
          onClose={() => setUnlockedReward(null)}
        />
      )}
    </div>
  );
}
