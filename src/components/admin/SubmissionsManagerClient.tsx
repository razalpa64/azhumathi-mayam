'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  CheckCheck,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import type { MaterialSubmission } from '@/types/database';

const TABS = [
  { value: 'pending', label: 'Waiting' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

export function SubmissionsManagerClient({
  initialItems,
}: {
  initialItems: MaterialSubmission[];
}) {
  const [items, setItems] = useState<MaterialSubmission[]>(initialItems);
  const [tab, setTab] = useState<TabValue>('pending');
  const [text, setText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // One approval publishes a material, so reviewing a whole batch one card at
  // a time was the slowest thing in the console.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const needle = text.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (tab !== 'all' && item.status !== tab) return false;
        if (!needle) return true;
        return [
          item.title,
          item.description,
          item.student?.full_name,
          item.student?.username,
          item.subject?.subject_code,
          item.subject?.name,
          item.category?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }),
    [items, tab, needle]
  );
  const pendingCount = useMemo(
    () => items.filter((i) => i.status === 'pending').length,
    [items]
  );

  async function moderate(item: MaterialSubmission, action: 'approve' | 'reject') {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: item.id,
          action,
          admin_note: notes[item.id]?.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'That action failed. Please try again.');
        return;
      }
      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: action === 'approve' ? 'approved' : 'rejected',
                created_resource_id: data.resourceId || i.created_resource_id,
              }
            : i
        )
      );
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const selectableIds = visible.filter((item) => item.status === 'pending').map((item) => item.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function moderateBulk(action: 'approve' | 'reject') {
    if (selected.size === 0 || bulkBusy) return;
    const ids = Array.from(selected);
    const verb = action === 'approve' ? 'Approve' : 'Reject';
    if (
      !window.confirm(
        `${verb} ${ids.length} upload${ids.length === 1 ? '' : 's'}?${
          action === 'approve' ? ' Each one is published straight away.' : ''
        }`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Ten at a time: every approval validates a Drive link and publishes a
      // resource, so a long batch would outlive the request.
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) batches.push(ids.slice(i, i + 10));

      let approved = 0;
      let rejected = 0;
      const failures: string[] = [];

      for (const batch of batches) {
        const res = await fetch('/api/admin/submissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ ids: batch, action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'That bulk review failed. Please try again.');
        }
        approved += data.approved || 0;
        rejected += data.rejected || 0;
        for (const result of (data.results || []) as {
          id: string;
          ok: boolean;
          status?: 'approved' | 'rejected';
          resourceId?: string;
          error?: string;
        }[]) {
          if (!result.ok) {
            failures.push(result.error || 'One upload could not be reviewed.');
            continue;
          }
          setItems((current) =>
            current.map((row) =>
              row.id === result.id
                ? {
                    ...row,
                    status: result.status || row.status,
                    created_resource_id: result.resourceId || row.created_resource_id,
                  }
                : row
            )
          );
        }
      }

      const done = approved + rejected;
      const parts = [
        approved > 0 ? `${approved} approved` : null,
        rejected > 0 ? `${rejected} rejected` : null,
      ].filter(Boolean);

      setNotice(
        done > 0
          ? `${parts.join(' · ')}${failures.length > 0 ? ` · ${failures.length} left alone` : ''}.`
          : 'Nothing was changed.'
      );
      if (failures.length > 0) setError(failures[0]);
      setSelected(new Set());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors cursor-pointer',
              tab === t.value
                ? 'bg-burgundy text-white'
                : 'border border-line bg-canvas text-muted hover:border-burgundy-border hover:text-burgundy'
            )}
          >
            {t.label}
            {t.value === 'pending' && pendingCount > 0 ? (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  tab === 'pending' ? 'bg-white text-burgundy' : 'bg-[#E5484D] text-white'
                )}
              >
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
            placeholder="Search uploads or a student…"
            aria-label="Search student uploads"
            className="h-9 w-full rounded-full border border-line bg-canvas pl-9 pr-3 text-xs text-charcoal outline-none focus:border-burgundy focus:ring-2 focus:ring-burgundy/15"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-burgundy-border bg-burgundy-tint px-4 py-2.5 text-[13px] font-medium text-charcoal"
        >
          {notice}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-canvas px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm font-semibold text-charcoal">
            {needle
              ? 'No upload matches that search.'
              : tab === 'pending'
                ? 'All caught up — no uploads waiting.'
                : 'Nothing here yet.'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            {needle
              ? 'Try the student’s name, the subject code or part of the title.'
              : 'When students share notes from their Contribute page, they appear here for a one-click review.'}
          </p>
        </div>
      ) : (
        <>
        {selectableIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-charcoal">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-line accent-burgundy"
              />
              Select all waiting here
            </label>
            <span>
              {selectableIds.length} waiting on this view · {selected.size} selected
            </span>
          </div>
        ) : null}
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-[22px] border border-line bg-canvas p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {item.status === 'pending' ? (
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      aria-label={`Select upload ${item.title}`}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-burgundy"
                    />
                  ) : (
                    <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                  )}
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-snug text-charcoal">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.subject ? (
                      <>
                        <span className="font-mono font-semibold text-burgundy">
                          {item.subject.subject_code}
                        </span>{' '}
                        — {item.subject.name}
                      </>
                    ) : (
                      'Subject removed'
                    )}
                    {item.category ? ` · ${item.category.name}` : ''} · {item.file_type} ·{' '}
                    {formatDate(item.created_at)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    by{' '}
                    <span className="font-semibold text-charcoal">
                      {item.student?.full_name || 'Student'}
                    </span>
                    {item.student?.username ? ` (@${item.student.username})` : ''}
                  </p>
                </div>
                </div>
                <Badge
                  variant={
                    item.status === 'approved'
                      ? 'success'
                      : item.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {item.status === 'approved'
                    ? 'Live'
                    : item.status === 'rejected'
                      ? 'Rejected'
                      : 'Waiting'}
                </Badge>
              </div>

              {item.description ? (
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                  {item.description}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={item.google_drive_share_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal transition-colors hover:bg-neutral-soft"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open the Drive file
                </a>

                {item.status === 'pending' ? (
                  <>
                    <input
                      value={notes[item.id] || ''}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [item.id]: e.target.value }))
                      }
                      placeholder="Note for the student (optional)"
                      maxLength={500}
                      className="h-9 min-w-52 flex-1 rounded-full border border-line bg-canvas px-3.5 text-xs font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15"
                    />
                    <button
                      type="button"
                      onClick={() => moderate(item, 'approve')}
                      disabled={busyId === item.id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-white transition-all hover:bg-burgundy-dark active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve & publish
                    </button>
                    <button
                      type="button"
                      onClick={() => moderate(item, 'reject')}
                      disabled={busyId === item.id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-4 text-xs font-semibold text-charcoal transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-60 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </>
                ) : item.status === 'approved' && item.created_resource_id ? (
                  <a
                    href={`/resources/${item.created_resource_id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-burgundy-tint px-3.5 text-xs font-semibold text-burgundy transition-colors hover:bg-burgundy-border/40"
                  >
                    View published material →
                  </a>
                ) : null}
              </div>

              {item.status !== 'pending' && item.admin_note ? (
                <p className="mt-3 rounded-xl bg-neutral-soft px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                  Admin note: {item.admin_note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        </>
      )}

      {selected.size > 0 ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2.5 rounded-2xl border border-burgundy-border bg-canvas/95 px-4 py-3 shadow-[0_18px_40px_-24px_rgba(36,7,7,0.5)] backdrop-blur-md">
          <span className="text-[13px] font-semibold text-charcoal">
            {selected.size} selected
          </span>
          <Button size="sm" onClick={() => moderateBulk('approve')} disabled={bulkBusy}>
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            <span>Approve {selected.size}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => moderateBulk('reject')}
            disabled={bulkBusy}
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject {selected.size}</span>
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
