/** Skeleton loader for restaurant cards */
export function RestaurantCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-stone-900 rounded-2xl shadow-sm animate-pulse">
          <div className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-2" />
            <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton loader for score gauge */
export function ScoreSkeleton() {
  return (
    <div className="flex justify-center animate-pulse">
      <div className="w-32 h-32 rounded-full bg-stone-200 dark:bg-stone-700" />
    </div>
  );
}
