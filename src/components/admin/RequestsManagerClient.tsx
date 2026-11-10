'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Inbox, Loader2, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ResourceRequest, ResourceRequestStatus } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  notes: 'Notes',
  question_paper: 'Question paper',
  short_notes: 'Short notes',
  cheat_sheet: 'Cheat sheet',
  syllabus: 'Syllabus',
  other: 'Something else',
};

const STATUS_META: Record<
  ResourceRequestStatus,
  { label: string; variant: 'neutral' | 'warning' | 'burgundy' | 'success' | 'muted' }
> = {
  pending: { label: 'Waiting', variant: 'warning' },
  in_progress: { label: 'Being worked on', variant: 'burgundy' },
  fulfilled: { label: 'Done', variant: 'success' },
  rejected: { label: 'Closed', variant: 'muted' },
};

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Waiting' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'fulfilled', label: 'Done' },
  { value: 'rejected', label: 'Closed' },
];

const BULK_CHOICES: { value: ResourceRequestStatus; label: string }[] = [
  { value: 'in_progress', label: 'Being worked on' },
  { value: 'fulfilled', label: 'Done — it’s live' },
  { value: 'rejected', label: 'Closed' },
  { value: 'pending', label: 'Back to waiting' },
];

const PAGE_SIZE = 20;

/**
 * The list is paged and searched on the server. It used to be one hard
 * `limit(200)` fetched on the server, so anything older than the newest two
 * hundred requests simply did not exist in the console.
 */
export function RequestsManagerClient({ initialPending = 0 }: { initialPending?: number }) {
  const [items, setItems] = useState<ResourceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(initialPending);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ResourceRequestStatus>('fulfilled');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});

  // Typing shouldn't fire a query per keystroke; a filter change jumps to page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(text.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (debounced) sp.set('q', debounced);
      if (filter) sp.set('status', filter);
      sp.set('page', String(page));
      sp.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/admin/requests?${sp.toString()}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load requests.');

      setItems((data.items || []) as ResourceRequest[]);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPendingCount(data.pendingCount || 0);
      setSelected(new Set());
    } catch (err) {
      setError((err as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHref = useMemo(() => {
    const sp = new URLSearchParams();
    if (debounced) sp.set('q', debounced);
    if (filter) sp.set('status', filter);
    const qs = sp.toString();
    return `/api/admin/requests/export${qs ? `?${qs}` : ''}`;
  }, [debounced, filter]);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function draftFor(item: ResourceRequest) {
    return drafts[item.id] || { status: item.status, note: item.admin_note || '' };
  }

  async function save(item: ResourceRequest) {
    const draft = draftFor(item);
    setBusyId(item.id);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: item.id,
          status: draft.status,
          admin_note: draft.note.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
        setDrafts((d) => {
          const next = { ...d };
          delete next[item.id];
          return next;
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice(data.error || 'That save failed. Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ResourceRequest) {
    if (!window.confirm(`Delete the request "${item.title}"?`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/requests?id=${item.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setTotal((value) => Math.max(0, value - 1));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function applyBulk() {
    if (selected.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ids: Array.from(selected), status: bulkStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That bulk update failed.');

      setNotice(
        `${data.updated} request${data.updated === 1 ? '' : 's'} moved to “${
          STATUS_META[bulkStatus].label
        }”.${data.moved < data.updated ? ' Students were only told about the ones that changed.' : ''}`
      );
      setSelected(new Set());
      await load();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  const selectClass =
    'h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={cn(
              'inline-flex h-8.5 items-center rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer',
              filter === f.value
                ? 'border-burgundy bg-burgundy text-canvas'
                : 'border-line-strong bg-canvas text-charcoal hover:border-burgundy-border hover:text-burgundy'
            )}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            ) : null}
          </button>
        ))}

        <label className="relative ml-auto w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search requests or a student…"
            aria-label="Search requests"
            className="h-8.5 w-full rounded-full border border-line-strong bg-canvas pl-9 pr-3 text-xs text-charcoal outline-none focus:border-burgundy focus:ring-2 focus:ring-burgundy/15"
          />
        </label>

        <a
          href={exportHref}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal transition-colors hover:border-burgundy-border hover:text-burgundy"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-burgundy-border bg-burgundy-tint px-4 py-2.5 text-[13px] font-medium text-charcoal"
        >
          {notice}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-line bg-canvas py-16 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={debounced ? 'No request matches that search' : filter ? 'Nothing in this bucket' : 'No requests yet'}
          description={
            debounced
              ? 'Try the student’s name or the subject instead.'
              : filter
                ? 'Requests you move here will show up in this list.'
                : 'When students ask for notes or papers, they land here.'
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-charcoal">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-line-strong accent-burgundy"
              />
              Select this page
            </label>
            <span>
              {total} request{total === 1 ? '' : 's'}
              {debounced || filter ? ' matching' : ''} · page {page} of {totalPages}
            </span>
          </div>

          <ul className="space-y-3">
            {items.map((item) => {
              const draft = draftFor(item);
              const dirty = draft.status !== item.status || draft.note !== (item.admin_note || '');
              const checked = selected.has(item.id);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-xl border bg-canvas p-5 transition-colors',
                    checked ? 'border-burgundy-border ring-1 ring-burgundy/15' : 'border-line'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.id)}
                        aria-label={`Select request ${item.title}`}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-burgundy"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted">
                          {TYPE_LABELS[item.request_type] || 'Request'} ·{' '}
                          {item.student?.full_name || 'Student'}
                          {item.student?.username ? ` (@${item.student.username})` : ''} ·{' '}
                          {formatDate(item.created_at)}
                        </p>
                        <h3 className="mt-1 text-[15px] font-semibold leading-snug text-charcoal">
                          {item.title}
                        </h3>
                        {item.subject_text ? (
                          <p className="mt-0.5 text-xs font-medium text-burgundy">
                            {item.subject_text}
                          </p>
                        ) : null}
                        {item.details ? (
                          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
                            {item.details}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant={STATUS_META[item.status].variant}>
                      {STATUS_META[item.status].label}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-2.5 border-t border-line pt-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted">Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [item.id]: { ...draftFor(item), status: e.target.value },
                          }))
                        }
                        className={selectClass}
                      >
                        <option value="pending">Waiting</option>
                        <option value="in_progress">Being worked on</option>
                        <option value="fulfilled">Done — it’s live</option>
                        <option value="rejected">Closed</option>
                      </select>
                    </div>
                    <div className="min-w-52 flex-1">
                      <label className="mb-1 block text-[11px] font-medium text-muted">
                        Reply to student (optional)
                      </label>
                      <input
                        value={draft.note}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [item.id]: { ...draftFor(item), note: e.target.value },
                          }))
                        }
                        maxLength={1000}
                        placeholder="e.g. Uploaded — check Short Notes"
                        className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none"
                      />
                    </div>
                    <Button size="sm" disabled={!dirty || busyId === item.id} onClick={() => save(item)}>
                      {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      <span>Save</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busyId === item.id}
                      aria-label="Delete request"
                      className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#991B1B] cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>
              <span className="text-xs font-medium text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      {/* Selection bar: move a pile at once instead of opening each card. */}
      {selected.size > 0 ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2.5 rounded-2xl border border-burgundy-border bg-canvas/95 px-4 py-3 shadow-[0_18px_40px_-24px_rgba(36,7,7,0.5)] backdrop-blur-md">
          <span className="text-[13px] font-semibold text-charcoal">
            {selected.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ResourceRequestStatus)}
            className={selectClass}
            aria-label="New status for the selected requests"
          >
            {BULK_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={applyBulk} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>Apply to {selected.size}</span>
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="cursor-pointer text-xs font-medium text-muted hover:text-charcoal"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
