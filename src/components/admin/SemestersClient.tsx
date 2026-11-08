'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Programme, Semester } from '@/types/database';

interface SemestersClientProps {
  programmes: Programme[];
  semesters: Semester[];
}

export function SemestersClient({ programmes, semesters }: SemestersClientProps) {
  const router = useRouter();
  const [filterProgrammeId, setFilterProgrammeId] = useState(programmes[0]?.id || '');
  const [semNum, setSemNum] = useState(1);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = filterProgrammeId
    ? semesters.filter((s) => s.programme_id === filterProgrammeId)
    : semesters;
  const progMap = new Map(programmes.map((p) => [p.id, p]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!filterProgrammeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          programme_id: filterProgrammeId,
          semester_number: semNum,
          label: label.trim() || `Semester ${semNum}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create semester.');
        return;
      }
      setLabel('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(sem: Semester) {
    await fetch('/api/admin/taxonomy/semesters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: sem.id, is_active: !sem.is_active }),
    });
    router.refresh();
  }

  async function handleDelete(sem: Semester) {
    if (!window.confirm(`Delete ${sem.label}?`)) return;
    const res = await fetch(`/api/admin/taxonomy/semesters?id=${sem.id}`, {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Semester Structure Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Configure semester divisions per degree programme (e.g., 8 semesters for B.Tech, 6 for BCA/BBA, 4 for PG).
          </p>
        </div>

        <select
          value={filterProgrammeId}
          onChange={(e) => setFilterProgrammeId(e.target.value)}
          className="h-9 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal"
        >
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.total_semesters} configured)
            </option>
          ))}
        </select>
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
          <h2 className="text-sm font-semibold text-charcoal">
            Add Semester to {progMap.get(filterProgrammeId)?.name || 'Programme'}
          </h2>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">
              Semester Number *
            </label>
            <input
              type="number"
              min={1}
              max={16}
              required
              value={semNum}
              onChange={(e) => setSemNum(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Display Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Semester ${semNum}`}
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Semester</span>
          </Button>
        </form>

        <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Semester Label</th>
                <th className="p-3.5">Programme</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((sem) => (
                <tr key={sem.id}>
                  <td className="p-3.5 font-mono font-semibold text-burgundy">
                    S{sem.semester_number}
                  </td>
                  <td className="p-3.5 font-medium text-charcoal">{sem.label}</td>
                  <td className="p-3.5 text-muted">
                    {progMap.get(sem.programme_id)?.name || '—'}
                  </td>
                  <td className="p-3.5">
                    <Badge variant={sem.is_active ? 'success' : 'muted'}>
                      {sem.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggle(sem)}
                      className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                    >
                      {sem.is_active ? 'Hide' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sem)}
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
