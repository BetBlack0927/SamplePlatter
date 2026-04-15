export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
        <p className="text-xs text-text-muted font-mono">Loading...</p>
      </div>
    </div>
  );
}
