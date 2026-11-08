'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Megaphone,
  Paperclip,
  Pin,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  Notice,
  NoticePriority,
  NoticeType,
  Programme,
  Semester,
  Specialization,
} from '@/types/database';
import { formatDate } from '@/lib/utils';

interface NoticesManagerClientProps {
  initialNotices: Notice[];
  programmes: Programme[];
  semesters: Semester[];
  specializations: Specialization[];
  initialNoticesEnabled: boolean;
}

export function NoticesManagerClient({
  initialNotices,
  programmes,
  semesters,
  specializations,
  initialNoticesEnabled,
}: NoticesManagerClientProps) {
  const router = useRouter();
  const [notices, setNotices] = useState(initialNotices);
  const [noticesEnabled, setNoticesEnabled] = useState(initialNoticesEnabled);
  const [togglingGlobal, setTogglingGlobal] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [noticeType, setNoticeType] = useState<NoticeType>('general');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [targetProgrammeId, setTargetProgrammeId] = useState('');
  const [targetSemesterId, setTargetSemesterId] = useState('');
  const [targetSpecializationId, setTargetSpecializationId] = useState('');

  // Semester/branch options belong to the chosen programme; choosing a
  // different programme resets them (both are optional narrowing).
  const programmeSemesters = semesters.filter(
    (s) => s.programme_id === targetProgrammeId
  );
  const programmeBranches = specializations.filter(
    (s) => s.programme_id === targetProgrammeId
  );

  function handleProgrammeChange(programmeId: string) {
    setTargetProgrammeId(programmeId);
    setTargetSemesterId('');
    setTargetSpecializationId('');
  }
  const [externalLink, setExternalLink] = useState('');
  const [externalLinkLabel, setExternalLinkLabel] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [pubStatus, setPubStatus] = useState<'published' | 'draft'>('published');

  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'pdf' | 'drive' | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleGlobalSection() {
    setTogglingGlobal(true);
    try {
      const next = !noticesEnabled;
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ notices_enabled: next }),
      });
      if (res.ok) {
        setNoticesEnabled(next);
        router.refresh();
      }
    } finally {
      setTogglingGlobal(false);
    }
  }

  async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/notices/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Attachment upload failed.');
        return;
      }
      setAttachmentUrl(data.attachmentUrl);
      setAttachmentType(data.attachmentType);
      setAttachmentName(data.attachmentName);
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleCreateNotice(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          notice_type: noticeType,
          priority,
          is_pinned: isPinned,
          target_programme_id: targetProgrammeId || null,
          target_semester_id: targetSemesterId || null,
          target_specialization_id: targetSpecializationId || null,
          attachment_url: attachmentUrl.trim() || null,
          attachment_type: attachmentUrl.trim() ? attachmentType || 'drive' : null,
          attachment_name: attachmentName.trim() || null,
          external_link: externalLink.trim() || null,
          external_link_label: externalLinkLabel.trim() || null,
          expiry_date: expiryDate || null,
          publication_status: pubStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not publish notice.');
        return;
      }

      setNotices((prev) => [data.notice, ...prev]);
      setTitle('');
      setDescription('');
      // Audience targeting resets to "everyone" so the next notice
      // never inherits a narrow semester/branch by accident.
      setTargetProgrammeId('');
      setTargetSemesterId('');
      setTargetSpecializationId('');
      setAttachmentUrl('');
      setAttachmentType(null);
      setAttachmentName('');
      setExternalLink('');
      setExternalLinkLabel('');
      setExpiryDate('');
      setIsPinned(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePin(notice: Notice) {
    const res = await fetch(`/api/admin/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ is_pinned: !notice.is_pinned }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotices((prev) => prev.map((n) => (n.id === notice.id ? data.notice : n)));
    }
  }

  async function handleToggleStatus(notice: Notice) {
    const next = notice.publication_status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/admin/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ publication_status: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotices((prev) => prev.map((n) => (n.id === notice.id ? data.notice : n)));
    }
  }

  async function handleDelete(notice: Notice) {
    if (!window.confirm(`Delete notice "${notice.title}"?`)) return;
    const res = await fetch(`/api/admin/notices/${notice.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.ok) {
      setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Master Global Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Homepage Notices & Academic Bulletins
          </h1>
          <p className="mt-1 text-sm text-muted">
            Publish exam schedules, assignment deadlines, and official notices to the student homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleGlobalSection}
          disabled={togglingGlobal}
          className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-xs font-semibold transition-colors cursor-pointer ${
            noticesEnabled
              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
              : 'border-line-strong bg-neutral-soft text-charcoal'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          <span>
            Homepage Notice Section: {noticesEnabled ? 'Enabled' : 'Disabled (Hidden)'}
          </span>
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Create Notice Form */}
        <form
          onSubmit={handleCreateNotice}
          className="lg:col-span-5 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
        >
          <h2 className="text-sm font-semibold text-charcoal">Create Announcement</h2>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., KTU S3 Regular Examination Timetable Released"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Description *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear dates, instructions, or syllabus guidance..."
              className="w-full rounded-md border border-line-strong bg-canvas p-2.5 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Notice Type</label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as NoticeType)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="general">General Announcement</option>
                <option value="exam">Exam Notification</option>
                <option value="assignment">Assignment Deadline</option>
                <option value="academic_update">Important Academic Update</option>
                <option value="material_update">Study Material Update</option>
                <option value="college">College Announcement</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NoticePriority)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Target Programme
              </label>
              <select
                value={targetProgrammeId}
                onChange={(e) => handleProgrammeChange(e.target.value)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="">All Students (Global)</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
              />
            </div>
          </div>

          {/* Optional narrowing: pick a semester and/or branch of the
              programme above and only those students are notified. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Semester <span className="font-normal text-muted">(optional)</span>
              </label>
              <select
                value={targetSemesterId}
                onChange={(e) => setTargetSemesterId(e.target.value)}
                disabled={!targetProgrammeId}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All semesters</option>
                {programmeSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Branch <span className="font-normal text-muted">(optional)</span>
              </label>
              <select
                value={targetSpecializationId}
                onChange={(e) => setTargetSpecializationId(e.target.value)}
                disabled={!targetProgrammeId}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All branches</option>
                {programmeBranches.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-1 text-[11px] leading-relaxed text-muted">
            {targetProgrammeId
              ? 'Leave semester and branch on “All” to notify the whole programme — or narrow it and only those students get the notification and push.'
              : 'Choose a programme first if you want to narrow the audience to one semester or branch.'}
          </p>

          {/* Image / PDF Upload or Attachment Link */}
          <div className="rounded-lg border border-line bg-neutral-soft p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal">
                Optional Image / PDF Attachment
              </span>
              <label className="inline-flex items-center gap-1 rounded border border-line-strong bg-canvas px-2 py-1 text-[11px] font-semibold text-charcoal hover:bg-neutral-inset cursor-pointer">
                {uploadingFile ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Paperclip className="h-3 w-3 text-burgundy" />
                )}
                <span>Upload Image / PDF</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleUploadAttachment}
                  className="sr-only"
                />
              </label>
            </div>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="Or paste attachment / Google Drive URL..."
              className="h-8 w-full rounded border border-line-strong bg-canvas px-2.5 text-xs"
            />
            {attachmentName ? (
              <p className="text-[11px] text-[#166534]">Attached: {attachmentName}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                External Link URL
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://ktu.edu.in/..."
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Link Label</label>
              <input
                type="text"
                value={externalLinkLabel}
                onChange={(e) => setExternalLinkLabel(e.target.value)}
                placeholder="View Circular"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded accent-burgundy"
              />
              <span>Pin to top of homepage</span>
            </label>

            <select
              value={pubStatus}
              onChange={(e) => setPubStatus(e.target.value as 'published' | 'draft')}
              className="h-8 rounded border border-line-strong bg-canvas px-2 text-xs"
            >
              <option value="published">Publish Now</option>
              <option value="draft">Save as Draft</option>
            </select>
          </div>

          <Button type="submit" size="sm" disabled={submitting} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>{submitting ? 'Saving...' : 'Save Announcement'}</span>
          </Button>
        </form>

        {/* Notices List */}
        <div className="lg:col-span-7 space-y-3">
          {notices.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements created yet"
              description="When no active notices exist, the homepage announcement section automatically hides so students never see an empty box."
            />
          ) : (
            notices.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-line bg-canvas p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {n.is_pinned ? <Badge variant="solid">Pinned</Badge> : null}
                    <Badge
                      variant={n.publication_status === 'published' ? 'success' : 'warning'}
                    >
                      {n.publication_status}
                    </Badge>
                    <Badge variant="neutral">{n.priority}</Badge>
                    {n.target_programme ? (
                      <Badge variant="burgundy">{n.target_programme.name}</Badge>
                    ) : (
                      <Badge variant="muted">Global</Badge>
                    )}
                    {n.target_semester ? (
                      <Badge variant="neutral">{n.target_semester.label}</Badge>
                    ) : null}
                    {n.target_specialization ? (
                      <Badge variant="neutral">
                        {n.target_specialization.name} ({n.target_specialization.code})
                      </Badge>
                    ) : null}
                  </div>
                  <span className="font-mono text-[11px] text-muted">
                    {formatDate(n.start_date)}
                    {n.expiry_date ? ` → ${formatDate(n.expiry_date)}` : ''}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-charcoal">{n.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{n.description}</p>

                <div className="flex items-center justify-end gap-2 border-t border-line pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(n)}
                    className="inline-flex items-center gap-1 rounded border border-line px-2.5 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                  >
                    <Pin className="h-3 w-3 text-burgundy" />
                    <span>{n.is_pinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(n)}
                    className="rounded border border-line px-2.5 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                  >
                    {n.publication_status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(n)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
