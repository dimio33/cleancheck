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

  const handleChange = (newValue: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onChange(newValue);
  };

  return (
    <div className="mb-5 last:mb-2">
      {/* Header: icon + label left, value number right */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-stone-700">{label}</span>
        </div>
        <motion.span
          className={`text-xl font-bold ${colors.text}`}
          key={value}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          {value}
        </motion.span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${colors.track} 0%, ${colors.track} ${percentage}%, #E7E5E4 ${percentage}%, #E7E5E4 100%)`,
        }}
      />

      {/* Tick marks */}
      <div className="flex justify-between mt-1.5 px-[2px]">
        {[1, 2, 3, 4, 5].map((tick) => (
          <span
            key={tick}
            className={
              tick === value
                ? `text-[10px] font-bold ${colors.text}`
                : 'text-[9px] text-stone-300'
            }
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}
