/**
 * Admin navigation placeholder: rendered instantly inside the shell
 * while a console page's data loads, so moving between sections feels
 * like the page settling in rather than a blank wait. Shaped like the
 * overview/list pages (title, stat cards, toolbar, table rows).
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-7">
      {/* Title block */}
      <div className="space-y-2.5">
        <div className="skeleton h-7 w-56 rounded-lg" />
        <div className="skeleton h-4 w-80 max-w-full rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-canvas p-5">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton mt-4 h-6 w-20 rounded" />
            <div className="skeleton mt-2 h-3.5 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="skeleton h-10 w-64 max-w-full rounded-full" />
        <div className="skeleton h-10 w-32 rounded-full" />
        <div className="skeleton ml-auto h-10 w-36 rounded-full" />
      </div>

      {/* Table rows */}
      <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
        <div className="skeleton h-11 w-full rounded-none" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-line px-5 py-4"
          >
            <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/5 rounded" />
              <div className="skeleton h-3 w-1/4 rounded" />
            </div>
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
