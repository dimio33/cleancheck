import { useEffect } from 'react';
import './AnimatedSplash.css';

interface AnimatedSplashProps {
  onComplete: () => void;
}

export default function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 5200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-root">
      {/* Background glow */}
      <div className="splash-glow" />

      {/* Expanding rings */}
      <div className="splash-ring splash-ring-1" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-ring splash-ring-3" />

      {/* Logo container */}
      <div className="splash-logo-wrap">
        <img src="/logo.png" alt="WC-CleanCheck" className="splash-logo" />

        {/* Checkmark */}
        <div className="splash-check">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Sparkles */}
        <svg className="splash-star splash-star-1" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>
        <svg className="splash-star splash-star-2" width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>
        <svg className="splash-star splash-star-3" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>
        <svg className="splash-star splash-star-4" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>
        <svg className="splash-star splash-star-5" width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>
      </div>

      {/* Reflection */}
      <img src="/logo.png" alt="" className="splash-reflect" />

      {/* Text */}
      <div className="splash-textblock">
        <h1>WC-CleanCheck</h1>
        <p>Bewerte. Vergleiche. Entscheide besser.</p>
      </div>

      {/* Exit overlay */}
      <div className="splash-fadeout" />
    </div>
  );
}
