'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, GraduationCap, Layers, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Programme, ResourceCategory, University } from '@/types/database';

interface CoursesUniversitiesClientProps {
  initialUniversities: University[];
  initialProgrammes: Programme[];
  initialCategories: ResourceCategory[];
}

export function CoursesUniversitiesClient({
  initialUniversities,
  initialProgrammes,
  initialCategories,
}: CoursesUniversitiesClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'programmes' | 'universities' | 'categories'>('programmes');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Programme form
  const [progCode, setProgCode] = useState('');
  const [progName, setProgName] = useState('');
  const [progFullTitle, setProgFullTitle] = useState('');
  const [progLevel, setProgLevel] = useState<'UG' | 'PG' | 'Diploma' | 'Doctoral'>('UG');
  const [progSemesters, setProgSemesters] = useState(6);
  const [progHasSpecs, setProgHasSpecs] = useState(false);

  // University form
  const [univName, setUnivName] = useState('');
  const [univShort, setUnivShort] = useState('');
  const [univLocation, setUnivLocation] = useState('');

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsQp, setCatIsQp] = useState(false);
  const [catIsShortNote, setCatIsShortNote] = useState(false);

  async function createProgramme(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          code: progCode,
          name: progName,
          full_title: progFullTitle || null,
          degree_level: progLevel,
          total_semesters: progSemesters,
          has_specializations: progHasSpecs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create programme.');
        return;
      }
      setProgCode('');
      setProgName('');
      setProgFullTitle('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createUniversity(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: univName,
          short_name: univShort,
          location: univLocation || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create university.');
        return;
      }
      setUnivName('');
      setUnivShort('');
      setUnivLocation('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/resource_categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: catName,
          description: catDesc || null,
          is_question_paper: catIsQp,
          is_short_note: catIsShortNote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create category.');
        return;
      }
      setCatName('');
      setCatDesc('');
      setCatIsQp(false);
      setCatIsShortNote(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(entity: string, id: string, current: boolean) {
    setError(null);
    await fetch(`/api/admin/taxonomy/${entity}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, is_active: !current }),
    });
    router.refresh();
  }

  async function toggleHub(
    id: string,
    field: 'is_question_paper' | 'is_short_note',
    current: boolean
  ) {
    setError(null);
    await fetch('/api/admin/taxonomy/resource_categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, [field]: !current }),
    });
    router.refresh();
  }

  async function deleteEntity(entity: string, id: string, label: string) {
    if (!window.confirm(`Delete "${label}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/taxonomy/${entity}?id=${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Delete failed.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Courses, Universities & Resource Categories
        </h1>
        <p className="mt-1 text-sm text-muted">
          Dynamically manage degree programmes, affiliated universities, and library categories without code changes.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        <Button
          size="sm"
          variant={tab === 'programmes' ? 'primary' : 'secondary'}
          onClick={() => setTab('programmes')}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Degree Programmes ({initialProgrammes.length})</span>
        </Button>
        <Button
          size="sm"
          variant={tab === 'universities' ? 'primary' : 'secondary'}
          onClick={() => setTab('universities')}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Universities ({initialUniversities.length})</span>
        </Button>
        <Button
          size="sm"
          variant={tab === 'categories' ? 'primary' : 'secondary'}
          onClick={() => setTab('categories')}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Resource Categories ({initialCategories.length})</span>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#991B1B]">
          {error}
        </div>
      ) : null}

      {/* PROGRAMMES TAB */}
      {tab === 'programmes' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={createProgramme}
            className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
          >
            <h2 className="text-sm font-semibold text-charcoal">Add Degree Programme</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Short Name *</label>
              <input
                type="text"
                required
                value={progName}
                onChange={(e) => setProgName(e.target.value)}
                placeholder="e.g., B.Arch or Pharm.D"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Code *</label>
              <input
                type="text"
                required
                value={progCode}
                onChange={(e) => setProgCode(e.target.value)}
                placeholder="e.g., BARCH"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Full Title</label>
              <input
                type="text"
                value={progFullTitle}
                onChange={(e) => setProgFullTitle(e.target.value)}
                placeholder="Bachelor of Architecture"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Level</label>
                <select
                  value={progLevel}
                  onChange={(e) =>
                    setProgLevel(e.target.value as 'UG' | 'PG' | 'Diploma' | 'Doctoral')
                  }
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
                >
                  <option value="UG">UG</option>
                  <option value="PG">PG</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Doctoral">Doctoral</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Semesters</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={progSemesters}
                  onChange={(e) => setProgSemesters(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 font-mono text-xs"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={progHasSpecs}
                onChange={(e) => setProgHasSpecs(e.target.checked)}
                className="rounded accent-burgundy"
              />
              <span>Supports branches / specializations</span>
            </label>
            <Button type="submit" size="sm" disabled={busy} className="w-full">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Programme</span>
            </Button>
          </form>

          <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3.5">Programme</th>
                  <th className="p-3.5">Level</th>
                  <th className="p-3.5">Semesters</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {initialProgrammes.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3.5">
                      <span className="font-semibold text-charcoal">{p.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-muted">({p.code})</span>
                      {p.full_title ? (
                        <p className="text-[11px] text-muted">{p.full_title}</p>
                      ) : null}
                    </td>
                    <td className="p-3.5">{p.degree_level}</td>
                    <td className="p-3.5 font-mono">{p.total_semesters}</td>
                    <td className="p-3.5">
                      <Badge variant={p.is_active ? 'success' : 'muted'}>
                        {p.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => toggleActive('programmes', p.id, p.is_active)}
                        className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                      >
                        {p.is_active ? 'Hide' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntity('programmes', p.id, p.name)}
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
      ) : null}

      {/* UNIVERSITIES TAB */}
      {tab === 'universities' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={createUniversity}
            className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
          >
            <h2 className="text-sm font-semibold text-charcoal">Add University</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                University Name *
              </label>
              <input
                type="text"
                required
                value={univName}
                onChange={(e) => setUnivName(e.target.value)}
                placeholder="Kerala University of Health Sciences"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Short Code *</label>
              <input
                type="text"
                required
                value={univShort}
                onChange={(e) => setUnivShort(e.target.value)}
                placeholder="KUHS"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Location</label>
              <input
                type="text"
                value={univLocation}
                onChange={(e) => setUnivLocation(e.target.value)}
                placeholder="Thrissur, Kerala"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={busy} className="w-full">
              <Plus className="h-3.5 w-3.5" />
              <span>Add University</span>
            </Button>
          </form>

          <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3.5">University</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {initialUniversities.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3.5">
                      <span className="font-mono font-semibold text-burgundy">{u.short_name}</span>{' '}
                      — <span className="font-medium text-charcoal">{u.name}</span>
                    </td>
                    <td className="p-3.5 text-muted">{u.location || '—'}</td>
                    <td className="p-3.5">
                      <Badge variant={u.is_active ? 'success' : 'muted'}>
                        {u.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => toggleActive('universities', u.id, u.is_active)}
                        className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                      >
                        {u.is_active ? 'Hide' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntity('universities', u.id, u.name)}
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
      ) : null}

      {/* CATEGORIES TAB */}
      {tab === 'categories' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={createCategory}
            className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
          >
            <h2 className="text-sm font-semibold text-charcoal">Add Resource Category</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g., Solved Answer Keys"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="University valuation scheme & solutions"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={catIsQp}
                onChange={(e) => setCatIsQp(e.target.checked)}
                className="rounded accent-burgundy"
              />
              <span>Include in Question Papers section</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={catIsShortNote}
                onChange={(e) => setCatIsShortNote(e.target.checked)}
                className="rounded accent-burgundy"
              />
              <span>Include in Short Notes &amp; Exam Special section</span>
            </label>
            <Button type="submit" size="sm" disabled={busy} className="w-full">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </Button>
          </form>

          <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Shows in</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {initialCategories.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3.5">
                      <span className="font-semibold text-charcoal">{c.name}</span>
                      {c.description ? (
                        <p className="text-[11px] text-muted">{c.description}</p>
                      ) : null}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleHub(c.id, 'is_question_paper', c.is_question_paper)}
                          title="Toggle Question Papers hub"
                          className="cursor-pointer"
                        >
                          {c.is_question_paper ? (
                            <Badge variant="burgundy">Question Papers ✓</Badge>
                          ) : (
                            <Badge variant="muted">Question Papers</Badge>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleHub(c.id, 'is_short_note', Boolean(c.is_short_note))}
                          title="Toggle Short Notes & Exam Special hub"
                          className="cursor-pointer"
                        >
                          {c.is_short_note ? (
                            <Badge variant="burgundy">Short Notes ✓</Badge>
                          ) : (
                            <Badge variant="muted">Short Notes</Badge>
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">Click a badge to toggle the hub.</p>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={c.is_active ? 'success' : 'muted'}>
                        {c.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => toggleActive('resource_categories', c.id, c.is_active)}
                        className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                      >
                        {c.is_active ? 'Hide' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntity('resource_categories', c.id, c.name)}
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
      ) : null}
    </div>
  );
}
