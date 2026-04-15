import { PageContainer } from "@/components/PageContainer";

export default function ProfileLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-start gap-4 sm:gap-5 pb-5 border-b border-border">
          <SkeletonBlock className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <SkeletonBlock className="h-7 w-40 sm:w-52" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
              <SkeletonBlock className="h-9 w-28 shrink-0" />
            </div>

            <SkeletonBlock className="h-4 w-full max-w-xl" />
            <SkeletonBlock className="h-4 w-3/4 max-w-lg" />

            <div className="flex gap-6 pt-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <SkeletonBlock className="h-6 w-12" />
                  <SkeletonBlock className="h-3 w-12" />
                </div>
              ))}
            </div>

            <SkeletonBlock className="h-3 w-28" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-border">
            <div className="flex items-center gap-2.5">
              <SkeletonBlock className="h-4 w-14" />
              <SkeletonBlock className="h-5 w-8" />
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 px-1 mb-1">
                  <SkeletonBlock className="h-3 w-12" />
                  <SkeletonBlock className="h-3 w-2" />
                  <SkeletonBlock className="h-3 w-28" />
                </div>
                <SubmissionRowSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function SubmissionRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 bg-surface border-l-2 border-l-transparent border-y border-y-transparent"
      style={{ borderRadius: "var(--radius-minimal)" }}
    >
      <SkeletonBlock className="h-4 w-4 shrink-0" />
      <SkeletonBlock className="h-7 w-7 shrink-0" />
      <div className="w-44 lg:w-48 shrink-0 min-w-0 space-y-2">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-3 w-36" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-px h-7">
        {Array.from({ length: 24 }, (_, i) => (
          <SkeletonWaveBar key={i} height={i % 4 === 0 ? 80 : i % 3 === 0 ? 55 : 35} />
        ))}
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="h-4 w-10" />
        <SkeletonBlock className="h-4 w-8" />
      </div>
      <SkeletonBlock className="hidden lg:block h-4 w-8 shrink-0" />
      <SkeletonBlock className="h-7 w-7 shrink-0" />
    </div>
  );
}

function SkeletonWaveBar({ height }: { height: number }) {
  return (
    <div
      className="flex-1 bg-surface-elevated animate-pulse"
      style={{
        height: `${height}%`,
        borderRadius: "var(--radius-minimal)",
      }}
    />
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`bg-surface-elevated animate-pulse ${className}`}
      style={{ borderRadius: "var(--radius-minimal)" }}
    />
  );
}
