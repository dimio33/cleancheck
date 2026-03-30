import { useTranslation } from 'react-i18next';
import './EmptyState.css';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateBaseProps {
  action?: EmptyStateAction;
  className?: string;
}

/* ─── SVG Illustrations (64x64, teal #0D9488 + stone #D6D3D1) ─── */

function SearchIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass circle */}
      <circle cx="28" cy="28" r="14" stroke="#0D9488" strokeWidth="2.5" fill="#0D948810" />
      {/* Handle */}
      <line x1="38.5" y1="38.5" x2="50" y2="50" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
      {/* X mark inside */}
      <line x1="22" y1="22" x2="34" y2="34" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="22" x2="22" y2="34" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardStarIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard body */}
      <rect x="14" y="10" width="36" height="46" rx="4" stroke="#0D9488" strokeWidth="2.5" fill="#0D948810" />
      {/* Clipboard clip */}
      <rect x="24" y="6" width="16" height="8" rx="3" stroke="#0D9488" strokeWidth="2" fill="#FAFAF9" />
      {/* Star */}
      <path
        d="M32 24l3.09 6.26L42 31.27l-5 4.87 1.18 6.86L32 39.77l-6.18 3.23L27 36.14l-5-4.87 6.91-1.01L32 24z"
        fill="#0D9488"
        opacity="0.2"
        stroke="#0D9488"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
      <circle cx="48" cy="14" r="1.5" fill="#0D9488" opacity="0.5" />
      <circle cx="52" cy="20" r="1" fill="#D6D3D1" />
      <circle cx="45" cy="8" r="1" fill="#D6D3D1" />
    </svg>
  );
}

function HeartPlusIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Heart */}
      <path
        d="M32 52s-18-10.77-18-23.08A10.46 10.46 0 0124.5 18C27.87 18 30.7 19.93 32 22.77 33.3 19.93 36.13 18 39.5 18A10.46 10.46 0 0150 28.92C50 41.23 32 52 32 52z"
        fill="#0D948815"
        stroke="#0D9488"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Plus sign */}
      <line x1="44" y1="12" x2="44" y2="24" stroke="#D6D3D1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="18" x2="50" y2="18" stroke="#D6D3D1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trophy cup */}
      <path
        d="M20 14h24v10c0 7.73-5.37 14-12 14s-12-6.27-12-14V14z"
        fill="#0D948815"
        stroke="#0D9488"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Left handle */}
      <path d="M20 18h-4a4 4 0 000 8h4" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
      {/* Right handle */}
      <path d="M44 18h4a4 4 0 010 8h-4" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
      {/* Stem */}
      <line x1="32" y1="38" x2="32" y2="48" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
      {/* Base */}
      <rect x="24" y="48" width="16" height="4" rx="2" stroke="#0D9488" strokeWidth="2" fill="#0D948810" />
      {/* Sparkles */}
      <circle cx="14" cy="10" r="1.5" fill="#0D9488" opacity="0.5" />
      <circle cx="50" cy="10" r="1.5" fill="#0D9488" opacity="0.5" />
      <circle cx="10" cy="16" r="1" fill="#D6D3D1" />
      <circle cx="54" cy="16" r="1" fill="#D6D3D1" />
    </svg>
  );
}

/* ─── Shared wrapper ─── */

function EmptyStateWrapper({ illustration, title, subtitle, action, className = '' }: {
  illustration: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: EmptyStateAction;
  className?: string;
}) {
  return (
    <div className={`empty-state-enter flex flex-col items-center justify-center py-12 text-center px-6 ${className}`}>
      <div className="mb-4">{illustration}</div>
      <p className="text-sm font-medium text-stone-600">{title}</p>
      {subtitle && (
        <p className="text-xs text-stone-400 mt-1.5 max-w-[260px] leading-relaxed">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(13,148,136,0.2)] active:scale-[0.97] transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ─── Variants ─── */

export function NoResults({ action, className }: EmptyStateBaseProps) {
  const { t } = useTranslation();
  return (
    <EmptyStateWrapper
      illustration={<SearchIllustration />}
      title={t('search.noResults')}
      subtitle={t('search.noResultsDesc')}
      action={action}
      className={className}
    />
  );
}

export function NoRatings({ action, className }: EmptyStateBaseProps) {
  return (
    <EmptyStateWrapper
      illustration={<ClipboardStarIllustration />}
      title="Noch keine Bewertungen"
      subtitle="Sei der Erste und bewerte dieses Restaurant!"
      action={action}
      className={className}
    />
  );
}

export function NoFavorites({ action, className }: EmptyStateBaseProps) {
  const { t } = useTranslation();
  return (
    <EmptyStateWrapper
      illustration={<HeartPlusIllustration />}
      title={t('profile.noSaved')}
      action={action}
      className={className}
    />
  );
}

export function EmptyLeaderboard({ action, className }: EmptyStateBaseProps) {
  return (
    <EmptyStateWrapper
      illustration={<TrophyIllustration />}
      title="Noch keine Rangliste"
      subtitle="Bewerte Restaurants um in der Rangliste aufzutauchen!"
      action={action}
      className={className}
    />
  );
}
