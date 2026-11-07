/**
 * PostgREST silently caps every response (Supabase's default cap is
 * 1,000 rows). Any "load everything" query over a table that can
 * outgrow the cap MUST page with .range(), or rows past the cap simply
 * never arrive — no error, just missing data. This already bites:
 * `subjects` has 1,500+ rows, so an unpaginated taxonomy fetch drops
 * a third of the catalogue from every subject picker.
 *
 * `buildPage` must return a FRESH query builder for each page (the
 * builder mutates as .range() is applied) and the query MUST end its
 * ORDER BY in a unique column (e.g. `id`) so page boundaries are
 * stable even when the leading sort keys tie (branch copies of one
 * course share subject_code and name).
 */
export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  // Safety bound: 50 pages * pageSize is far beyond any table we page
  // this way, and guarantees termination if a backend ever ignores
  // .range() and keeps returning full pages.
  const MAX_PAGES = 50;
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
