import { PageContainer } from "@/components/PageContainer";

export default function LeaderboardLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="h-4 w-72 max-w-[80vw]" />
          </div>

          <div
            className="flex gap-0.5 bg-surface border border-border overflow-hidden shrink-0"
            style={{ borderRadius: "var(--radius-minimal)" }}
          >
            <SkeletonBlock className="h-10 w-20 rounded-none" />
            <SkeletonBlock className="h-10 w-28 rounded-none" />
            <SkeletonBlock className="h-10 w-24 rounded-none" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 lg:max-w-[70%] min-w-0">
            <SectionHeaderSkeleton />
            <div className="space-y-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <LeaderboardRowSkeleton key={i} />
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[28%] shrink-0">
            <SectionHeaderSkeleton />
            <div className="space-y-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <ProducerRowSkeleton key={i} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-border">
      <div className="flex items-center gap-2.5">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-5 w-8" />
      </div>
    </div>
  );
}

function LeaderboardRowSkeleton() {
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

function ProducerRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 bg-surface border-l-2 border-l-transparent border-y border-y-transparent"
      style={{ borderRadius: "var(--radius-minimal)" }}
    >
      <SkeletonBlock className="h-4 w-4 shrink-0" />
      <SkeletonBlock className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonBlock className="h-4 w-24" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-3 w-14" />
        </div>
      </div>
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
