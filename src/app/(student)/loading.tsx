/**
 * Shown the instant a student taps anything, while the page's data loads.
 * Shaped like the dashboard so the swap feels like the page settling in,
 * not a spinner. The shell (header, tabs, bottom nav) never unmounts.
 */
export default function StudentLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-7">
      {/* Hero block */}
      <div className="rounded-[32px] bg-burgundy/85 p-6 sm:p-8">
        <div className="skeleton-light h-5 w-48 rounded-full" />
        <div className="skeleton-light mt-5 h-8 w-64 max-w-full rounded-lg" />
        <div className="skeleton-light mt-3 h-4 w-80 max-w-full rounded" />
        <div className="skeleton-light mt-6 h-10 w-52 rounded-full" />
      </div>

      {/* Search pill */}
      <div className="skeleton h-12 rounded-full border border-line" />

      {/* Quick tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-[62px] rounded-[20px] border border-line" />
        ))}
      </div>

      {/* Section heading */}
      <div className="space-y-2 pt-2">
        <div className="skeleton h-5 w-44 rounded" />
        <div className="skeleton h-3.5 w-64 rounded" />
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[24px] border border-line bg-canvas p-5">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton mt-4 h-5 w-3/4 rounded" />
            <div className="skeleton mt-2 h-4 w-1/2 rounded" />
            <div className="skeleton mt-6 h-3.5 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
