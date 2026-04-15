export default function ProfileLoading() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8">
      <div className="space-y-6">
        {/* Header placeholder */}
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-surface-elevated border border-border animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
            <div className="h-4 w-24 bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
            <div className="h-12 w-full max-w-2xl bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
          </div>
        </div>

        {/* Stats placeholder */}
        <div className="flex gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 w-24 bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
          ))}
        </div>

        {/* Submissions placeholder */}
        <div className="space-y-2 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface border border-border animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
