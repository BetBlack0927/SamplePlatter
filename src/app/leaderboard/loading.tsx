export default function LeaderboardLoading() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8">
      <div className="space-y-5">
        {/* Header placeholder */}
        <div className="pb-2 border-b border-border">
          <div className="h-5 w-32 bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
          <div className="h-3 w-24 bg-surface animate-pulse mt-1" style={{ borderRadius: 'var(--radius-minimal)' }} />
        </div>

        {/* Content placeholder */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-surface border border-border animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
            ))}
          </div>
          <div className="lg:w-[28%] space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-surface border border-border animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
