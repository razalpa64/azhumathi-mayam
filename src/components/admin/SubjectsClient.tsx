'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type {
  AcademicRegulation,
  Programme,
  Semester,
  Specialization,
  Subject,
  University,
} from '@/types/database';

interface SubjectsClientProps {
  initialQuery?: string;
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
  subjects: Subject[];
}

export function SubjectsClient({
  initialQuery = '',
  universities,
  programmes,
  specializations,
  regulations,
  semesters,
  subjects,
}: SubjectsClientProps) {
  const router = useRouter();

  const [subjectCode, setSubjectCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [universityId, setUniversityId] = useState(universities[0]?.id || '');
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || '');
  const [specializationId, setSpecializationId] = useState('');
  const [regulationId, setRegulationId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [pubStatus, setPubStatus] = useState<'published' | 'draft'>('published');

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filterProgrammeId, setFilterProgrammeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progMap = new Map(programmes.map((p) => [p.id, p]));
  const semMap = new Map(semesters.map((s) => [s.id, s]));
  const specMap = new Map(specializations.map((s) => [s.id, s]));

  const formSpecs = useMemo(
    () => specializations.filter((s) => s.programme_id === programmeId),
    [programmeId, specializations]
  );
  const formSems = useMemo(
    () => semesters.filter((s) => s.programme_id === programmeId),
    [programmeId, semesters]
  );

  const visibleSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      if (filterProgrammeId && s.programme_id !== filterProgrammeId) return false;
      if (q) {
        return (
          s.name.toLowerCase().includes(q) || s.subject_code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [subjects, filterProgrammeId, searchQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!programmeId || !semesterId) {
      setError('Select a programme and semester.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/taxonomy/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          university_id: universityId || null,
          programme_id: programmeId,
          specialization_id: specializationId || null,
          regulation_id: regulationId || null,
          semester_id: semesterId,
          subject_code: subjectCode,
          name,
          description: description || null,
          publication_status: pubStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create subject.');
        return;
      }
      setSubjectCode('');
      setName('');
      setDescription('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePublish(sub: Subject) {
    const next = sub.publication_status === 'published' ? 'draft' : 'published';
    await fetch('/api/admin/taxonomy/subjects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: sub.id, publication_status: next }),
    });
    router.refresh();
  }

  async function handleDelete(sub: Subject) {
    if (!window.confirm(`Delete subject "${sub.subject_code} — ${sub.name}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/taxonomy/subjects?id=${sub.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not delete subject.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Subject Curriculum Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create and publish syllabus subjects dynamically across programmes, branches, and semesters ({subjects.length} subjects).
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Create Subject Form */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-3.5 h-fit"
        >
          <h2 className="text-sm font-semibold text-charcoal">Create New Subject</h2>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Code *</label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="CST304"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Status</label>
              <select
                value={pubStatus}
                onChange={(e) => setPubStatus(e.target.value as 'published' | 'draft')}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Computer Graphics and Image Processing"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Programme *</label>
            <select
              value={programmeId}
              onChange={(e) => {
                setProgrammeId(e.target.value);
                setSpecializationId('');
                setSemesterId('');
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
            <label className="mb-1 block text-xs font-semibold text-charcoal">Semester *</label>
            <select
              value={semesterId}
              required
              onChange={(e) => setSemesterId(e.target.value)}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
            >
              <option value="">Select Semester</option>
              {formSems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">
              Specialization / Branch
            </label>
            <select
              value={specializationId}
              disabled={formSpecs.length === 0}
              onChange={(e) => setSpecializationId(e.target.value)}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs disabled:opacity-55"
            >
              <option value="">Common to All Branches</option>
              {formSpecs.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.code} — {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">University</label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="">All</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.short_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Regulation</label>
              <select
                value={regulationId}
                onChange={(e) => setRegulationId(e.target.value)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="">All</option>
                {regulations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Core syllabus topics..."
              className="w-full rounded-md border border-line-strong bg-canvas p-2.5 text-xs"
            />
          </div>

          <Button type="submit" size="sm" disabled={busy} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Subject</span>
          </Button>
        </form>

        {/* Subjects Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject code or title..."
                className="h-9 w-full rounded-md border border-line-strong bg-canvas pl-8 pr-3 text-xs"
              />
            </div>
            <select
              value={filterProgrammeId}
              onChange={(e) => setFilterProgrammeId(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-canvas px-3 text-xs"
            >
              <option value="">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Subject Name</th>
                  <th className="p-3.5">Curriculum Scope</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleSubjects.map((sub) => (
                  <tr key={sub.id}>
                    <td className="p-3.5 font-mono font-semibold text-burgundy">
                      {sub.subject_code}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-charcoal">{sub.name}</span>
                      {sub.description ? (
                        <p className="line-clamp-1 text-[11px] text-muted">{sub.description}</p>
                      ) : null}
                    </td>
                    <td className="p-3.5 text-muted">
                      {progMap.get(sub.programme_id)?.name || '—'}
                      {sub.specialization_id
                        ? ` • ${specMap.get(sub.specialization_id)?.code || ''}`
                        : ''}
                      {' • '}
                      {semMap.get(sub.semester_id)?.label || '—'}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={sub.publication_status === 'published' ? 'success' : 'warning'}
                      >
                        {sub.publication_status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(sub)}
                        className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                      >
                        {sub.publication_status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sub)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
