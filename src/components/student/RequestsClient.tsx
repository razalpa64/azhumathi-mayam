'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, SendHorizonal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ResourceRequest, ResourceRequestStatus } from '@/types/database';
import { formatDate } from '@/lib/utils';

const TYPE_OPTIONS = [
  { value: 'notes', label: 'Notes' },
  { value: 'question_paper', label: 'Question paper' },
  { value: 'short_notes', label: 'Short notes' },
  { value: 'cheat_sheet', label: 'Cheat sheet' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'other', label: 'Something else' },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const STATUS_META: Record<
  ResourceRequestStatus,
  { label: string; variant: 'neutral' | 'warning' | 'burgundy' | 'success' | 'muted' }
> = {
  pending: { label: 'Waiting', variant: 'warning' },
  in_progress: { label: 'Being worked on', variant: 'burgundy' },
  fulfilled: { label: 'Done', variant: 'success' },
  rejected: { label: 'Closed', variant: 'muted' },
};

export function RequestsClient({ initialItems }: { initialItems: ResourceRequest[] }) {
  const [items, setItems] = useState(initialItems);
  const [type, setType] = useState<string>('notes');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJustSent(false);
    if (title.trim().length < 3) {
      setError('Tell us what you need — a few words is enough.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/student/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          request_type: type,
          title: title.trim(),
          subject_text: subject.trim() || null,
          details: details.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send your request. Try again.');
        return;
      }
      setItems((prev) => [data.item, ...prev]);
      setTitle('');
      setSubject('');
      setDetails('');
      setType('notes');
      setJustSent(true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-line-strong bg-canvas px-3.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60';

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Ask for something */}
      <form
        onSubmit={handleSubmit}
        className="h-fit space-y-4 rounded-xl border border-line bg-canvas p-5 sm:p-6 lg:col-span-5 lg:rounded-[26px] lg:p-7"
      >
        <div>
          <h2 className="text-base font-semibold text-charcoal">Ask for something</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Missing notes for a module? A paper from a year you can’t find? Tell us — we read
            every request.
          </p>
        </div>

        {justSent ? (
          <p role="status" className="flex items-start gap-2.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-3 text-[13px] text-[#166534]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Got it. Your request is in the list below — we’ll update its status here.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[13px] text-[#991B1B]">
            {error}
          </p>
        ) : null}

        <div>
          <label htmlFor="req-type" className="mb-1.5 block text-xs font-semibold text-charcoal">
            What do you need?
          </label>
          <select
            id="req-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={sending}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="req-title" className="mb-1.5 block text-xs font-semibold text-charcoal">
            What exactly? <span className="text-burgundy">*</span>
          </label>
          <input
            id="req-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={sending}
            maxLength={200}
            placeholder="e.g. Module 4 short notes"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="req-subject" className="mb-1.5 block text-xs font-semibold text-charcoal">
            Subject (if any)
          </label>
          <input
            id="req-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            maxLength={160}
            placeholder="e.g. CST201 Data Structures"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="req-details" className="mb-1.5 block text-xs font-semibold text-charcoal">
            Anything else? <span className="font-normal text-muted">(exam date helps)</span>
          </label>
          <textarea
            id="req-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={sending}
            maxLength={1500}
            rows={4}
            placeholder="Topics to cover, the year of the paper, when your exam is…"
            className="w-full resize-none rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-burgundy text-sm font-semibold text-canvas transition-colors hover:bg-burgundy-dark disabled:opacity-60 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
          <span>{sending ? 'Sending…' : 'Send request'}</span>
        </button>
      </form>

      {/* My requests */}
      <section className="lg:col-span-7">
        <h2 className="text-base font-semibold text-charcoal">
          Your requests{' '}
          <span className="font-normal text-muted">({items.length})</span>
        </h2>

        {items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-neutral-soft/50 px-5 py-10 text-center">
            <p className="text-sm font-medium text-charcoal">Nothing requested yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
              When you ask for something, it shows up here so you can see when it’s done.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => {
              const st = STATUS_META[item.status];
              return (
                <li key={item.id} className="rounded-xl border border-line bg-canvas p-4.5 sm:p-5 lg:rounded-[22px] lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-muted">
                        {TYPE_LABELS[item.request_type] || 'Request'} · {formatDate(item.created_at)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold leading-snug text-charcoal">
                        {item.title}
                      </h3>
                      {item.subject_text ? (
                        <p className="mt-0.5 text-xs text-muted">{item.subject_text}</p>
                      ) : null}
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  {item.details ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted">{item.details}</p>
                  ) : null}
                  {item.admin_note ? (
                    <p className="mt-3 rounded-lg bg-burgundy-tint px-3 py-2 text-xs leading-relaxed text-charcoal">
                      <span className="font-semibold text-burgundy">Reply: </span>
                      {item.admin_note}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
