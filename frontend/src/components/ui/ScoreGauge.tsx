import { motion } from 'framer-motion';

interface ScoreGaugeProps {
  score: number | null;
  size?: number | 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

const SIZE_MAP: Record<string, number> = { sm: 72, md: 120, lg: 160 };

export default function ScoreGauge({
  score,
  size = 120,
  strokeWidth,
  showLabel = true,
  animated = true,
}: ScoreGaugeProps) {
  const d = typeof size === 'string' ? (SIZE_MAP[size] ?? 120) : size;
  const sw = strokeWidth ?? (d <= 80 ? 3 : 4);
  const radius = (d - sw * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 10) * circumference : 0;

  const getGradientId = () => {
    if (score === null) return 'gray';
    if (score >= 8) return 'good';
    if (score >= 5) return 'mid';
    return 'bad';
  };

  // Scale font sizes proportionally
  const fontSize = d * 0.28;
  const subFontSize = d * 0.11;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: d, height: d }}>
        <svg width={d} height={d} className="-rotate-90">
          <defs>
            <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="gradient-mid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="gradient-bad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={d / 2}
            cy={d / 2}
            r={radius}
            fill="none"
            stroke="#F5F5F4"
            strokeWidth={sw}
          />
          {/* Score arc */}
          {score !== null && (
            <motion.circle
              cx={d / 2}
              cy={d / 2}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${getGradientId()})`}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: circumference - progress }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-light tracking-tight text-stone-800"
              style={{ fontSize }}
            >
              {score !== null ? score.toFixed(1) : '\u2014'}
            </span>
            {score !== null && (
              <span
                className="font-light text-stone-400"
                style={{ fontSize: subFontSize }}
              >
                /10
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
