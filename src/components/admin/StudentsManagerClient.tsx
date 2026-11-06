'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  KeyRound,
  Loader2,
  Pencil,
  Power,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  AcademicRegulation,
  Profile,
  Programme,
  Semester,
  Specialization,
  University,
} from '@/types/database';
import { formatDate, formatDateTime } from '@/lib/utils';

interface StudentsManagerClientProps {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
}

interface StudentDetailPayload {
  student: Profile;
  downloadCount: number;
  bookmarkCount: number;
  recentDownloads: Array<{ id: string; created_at: string; resource?: { id: string; title: string } | null }>;
  recentlyViewed: Array<{ id: string; viewed_at: string; resource?: { id: string; title: string } | null }>;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = 'Std!';
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function StudentsManagerClient({
  universities,
  programmes,
  specializations,
  regulations,
  semesters,
}: StudentsManagerClientProps) {
  const [items, setItems] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState(() => generateTempPassword());
  const [newUniversityId, setNewUniversityId] = useState(universities[0]?.id || '');
  const [newProgrammeId, setNewProgrammeId] = useState(programmes[0]?.id || '');
  const [newSpecId, setNewSpecId] = useState('');
  const [newRegId, setNewRegId] = useState('');
  const [newSemId, setNewSemId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit / Password Reset Modal
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUniversityId, setEditUniversityId] = useState('');
  const [editProgrammeId, setEditProgrammeId] = useState('');
  const [editSpecId, setEditSpecId] = useState('');
  const [editRegId, setEditRegId] = useState('');
  const [editSemId, setEditSemId] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Detail Drawer
  const [detailData, setDetailData] = useState<StudentDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set('q', q.trim());
      if (programmeFilter) sp.set('programmeId', programmeFilter);
      if (statusFilter) sp.set('status', statusFilter);
      sp.set('page', String(page));
      sp.set('pageSize', '20');

      const res = await fetch(`/api/admin/students?${sp.toString()}`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, programmeFilter, statusFilter, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const createSpecs = useMemo(
    () => specializations.filter((s) => s.programme_id === newProgrammeId),
    [newProgrammeId, specializations]
  );
  const createSems = useMemo(
    () => semesters.filter((s) => s.programme_id === newProgrammeId),
    [newProgrammeId, semesters]
  );

  const editSpecs = useMemo(
    () => specializations.filter((s) => s.programme_id === editProgrammeId),
    [editProgrammeId, specializations]
  );
  const editSems = useMemo(
    () => semesters.filter((s) => s.programme_id === editProgrammeId),
    [editProgrammeId, semesters]
  );

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: newUsername.trim(),
          temporaryPassword: newPassword,
          full_name: newFullName.trim(),
          university_id: newUniversityId || null,
          programme_id: newProgrammeId || null,
          specialization_id: newSpecId || null,
          regulation_id: newRegId || null,
          semester_id: newSemId || null,
          is_active: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create student account.');
        return;
      }

      setShowCreate(false);
      setNewUsername('');
      setNewFullName('');
      setNewPassword(generateTempPassword());
      await loadStudents();
    } finally {
      setCreating(false);
    }
  }

  function openEditStudent(st: Profile) {
    setEditing(st);
    setEditFullName(st.full_name);
    setEditUniversityId(st.university_id || '');
    setEditProgrammeId(st.programme_id || '');
    setEditSpecId(st.specialization_id || '');
    setEditRegId(st.regulation_id || '');
    setEditSemId(st.semester_id || '');
    setResetPasswordVal('');
    setEditError(null);
  }

  async function handleSaveStudentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const payload: Record<string, unknown> = {
        full_name: editFullName.trim(),
        university_id: editUniversityId || null,
        programme_id: editProgrammeId || null,
        specialization_id: editSpecId || null,
        regulation_id: editRegId || null,
        semester_id: editSemId || null,
      };
      if (resetPasswordVal.trim()) {
        payload.newPassword = resetPasswordVal.trim();
      }

      const res = await fetch(`/api/admin/students/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || 'Could not update student account.');
        return;
      }
      setEditing(null);
      await loadStudents();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActive(st: Profile) {
    await fetch(`/api/admin/students/${st.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ is_active: !st.is_active }),
    });
    await loadStudents();
  }

  async function handleInspectStudent(id: string) {
    setLoadingDetail(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/students/${id}`, { credentials: 'same-origin' });
      if (res.ok) {
        const data = (await res.json()) as StudentDetailPayload;
        setDetailData(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Student Accounts Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Provision student credentials, assign courses and semesters, reset passwords, and control account access ({total} students).
          </p>
        </div>

        <Button
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          <span>Create Student Account</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-line bg-neutral-soft/65 p-4 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name or username..."
            className="h-9 w-full rounded-md border border-line-strong bg-canvas pl-8 pr-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
          />
        </div>

        <select
          value={programmeFilter}
          onChange={(e) => {
            setProgrammeFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal"
        >
          <option value="">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-charcoal"
        >
          <option value="">All Account Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Deactivated Only</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl border border-line bg-neutral-soft" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No student accounts found"
          description="Public student registration is disabled. Click Create Student Account above to issue credentials for your students."
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create First Student</span>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Enrolled Course & Semester</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((st) => (
                <tr key={st.id} className="hover:bg-neutral-soft/45">
                  <td className="p-3.5 font-semibold text-charcoal">{st.full_name}</td>
                  <td className="p-3.5 font-mono text-burgundy">{st.username}</td>
                  <td className="p-3.5">
                    <span className="font-medium text-charcoal">
                      {st.programme?.name || 'Unassigned'}
                    </span>
                    {st.specialization ? (
                      <span className="text-muted"> • {st.specialization.code}</span>
                    ) : null}
                    {st.semester ? (
                      <span className="text-muted"> • {st.semester.label}</span>
                    ) : null}
                  </td>
                  <td className="p-3.5 font-mono text-muted">{formatDate(st.created_at)}</td>
                  <td className="p-3.5">
                    <Badge variant={st.is_active ? 'success' : 'danger'}>
                      {st.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleInspectStudent(st.id)}
                        title="Inspect student details"
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-canvas text-charcoal hover:bg-neutral-soft cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditStudent(st)}
                        title="Edit profile or reset password"
                        className="inline-flex h-7 items-center gap-1 rounded border border-line bg-canvas px-2 text-[11px] font-semibold text-charcoal hover:bg-neutral-soft cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit / Reset PW</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(st)}
                        title={st.is_active ? 'Deactivate account' : 'Activate account'}
                        className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-semibold cursor-pointer ${
                          st.is_active
                            ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                            : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{st.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Create Student Modal */}
      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateStudent}
            className="w-full max-w-xl rounded-xl border border-line bg-canvas p-6 shadow-xl space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-semibold text-charcoal">Create Student Account</h2>
                <p className="text-xs text-muted">
                  Assign a username, temporary password, and enrolled semester.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded p-1.5 text-muted hover:bg-neutral-soft cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError ? (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs text-[#991B1B]">
                {createError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  Student Full Name <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g., Arjun Krishnan"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  Username <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g., ktu24cs001"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs text-charcoal"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-charcoal">
                  <span>
                    Temporary Password <span className="text-burgundy">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateTempPassword())}
                    className="inline-flex items-center gap-1 text-[11px] text-burgundy hover:underline cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Regenerate</span>
                  </button>
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs text-charcoal"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">University</label>
                <select
                  value={newUniversityId}
                  onChange={(e) => setNewUniversityId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">Select University</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short_name} — {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Programme</label>
                <select
                  value={newProgrammeId}
                  onChange={(e) => {
                    setNewProgrammeId(e.target.value);
                    setNewSpecId('');
                    setNewSemId('');
                  }}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">Select Programme</option>
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
                  value={newSpecId}
                  disabled={createSpecs.length === 0}
                  onChange={(e) => setNewSpecId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs disabled:opacity-55"
                >
                  <option value="">None / General</option>
                  {createSpecs.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.code} — {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Semester</label>
                <select
                  value={newSemId}
                  onChange={(e) => setNewSemId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">Select Semester</option>
                  {createSems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  Academic Regulation
                </label>
                <select
                  value={newRegId}
                  onChange={(e) => setNewRegId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">Optional Regulation</option>
                  {regulations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Provision Account</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Edit Student & Password Reset Modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveStudentEdit}
            className="w-full max-w-xl rounded-xl border border-line bg-canvas p-6 shadow-xl space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-semibold text-charcoal">
                  Manage Student: @{editing.username}
                </h2>
                <p className="text-xs text-muted">
                  Update academic enrollment or assign a replacement password.
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-charcoal">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">University</label>
                <select
                  value={editUniversityId}
                  onChange={(e) => setEditUniversityId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">None</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short_name} — {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Programme</label>
                <select
                  value={editProgrammeId}
                  onChange={(e) => {
                    setEditProgrammeId(e.target.value);
                    setEditSpecId('');
                    setEditSemId('');
                  }}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">None</option>
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
                  <option value="">None</option>
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
                  value={editSemId}
                  onChange={(e) => setEditSemId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">None</option>
                  {editSems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-charcoal">Regulation</label>
                <select
                  value={editRegId}
                  onChange={(e) => setEditRegId(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                >
                  <option value="">None</option>
                  {regulations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-line bg-neutral-soft p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                    <KeyRound className="h-3.5 w-3.5 text-burgundy" />
                    <span>Reset Student Password (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPasswordVal(generateTempPassword())}
                    className="text-[11px] font-semibold text-burgundy hover:underline cursor-pointer"
                  >
                    Generate Temp Password
                  </button>
                </div>
                <input
                  type="text"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Student Changes'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Student Detail Inspection Modal */}
      {(loadingDetail || detailData) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-line bg-canvas p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-semibold text-charcoal">Student Profile Activity</h2>
              <button
                type="button"
                onClick={() => {
                  setDetailData(null);
                  setLoadingDetail(false);
                }}
                className="rounded p-1.5 text-muted hover:bg-neutral-soft cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingDetail || !detailData ? (
              <div className="py-10 text-center text-xs text-muted">Loading student record...</div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-neutral-soft p-3.5">
                  <div>
                    <span className="text-muted">Full Name</span>
                    <p className="font-semibold text-charcoal">{detailData.student.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted">Username</span>
                    <p className="font-mono font-semibold text-burgundy">
                      @{detailData.student.username}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Downloads</span>
                    <p className="font-mono font-semibold text-charcoal">
                      {detailData.downloadCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Saved Bookmarks</span>
                    <p className="font-mono font-semibold text-charcoal">
                      {detailData.bookmarkCount}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted">Last Sign-In</span>
                    <p className="font-mono text-charcoal">
                      {formatDateTime(detailData.student.last_login_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-charcoal mb-1.5">Recent Downloads</h3>
                  {detailData.recentDownloads.length === 0 ? (
                    <p className="text-muted">No downloads recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-line rounded border border-line">
                      {detailData.recentDownloads.slice(0, 5).map((d) => (
                        <li key={d.id} className="flex justify-between px-3 py-2">
                          <span className="truncate font-medium text-charcoal">
                            {d.resource?.title || 'Resource'}
                          </span>
                          <span className="font-mono text-muted">{formatDate(d.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
