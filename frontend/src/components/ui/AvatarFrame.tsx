interface AvatarFrameProps {
  frame?: string | null; // 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary' | null
  size?: 'sm' | 'md' | 'lg'; // sm=36px, md=48px, lg=72px
  children: React.ReactNode;
}

export default function AvatarFrame({ frame, size = 'md', children }: AvatarFrameProps) {
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-[72px] h-[72px]',
  };

  const frameStyles: Record<string, string> = {
    bronze: 'ring-2 ring-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.3)]',
    silver: 'ring-2 ring-stone-400 shadow-[0_0_8px_rgba(168,162,158,0.3)]',
    gold: 'ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
    diamond: 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]',
    legendary: 'ring-2 ring-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.5)] animate-pulse',
  };

  const ringClass = frame && frameStyles[frame] ? frameStyles[frame] : '';

  return (
    <div className={`${sizeClasses[size]} rounded-full relative ${ringClass}`}>
      {children}
    </div>
  );
}
