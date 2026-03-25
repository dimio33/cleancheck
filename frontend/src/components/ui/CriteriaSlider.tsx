import { motion } from 'framer-motion';

interface CriteriaSliderProps {
  icon: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function CriteriaSlider({ icon, label, value, onChange }: CriteriaSliderProps) {
  const getValueColor = (v: number) => {
    if (v >= 4) return { bg: 'bg-emerald-50', text: 'text-emerald-600', track: '#10B981' };
    if (v >= 3) return { bg: 'bg-amber-50', text: 'text-amber-600', track: '#F59E0B' };
    return { bg: 'bg-rose-50', text: 'text-rose-600', track: '#F43F5E' };
  };

  const colors = getValueColor(value);
  const percentage = ((value - 1) / 4) * 100;

  return (
    <div className="py-4 border-b border-stone-50 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-stone-700">{label}</span>
        </div>
        <motion.div
          className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}
          key={value}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <span className={`text-sm font-semibold ${colors.text}`}>{value}</span>
        </motion.div>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${colors.track} 0%, ${colors.track} ${percentage}%, var(--slider-track, #E7E5E4) ${percentage}%, var(--slider-track, #E7E5E4) 100%)`,
        }}
      />
    </div>
  );
}
