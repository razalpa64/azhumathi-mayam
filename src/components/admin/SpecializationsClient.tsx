'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Programme, Specialization } from '@/types/database';

interface SpecializationsClientProps {
  programmes: Programme[];
  specializations: Specialization[];
}

export function SpecializationsClient({
  programmes,
  specializations,
}: SpecializationsClientProps) {
  const router = useRouter();
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [filterProgrammeId, setFilterProgrammeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progMap = new Map(programmes.map((p) => [p.id, p]));
  const visible = filterProgrammeId
    ? specializations.filter((s) => s.programme_id === filterProgrammeId)
    : specializations;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/taxonomy/specializations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          programme_id: programmeId,
          code,
          name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create specialization.');
        return;
      }
      setCode('');
      setName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(sp: Specialization) {
    await fetch('/api/admin/taxonomy/specializations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: sp.id, is_active: !sp.is_active }),
    });
    router.refresh();
  }

  async function handleDelete(sp: Specialization) {
    if (!window.confirm(`Delete specialization "${sp.name}"?`)) return;
    const res = await fetch(`/api/admin/taxonomy/specializations?id=${sp.id}`, {
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
            Specializations & Branches
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage branches such as CSE, AI & ML, ECE, Finance, or Literature under any degree programme.
          </p>
        </div>

        <select
          value={filterProgrammeId}
          onChange={(e) => setFilterProgrammeId(e.target.value)}
          className="h-9 rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal"
        >
          <option value="">Filter: All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
        >
          <h2 className="text-sm font-semibold text-charcoal">Add Specialization</h2>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Programme *</label>
            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
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
            <label className="mb-1 block text-xs font-semibold text-charcoal">Branch Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., CYBER or DS"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs uppercase"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cyber Security"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Specialization</span>
          </Button>
        </form>

        <div className="lg:col-span-8 overflow-x-auto rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-neutral-soft/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">Programme</th>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Specialization Name</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((sp) => (
                <tr key={sp.id}>
                  <td className="p-3.5 font-medium text-charcoal">
                    {progMap.get(sp.programme_id)?.name || '—'}
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-burgundy">{sp.code}</td>
                  <td className="p-3.5 text-charcoal">{sp.name}</td>
                  <td className="p-3.5">
                    <Badge variant={sp.is_active ? 'success' : 'muted'}>
                      {sp.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggle(sp)}
                      className="rounded border border-line px-2 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                    >
                      {sp.is_active ? 'Hide' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sp)}
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
