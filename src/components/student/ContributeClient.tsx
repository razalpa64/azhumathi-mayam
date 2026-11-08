'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn, formatDate } from '@/lib/utils';
import type { MaterialSubmission } from '@/types/database';

interface ContributeClientProps {
  subjects: { id: string; subject_code: string; name: string }[];
  categories: { id: string; name: string }[];
  initialSubmissions: MaterialSubmission[];
  hasAcademicSetup: boolean;
}

const FILE_TYPES = ['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER'] as const;

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15';

const STATUS_META = {
  pending: { label: 'Waiting for review', icon: Clock3, badge: 'warning' as const },
  approved: { label: 'Live in library', icon: CheckCircle2, badge: 'success' as const },
  rejected: { label: 'Not accepted', icon: XCircle, badge: 'neutral' as const },
};

export function ContributeClient({
  subjects,
  categories,
  initialSubmissions,
  hasAcademicSetup,
}: ContributeClientProps) {
  const [submissions, setSubmissions] = useState<MaterialSubmission[]>(initialSubmissions);
  const [subjectId, setSubjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [fileType, setFileType] = useState<string>('PDF');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch('/api/student/submissions', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.items || []);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/student/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          subject_id: subjectId,
          category_id: categoryId,
          title,
          description: description || null,
          google_drive_share_url: driveUrl,
          file_type: fileType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'That upload did not go through. Please try again.');
        return;
      }
      setSuccess('Uploaded! An admin will review it — you’ll be notified when it goes live.');
      setTitle('');
      setDescription('');
      setDriveUrl('');
      await refresh();
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(id: string) {
    if (withdrawingId) return;
    setWithdrawingId(id);
    try {
      const res = await fetch(`/api/student/submissions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setSubmissions((items) => items.filter((s) => s.id !== id));
      }
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <section className="rounded-[24px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy-tint text-burgundy">
            <UploadCloud className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-[15px] font-semibold text-charcoal">Share a material</h2>
        </div>

        <div className="mt-4 flex gap-2.5 rounded-2xl bg-burgundy-tint/70 p-4 text-[13px] leading-relaxed text-charcoal">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
          <p>
            In Google Drive, set the file to{' '}
            <strong>“Anyone with the link can view”</strong>, copy the sharing
            link, and paste it below. Links that need permission can’t be
            published.
          </p>
        </div>

        {!hasAcademicSetup ? (
          <p className="mt-4 rounded-2xl border border-line bg-canvas p-4 text-sm text-muted">
            Finish setting up your course and semester in your profile first —
            contributions are tied to your subjects.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-charcoal">Subject</span>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pick the subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_code} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-charcoal">Material type</span>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">What is it?</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-charcoal">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Operating Systems — Module 3 notes (full)"
                maxLength={200}
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Google Drive sharing link
                </span>
                <input
                  required
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/…"
                  inputMode="url"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-charcoal">File type</span>
                <select value={fileType} onChange={(e) => setFileType(e.target.value)} className={inputClass}>
                  {FILE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-charcoal">
                Short description <span className="font-normal text-muted">(optional)</span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does it cover? Which modules or topics?"
                maxLength={1500}
                rows={3}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-charcoal outline-none transition-colors focus:border-burgundy-border focus:ring-2 focus:ring-burgundy/15"
              />
            </label>

            {error ? (
              <p role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
                {error}
              </p>
            ) : null}
            {success ? (
              <p role="status" className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-[13px] font-medium text-[#065F46]">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-white shadow-[0_12px_22px_-12px_rgba(121,0,0,0.8)] transition-all hover:bg-burgundy-dark active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Submit for review
            </button>
          </form>
        )}
      </section>

      {/* My uploads */}
      <section className="rounded-[24px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
        <h2 className="text-[15px] font-semibold text-charcoal">My uploads</h2>
        {submissions.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Nothing yet. Your first upload could be the note your whole class
            is searching for the night before the exam.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {submissions.map((s) => {
              const meta = STATUS_META[s.status];
              const StatusIcon = meta.icon;
              return (
                <li key={s.id} className="flex items-start gap-3 py-3.5">
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      s.status === 'approved'
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : s.status === 'rejected'
                          ? 'bg-[#FEF2F2] text-[#DC2626]'
                          : 'bg-[#FFFBEB] text-[#D97706]'
                    )}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {s.subject ? `${s.subject.subject_code} — ${s.subject.name}` : 'Subject'}
                      {s.category ? ` · ${s.category.name}` : ''} · {formatDate(s.created_at)}
                    </p>
                    {s.status === 'rejected' && s.admin_note ? (
                      <p className="mt-1 text-xs leading-relaxed text-[#991B1B]">
                        Admin note: {s.admin_note}
                      </p>
                    ) : null}
                    {s.status === 'approved' && s.created_resource_id ? (
                      <a
                        href={`/resources/${s.created_resource_id}`}
                        className="mt-1 inline-block text-xs font-semibold text-burgundy hover:underline"
                      >
                        View in library →
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    {s.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(s.id)}
                        disabled={withdrawingId === s.id}
                        aria-label={`Withdraw ${s.title}`}
                        title="Withdraw this upload"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-[#FEF2F2] hover:text-[#B91C1C] disabled:opacity-40 cursor-pointer"
                      >
                        {withdrawingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
