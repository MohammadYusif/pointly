/**
 * Static skeleton shown during hydration to prevent FOUC.
 * Matches the DashboardLayout structure (Navbar + content area).
 * Hidden via CSS once React hydrates and removes the `notready` class.
 */
export function AppSkeleton() {
  return (
    <div className="app-skeleton min-h-screen">
      {/* Navbar skeleton */}
      <header className="bg-card border-b h-14 md:h-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo placeholder */}
          <div className="h-8 w-28 rounded bg-muted animate-pulse" />
          {/* Nav items placeholder */}
          <div className="hidden md:flex items-center gap-4">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
          {/* Right side placeholder */}
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="py-4 md:py-8">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Page header */}
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          {/* Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 rounded-lg bg-card border animate-pulse" />
            <div className="h-28 rounded-lg bg-card border animate-pulse" />
            <div className="h-28 rounded-lg bg-card border animate-pulse" />
          </div>
          {/* Table/content area */}
          <div className="rounded-lg bg-card border p-6 space-y-4">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
