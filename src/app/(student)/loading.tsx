/**
 * Shown the instant a student taps anything, while the page's data loads.
 * Shaped like the dashboard so the swap feels like the page settling in,
 * not a spinner. The shell (header, tabs, bottom nav) never unmounts.
 */
export default function StudentLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-7">
      {/* Hero block */}
      <div className="rounded-[32px] bg-burgundy/85 p-6 sm:p-8">
        <div className="h-5 w-48 rounded-full bg-white/25" />
        <div className="mt-5 h-8 w-64 max-w-full rounded-lg bg-white/30" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-white/20" />
        <div className="mt-6 h-10 w-52 rounded-full bg-white/40" />
      </div>

      {/* Search pill */}
      <div className="h-12 rounded-full border border-line bg-white" />

      {/* Quick tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[62px] rounded-[20px] border border-line bg-white" />
        ))}
      </div>

      {/* Section heading */}
      <div className="space-y-2 pt-2">
        <div className="h-5 w-44 rounded bg-neutral-inset" />
        <div className="h-3.5 w-64 rounded bg-neutral-inset/70" />
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[24px] border border-line bg-white p-5">
            <div className="h-5 w-16 rounded-full bg-burgundy/15" />
            <div className="mt-4 h-5 w-3/4 rounded bg-neutral-inset" />
            <div className="mt-2 h-4 w-1/2 rounded bg-neutral-inset/70" />
            <div className="mt-6 h-3.5 w-2/3 rounded bg-neutral-inset/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
