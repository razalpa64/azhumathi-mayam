/**
 * Shared material links are the most common way a student arrives here
 * (a WhatsApp forward), so the viewer gets its own skeleton: the tap
 * paints instantly instead of waiting on the server round trip.
 */
export default function ResourceViewerLoading() {
  return (
    <div aria-busy="true" aria-label="Loading material" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="skeleton h-4 w-28 rounded" />
      <div className="mt-5 space-y-2.5">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-7 w-3/4 max-w-md rounded-lg" />
        <div className="skeleton h-4 w-1/2 max-w-xs rounded" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <div className="skeleton h-10 w-32 rounded-full" />
        <div className="skeleton h-10 w-28 rounded-full" />
        <div className="skeleton h-10 w-10 rounded-full" />
      </div>
      <div className="skeleton mt-6 h-[56vh] min-h-72 rounded-[24px] border border-line" />
    </div>
  );
}
