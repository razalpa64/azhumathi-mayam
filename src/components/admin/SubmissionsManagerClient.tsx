'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (tab === 'all' ? items : items.filter((i) => i.status === tab)),
    [items, tab]
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
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-canvas px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm font-semibold text-charcoal">
            {tab === 'pending'
              ? 'All caught up — no uploads waiting.'
              : 'Nothing here yet.'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            When students share notes from their Contribute page, they appear
            here for a one-click review.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-[22px] border border-line bg-canvas p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
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
      )}
    </div>
  );
}
