'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  FilePlus2,
  FolderKanban,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { StorageLinkValidationResult } from '@/lib/storage/provider';
import { buildSubjectOptions } from '@/lib/subject-options';
import type {
  Programme,
  Resource,
  ResourceCategory,
  ResourceFileType,
  Semester,
  Specialization,
  Subject,
} from '@/types/database';
import { formatDate } from '@/lib/utils';

interface ResourcesManagerClientProps {
  programmes: Programme[];
  specializations: Specialization[];
  semesters: Semester[];
  subjects: Subject[];
  categories: ResourceCategory[];
}

const FILE_TYPES: ResourceFileType[] = [
  'PDF',
  'DOC',
  'DOCX',
  'PPT',
  'PPTX',
  'XLS',
  'XLSX',
  'ZIP',
  'OTHER',
];

export function ResourcesManagerClient({
  programmes,
  specializations,
  semesters,
  subjects,
  categories,
}: ResourcesManagerClientProps) {
  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editing, setEditing] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProgrammeId, setEditProgrammeId] = useState('');
  const [editSpecId, setEditSpecId] = useState('');
  const [editSemesterId, setEditSemesterId] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editFileType, setEditFileType] = useState<ResourceFileType>('PDF');
  const [editFileSize, setEditFileSize] = useState('');
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [editValidation, setEditValidation] = useState<StorageLinkValidationResult | null>(null);
  const [validatingEdit, setValidatingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set('q', q.trim());
      if (statusFilter) sp.set('status', statusFilter);
      if (programmeFilter) sp.set('programmeId', programmeFilter);
      if (categoryFilter) sp.set('categoryId', categoryFilter);
      sp.set('page', String(page));
      sp.set('pageSize', '20');

      const res = await fetch(`/api/admin/resources?${sp.toString()}`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setSelectedIds(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, programmeFilter, categoryFilter, page]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const editSemesters = useMemo(
    () => semesters.filter((s) => s.programme_id === editProgrammeId),
    [editProgrammeId, semesters]
  );

  const editSpecs = useMemo(
    () => specializations.filter((s) => s.programme_id === editProgrammeId),
    [editProgrammeId, specializations]
  );

  const editSubjects = useMemo(
    () =>
      buildSubjectOptions(subjects, {
        programmeId: editProgrammeId,
        semesterId: editSemesterId,
        specializationId: editSpecId,
        preferSpecializationId: editSpecId,
        pinnedSubjectId: editSubjectId,
        collapseAcrossSemesters: !editSemesterId,
      }),
    [editProgrammeId, editSemesterId, editSpecId, editSubjectId, subjects]
  );

  function openEditModal(resource: Resource) {
    setEditing(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description || '');
    setEditProgrammeId(resource.programme_id);
    setEditSpecId(resource.specialization_id || '');
    setEditSemesterId(resource.semester_id);
    setEditSubjectId(resource.subject_id);
    setEditCategoryId(resource.category_id);
    setEditFileType(resource.file_type);
    setEditFileSize(resource.file_size || '');
    setEditDriveUrl(resource.google_drive_share_url);
    setEditValidation(null);
    setEditError(null);
  }

  async function handleValidateReplacement() {
    if (!editDriveUrl.trim()) return;
    setValidatingEdit(true);
    try {
      const res = await fetch('/api/admin/resources/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: editDriveUrl.trim() }),
      });
      const data = (await res.json()) as StorageLinkValidationResult;
      setEditValidation(data);
    } finally {
      setValidatingEdit(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/resources/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          programme_id: editProgrammeId,
          specialization_id: editSpecId || null,
          semester_id: editSemesterId,
          subject_id: editSubjectId,
          category_id: editCategoryId,
          file_type: editFileType,
          file_size: editFileSize.trim() || null,
          google_drive_share_url: editDriveUrl.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || 'Failed to update resource.');
        return;
      }
      setEditing(null);
      await loadResources();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleStatus(resource: Resource) {
    const next = resource.publication_status === 'published' ? 'draft' : 'published';
    await fetch(`/api/admin/resources/${resource.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ publication_status: next }),
    });
    await loadResources();
  }

  async function handleDeleteOne(resource: Resource) {
    const confirmed = window.confirm(
      `Remove "${resource.title}" from അഴിമതി മയം?\n\nNote: This deletes only the platform database record. Your original file in Google Drive will NOT be deleted.`
    );
    if (!confirmed) return;

    await fetch(`/api/admin/resources/${resource.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    await loadResources();
  }

  async function handleBulkAction(action: 'publish' | 'unpublish' | 'delete') {
    if (selectedIds.size === 0) return;
    if (action === 'delete') {
      const ok = window.confirm(
        `Delete ${selectedIds.size} selected database record(s)? Original Google Drive files will remain untouched.`
      );
      if (!ok) return;
    }

    setBulkBusy(true);
    try {
      await fetch('/api/admin/resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
        }),
      });
      await loadResources();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Study Materials Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Inspect, edit, replace Google Drive links, publish, or remove resource records ({total} total).
          </p>
        </div>

        <Link
          href="/admin/upload"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          <span>Upload New Resource</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="grid gap-3 rounded-xl border border-line bg-neutral-soft/65 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search resource title or filename..."
            className="h-9 w-full rounded-md border border-line-strong bg-canvas pl-8 pr-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={programmeFilter}
          onChange={(e) => {
            setProgrammeFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
        >
          <option value="">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal focus:border-burgundy focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-burgundy-border bg-burgundy-tint px-4 py-2.5 text-xs">
          <span className="font-semibold text-burgundy">
            {selectedIds.size} resource(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('publish')}
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('unpublish')}
            >
              Move to Draft
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('delete')}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl border border-line bg-neutral-soft" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No study materials found"
          description="Link your first Google Drive PDF or study document using Upload Resources."
          action={
            <Link
              href="/admin/upload"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              Upload Resource
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(items.map((r) => r.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded accent-burgundy"
                  />
                </th>
                <th className="p-3.5">Resource</th>
                <th className="p-3.5">Academic Scope</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Uploaded</th>
                <th className="p-3.5">Downloads</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((res) => (
                <tr key={res.id} className="hover:bg-neutral-soft/45">
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(res.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(res.id);
                        else next.delete(res.id);
                        setSelectedIds(next);
                      }}
                      className="rounded accent-burgundy"
                    />
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <div className="font-semibold text-charcoal truncate">{res.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted">
                      <span>{res.file_type}</span>
                      <span>•</span>
                      <span className="truncate" title={res.google_drive_file_id}>
                        ID: {res.google_drive_file_id.slice(0, 14)}...
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-charcoal">
                      {res.programme?.name || '—'}{' '}
                      {res.semester?.label ? `• ${res.semester.label}` : ''}
                    </div>
                    {res.subject ? (
                      <div className="mt-0.5 font-mono text-[11px] text-burgundy">
                        {res.subject.subject_code} — {res.subject.name}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3.5 text-muted">{res.category?.name || '—'}</td>
                  <td className="p-3.5 font-mono text-muted">{formatDate(res.created_at)}</td>
                  <td className="p-3.5 font-mono font-semibold text-charcoal">
                    {res.download_count}
                  </td>
                  <td className="p-3.5">
                    <Badge
                      variant={res.publication_status === 'published' ? 'success' : 'warning'}
                    >
                      {res.publication_status}
                    </Badge>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/resources/${res.id}`}
                        title="Preview document"
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-canvas text-charcoal hover:bg-neutral-soft"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEditModal(res)}
                        title="Edit metadata or replace Drive link"
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-canvas text-charcoal hover:bg-neutral-soft cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(res)}
                        className="rounded border border-line bg-canvas px-2 py-1 text-[11px] font-semibold text-charcoal hover:bg-neutral-soft cursor-pointer"
                      >
                        {res.publication_status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOne(res)}
                        title="Delete database record"
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* Edit Metadata & Replace Google Drive Link Modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-2xl rounded-xl border border-line bg-canvas p-6 shadow-xl space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-semibold text-charcoal">
                  Edit Metadata & Replace Google Drive Link
                </h2>
                <p className="text-xs text-muted">
                  Replacing a link updates the platform reference while leaving the original Google Drive file intact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1.5 text-muted hover:bg-neutral-soft cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError ? (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#991B1B]">
                {editError}
              </div>
            ) : null}

            <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  Google Drive Sharing URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={editDriveUrl}
                    onChange={(e) => {
                      setEditDriveUrl(e.target.value);
                      setEditValidation(null);
                    }}
                    className="h-9 flex-1 rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs text-charcoal"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={validatingEdit}
                    onClick={handleValidateReplacement}
                  >
                    {validatingEdit ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5 text-burgundy" />
                    )}
                    <span>Validate Replacement</span>
                  </Button>
                </div>

                {editValidation ? (
                  <div
                    className={`mt-2 rounded border px-3 py-2 text-xs ${
                      editValidation.valid
                        ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                        : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    }`}
                  >
                    {editValidation.valid ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valid File ID: <code>{editValidation.fileId}</code> —{' '}
                        {editValidation.statusMessage}
                      </span>
                    ) : (
                      <span>{editValidation.error}</span>
                    )}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-line-strong bg-canvas p-2.5 text-xs text-charcoal"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">Programme</label>
                  <select
                    value={editProgrammeId}
                    onChange={(e) => {
                      setEditProgrammeId(e.target.value);
                      setEditSpecId('');
                      setEditSemesterId('');
                      setEditSubjectId('');
                    }}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">
                    Specialization
                  </label>
                  <select
                    value={editSpecId}
                    onChange={(e) => setEditSpecId(e.target.value)}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  >
                    <option value="">All / Common</option>
                    {editSpecs.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.code} — {sp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">Semester</label>
                  <select
                    value={editSemesterId}
                    onChange={(e) => {
                      setEditSemesterId(e.target.value);
                      setEditSubjectId('');
                    }}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  >
                    <option value="">Select Semester</option>
                    {editSemesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">Subject</label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  >
                    <option value="">Select Subject</option>
                    {editSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-charcoal">Format</label>
                    <select
                      value={editFileType}
                      onChange={(e) => setEditFileType(e.target.value as ResourceFileType)}
                      className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
                    >
                      {FILE_TYPES.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-charcoal">Size</label>
                    <input
                      type="text"
                      value={editFileSize}
                      onChange={(e) => setEditFileSize(e.target.value)}
                      placeholder="2.1 MB"
                      className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
