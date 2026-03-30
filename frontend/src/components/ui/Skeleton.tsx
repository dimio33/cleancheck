/**
 * Skeleton loading components for CleanCheck
 * Uses the .skeleton-shimmer CSS class defined in index.css
 */

// ---------------------------------------------------------------------------
// Base Primitives
// ---------------------------------------------------------------------------

interface SkeletonBoxProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Rectangular skeleton block with shimmer */
export function SkeletonBox({ className = '', style }: SkeletonBoxProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      style={style}
    />
  );
}

/** Circular skeleton with shimmer */
export function SkeletonCircle({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Multi-line text skeleton */
export function SkeletonText({
  lines = 2,
  widths,
  lineHeight = 14,
  gap = 8,
  className = '',
}: {
  lines?: number;
  widths?: string[];
  lineHeight?: number;
  gap?: number;
  className?: string;
}) {
  const defaultWidths = ['75%', '50%', '90%', '60%', '40%'];
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer rounded"
          style={{
            height: lineHeight,
            width: widths?.[i] ?? defaultWidths[i % defaultWidths.length],
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restaurant Card Skeleton (kept for backward compat)
// ---------------------------------------------------------------------------

/** Skeleton loader for restaurant cards -- shimmer effect */
export function RestaurantCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 p-3.5 bg-white rounded-2xl shadow-sm">
          <div className="w-11 h-11 rounded-full skeleton-shimmer shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 skeleton-shimmer rounded w-3/4 mb-2" />
            <div className="h-2.5 skeleton-shimmer rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton loader for score gauge */
export function ScoreSkeleton() {
  return (
    <div className="flex justify-center">
      <div className="w-32 h-32 rounded-full skeleton-shimmer" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomeSkeleton
// ---------------------------------------------------------------------------

export function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50 pb-20">
      {/* Greeting area */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <SkeletonCircle size={44} />
        <div className="flex-1">
          <SkeletonBox className="h-4 w-32 mb-2" />
          <SkeletonBox className="h-3 w-48" />
        </div>
      </div>

      {/* CTA banner */}
      <div className="mx-4 mb-3">
        <SkeletonBox className="h-16 w-full rounded-2xl bg-stone-200/60" />
      </div>

      {/* Search bar */}
      <div className="mx-4 mb-4">
        <SkeletonBox className="h-11 w-full rounded-xl bg-stone-200/60" />
      </div>

      {/* Quick action buttons row */}
      <div className="flex justify-around px-6 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <SkeletonCircle size={48} />
            <SkeletonBox className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      {/* Map placeholder */}
      <div className="mx-4 mb-4">
        <SkeletonBox className="h-48 w-full rounded-2xl bg-stone-200/60" />
      </div>

      {/* Sort bar + search */}
      <div className="mx-4 mb-3 flex items-center gap-2">
        <SkeletonBox className="h-9 flex-1 rounded-lg" />
        <SkeletonBox className="h-9 w-9 rounded-lg" />
      </div>

      {/* Restaurant cards */}
      <div className="px-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 p-3.5 bg-white rounded-2xl shadow-sm"
          >
            {/* Score squircle */}
            <SkeletonBox className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <SkeletonBox className="h-3.5 w-3/4 mb-2" />
              <SkeletonBox className="h-2.5 w-1/2" />
            </div>
            {/* Chevron placeholder */}
            <SkeletonBox className="w-5 h-5 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RestaurantDetailSkeleton
// ---------------------------------------------------------------------------

export function RestaurantDetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Teal hero bar */}
      <div className="h-20 bg-teal-600/20 skeleton-shimmer" />

      {/* Score card overlapping hero */}
      <div className="mx-4 -mt-8 bg-white rounded-2xl shadow-md p-5">
        {/* Score circle */}
        <div className="flex justify-center mb-4">
          <SkeletonCircle size={72} />
        </div>
        {/* Criteria bars */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="h-3 w-24 shrink-0" />
              <SkeletonBox className="h-3 flex-1 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA button */}
      <div className="mx-4 mt-4">
        <SkeletonBox className="h-12 w-full rounded-xl bg-stone-200/60" />
      </div>

      {/* Reviews section */}
      <div className="px-4 mt-6">
        <SkeletonBox className="h-5 w-28 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <SkeletonCircle size={36} />
                <div className="flex-1">
                  <SkeletonBox className="h-3.5 w-28 mb-1.5" />
                  <SkeletonBox className="h-2.5 w-20" />
                </div>
              </div>
              <SkeletonText lines={2} lineHeight={12} gap={6} widths={['90%', '60%']} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileSkeleton
// ---------------------------------------------------------------------------

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Gradient hero area */}
      <div className="h-36 skeleton-shimmer rounded-b-3xl" />

      {/* Avatar + name + level */}
      <div className="flex flex-col items-center -mt-12">
        <SkeletonCircle size={80} className="ring-4 ring-white" />
        <SkeletonBox className="h-5 w-36 mt-3 mb-1.5" />
        <SkeletonBox className="h-3.5 w-24" />
      </div>

      {/* Stats row */}
      <div className="flex justify-around mx-4 mt-6 bg-white rounded-2xl shadow-sm p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <SkeletonBox className="h-6 w-10" />
            <SkeletonBox className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* CTA card */}
      <div className="mx-4 mt-4">
        <SkeletonBox className="h-24 w-full rounded-2xl bg-stone-200/60" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrendingSkeleton
// ---------------------------------------------------------------------------

export function TrendingSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50 pb-20">
      {/* Title + description */}
      <div className="px-4 pt-6 pb-4">
        <SkeletonBox className="h-6 w-40 mb-2" />
        <SkeletonBox className="h-3.5 w-64" />
      </div>

      {/* Restaurant rows */}
      <div className="px-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 p-3.5 bg-white rounded-2xl shadow-sm"
          >
            <SkeletonCircle size={44} />
            <div className="flex-1 min-w-0">
              <SkeletonBox className="h-3.5 w-3/4 mb-2" />
              <SkeletonBox className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
