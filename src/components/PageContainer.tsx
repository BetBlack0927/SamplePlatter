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
        w-full max-w-[1600px] mx-auto
        ${flush ? "" : "px-4 sm:px-8 lg:px-12 xl:px-16"}
        py-10
        ${className}
      `}
    >
      {children}
    </main>
  );
}
