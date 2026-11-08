'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { AcademicRegulation, Programme, University } from '@/types/database';

interface RegulationsClientProps {
  universities: University[];
  programmes: Programme[];
  regulations: AcademicRegulation[];
}

export function RegulationsClient({
  universities,
  programmes,
  regulations,
}: RegulationsClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [batchRange, setBatchRange] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const univMap = new Map(universities.map((u) => [u.id, u]));
  const progMap = new Map(programmes.map((p) => [p.id, p]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/academic_regulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          code,
          batch_range: batchRange || null,
          university_id: universityId || null,
          programme_id: programmeId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create academic regulation.');
        return;
      }
      setName('');
      setCode('');
      setBatchRange('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(reg: AcademicRegulation) {
    await fetch('/api/admin/taxonomy/academic_regulations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: reg.id, is_active: !reg.is_active }),
    });
    router.refresh();
  }

  async function handleDelete(reg: AcademicRegulation) {
    if (!window.confirm(`Delete regulation "${reg.name}"?`)) return;
    const res = await fetch(`/api/admin/taxonomy/academic_regulations?id=${reg.id}`, {
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
          Academic Regulations & Schemes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Configure university schemes, syllabus revisions, and admission batch structures.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
        >
          <h2 className="text-sm font-semibold text-charcoal">Add Regulation / Scheme</h2>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CUSAT 2023 Regulation"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CUSAT-2023"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs uppercase"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Batch Range</label>
            <input
              type="text"
              value={batchRange}
              onChange={(e) => setBatchRange(e.target.value)}
              placeholder="2023 Onwards"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">University</label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
            >
              <option value="">All Universities</option>
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
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
            >
              <option value="">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={busy} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Regulation</span>
          </Button>
        </form>

        <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Regulation Name</th>
                <th className="p-3.5">Scope</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {regulations.map((reg) => (
                <tr key={reg.id}>
                  <td className="p-3.5 font-mono font-semibold text-burgundy">{reg.code}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-charcoal">{reg.name}</span>
                    {reg.batch_range ? (
                      <p className="text-[11px] text-muted">{reg.batch_range}</p>
                    ) : null}
                  </td>
                  <td className="p-3.5 text-muted">
                    {reg.university_id ? univMap.get(reg.university_id)?.short_name : 'All Univs'}
                    {' • '}
                    {reg.programme_id ? progMap.get(reg.programme_id)?.name : 'All Progs'}
                  </td>
                  <td className="p-3.5">
                    <Badge variant={reg.is_active ? 'success' : 'muted'}>
                      {reg.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggle(reg)}
                      className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                    >
                      {reg.is_active ? 'Hide' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(reg)}
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
  );
}
