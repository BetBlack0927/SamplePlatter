interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Removes horizontal padding — useful for full-bleed sections */
  flush?: boolean;
}

/**
 * Consistent page wrapper: max-width, horizontal padding, vertical spacing.
 */
export function PageContainer({
  children,
  className = "",
  flush = false,
}: PageContainerProps) {
  return (
    <main
      className={`
        mx-auto w-full max-w-5xl
        ${flush ? "" : "px-4 sm:px-6"}
        py-10
        ${className}
      `}
    >
      {children}
    </main>
  );
}
