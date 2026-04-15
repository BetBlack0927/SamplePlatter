export default function ListenLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="h-4 w-20 bg-surface animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
              <div className="h-3 w-32 bg-surface animate-pulse mt-1" style={{ borderRadius: 'var(--radius-minimal)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Card placeholder */}
      <div className="py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-surface border border-border overflow-hidden" style={{ borderRadius: 'var(--radius-minimal)' }}>
            <div className="aspect-square bg-black animate-pulse" />
            <div className="px-6 py-4 space-y-3">
              <div className="h-6 w-3/4 bg-surface-elevated animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
              <div className="h-4 w-1/2 bg-surface-elevated animate-pulse" style={{ borderRadius: 'var(--radius-minimal)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
