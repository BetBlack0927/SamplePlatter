export default function ListenLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="mx-auto h-8 w-44 animate-pulse rounded-full bg-surface" />
      </div>

      <div className="shrink-0 px-4 pb-5 pt-8 text-center">
        <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-surface" />
        <div className="mx-auto mt-4 h-10 w-72 animate-pulse rounded-full bg-surface" />
        <div className="mx-auto mt-3 h-4 w-36 animate-pulse rounded-full bg-surface" />
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-2 gap-4 px-4 pb-6 sm:px-6 lg:px-8">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[28px] border border-border bg-surface/70 p-4 sm:p-5"
          >
            <div className="h-3 w-20 animate-pulse rounded-full bg-surface-elevated" />
            <div className="mt-4 aspect-square animate-pulse rounded-[24px] bg-surface-elevated" />
            <div className="mt-4 h-9 w-2/3 animate-pulse rounded-full bg-surface-elevated" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded-full bg-surface-elevated" />
            <div className="mt-6 h-16 animate-pulse rounded-[18px] bg-surface-elevated" />
            <div className="mt-5 flex gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-surface-elevated" />
              <div className="h-12 flex-1 animate-pulse rounded-full bg-surface-elevated" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
