'use client';

import { useMemo, useState } from 'react';
import { Inbox, Loader2, Trash2 } from 'lucide-react';
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

export function RequestsManagerClient({
  initialItems,
}: {
  initialItems: ResourceRequest[];
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0 };
    for (const i of items) if (i.status === 'pending') c.pending += 1;
    return c;
  }, [items]);

  const visible = filter ? items.filter((i) => i.status === filter) : items;

  function draftFor(item: ResourceRequest) {
    return drafts[item.id] || { status: item.status, note: item.admin_note || '' };
  }

  async function save(item: ResourceRequest) {
    const draft = draftFor(item);
    setBusyId(item.id);
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
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setBusyId(null);
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
            onClick={() => setFilter(f.value)}
            className={cn(
              'inline-flex h-8.5 items-center rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer',
              filter === f.value
                ? 'border-burgundy bg-burgundy text-canvas'
                : 'border-line-strong bg-canvas text-charcoal hover:border-burgundy-border hover:text-burgundy'
            )}
          >
            {f.label}
            {f.value === 'pending' && counts.pending > 0 ? (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
                {counts.pending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter ? 'Nothing in this bucket' : 'No requests yet'}
          description={
            filter
              ? 'Requests you move here will show up in this list.'
              : 'When students ask for notes or papers, they land here.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const draft = draftFor(item);
            const dirty =
              draft.status !== item.status || draft.note !== (item.admin_note || '');
            return (
              <li key={item.id} className="rounded-xl border border-line bg-canvas p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
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
                      <p className="mt-0.5 text-xs font-medium text-burgundy">{item.subject_text}</p>
                    ) : null}
                    {item.details ? (
                      <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">
                        {item.details}
                      </p>
                    ) : null}
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
                  <Button
                    size="sm"
                    disabled={!dirty || busyId === item.id}
                    onClick={() => save(item)}
                  >
                    {busyId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
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
      )}
    </div>
  );
}
