'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDateTime, getInitials } from '@/lib/utils';

interface SubAdmin {
  id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  created_by: string | null;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const core = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `Azm-${core}`;
}

const inputCls =
  'h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none';

export function TeamManagerClient() {
  const [items, setItems] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Per-row actions
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/team', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load sub-admin accounts.');
      } else {
        setItems((data.items || []) as SubAdmin[]);
      }
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCreatedCreds(null);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          temporaryPassword: password,
          full_name: fullName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create the sub-admin account.');
      } else {
        setCreatedCreds({ username: username.trim().toLowerCase(), password });
        setFullName('');
        setUsername('');
        setPassword('');
        setNotice('Sub-admin account created. Share the sign-in details below with them.');
        await load();
      }
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okMessage: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'That update failed.');
      } else {
        setNotice(okMessage);
        setResetFor(null);
        setResetPassword('');
        await load();
      }
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not delete that account.');
      } else {
        setNotice('Sub-admin account deleted.');
        setConfirmDeleteId(null);
        await load();
      }
    } catch {
      setError('Network hiccup — please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyCreds() {
    if (!createdCreds) return;
    try {
      await navigator.clipboard.writeText(
        `Username: [SECURITY_DATA] (temporary): ${createdCreds.password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the details stay on screen to copy manually.
    }
  }

  return (
    <div className="space-y-6">
      {/* What a sub-admin is */}
      <section className="rounded-xl border border-line bg-canvas p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-burgundy text-canvas">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-charcoal">What sub-admins can do</h2>
            <div className="mt-2 grid gap-2 text-xs leading-relaxed text-muted sm:grid-cols-2">
              <p className="flex gap-1.5">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                Upload and manage study materials, subjects and the full course catalogue, and
                answer student requests.
              </p>
              <p className="flex gap-1.5">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" />
                They can never see or manage student accounts, create accounts, post notices,
                change site settings, or view the audit log. Only you (admin@invytra) manage
                this team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {notice}
        </p>
      ) : null}

      {/* Create */}
      <section className="rounded-xl border border-line bg-canvas p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <UserPlus className="h-4 w-4 text-burgundy" />
          Create a sub-admin
        </h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Full name
            </span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              placeholder="e.g. Ananya Nair"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Username (sign-in)
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="e.g. ananya.notes"
              autoCapitalize="none"
              className={inputCls}
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Temporary password
            </span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={`${inputCls} pr-16`}
              />
              <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  title="Generate a password"
                  className="rounded p-1.5 text-muted hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded p-1.5 text-muted hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </span>
            </span>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark disabled:opacity-50 cursor-pointer lg:w-auto"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              <span>Create account</span>
            </button>
          </div>
        </form>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          They sign in with this username and temporary password, and are asked to set their own
          password. You can deactivate or delete the account at any time below.
        </p>

        {createdCreds ? (
          <div className="mt-4 rounded-lg border border-burgundy-border bg-burgundy-tint/60 px-4 py-3">
            <p className="text-xs font-semibold text-charcoal">Share these sign-in details now:</p>
            <p className="mt-1.5 font-mono text-xs text-charcoal">
              Username: <span className="font-bold">{createdCreds.username}</span>
              <br />
              Temporary password: <span className="font-bold">{createdCreds.password}</span>
            </p>
            <button
              type="button"
              onClick={copyCreds}
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? 'Copied!' : 'Copy details'}</span>
            </button>
          </div>
        ) : null}
      </section>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">
          Sub-admins {items.length > 0 ? <span className="text-muted">({items.length})</span> : null}
        </h2>

        {loading ? (
          <div className="h-32 animate-pulse rounded-xl border border-line bg-neutral-soft" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-neutral-soft/40 px-5 py-10 text-center">
            <p className="text-sm font-medium text-charcoal">No sub-admins yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
              Create the first one above — they&apos;ll be able to upload notes and answer
              requests, without ever touching student accounts.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-xl border border-line bg-canvas p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-burgundy-tint text-xs font-bold text-burgundy ring-1 ring-burgundy-border">
                  {getInitials(item.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-charcoal">{item.full_name}</p>
                    <Badge variant={item.is_active ? 'success' : 'neutral'}>
                      {item.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                    {item.must_change_password ? (
                      <Badge variant="warning">Password change pending</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">@{item.username}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Created {formatDate(item.created_at)}
                    {' · '}
                    {item.last_login_at
                      ? `Last sign-in ${formatDateTime(item.last_login_at)}`
                      : 'Never signed in'}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line pt-3.5">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() =>
                    patch(
                      item.id,
                      { is_active: !item.is_active },
                      item.is_active
                        ? `${item.full_name} can no longer sign in.`
                        : `${item.full_name} can sign in again.`
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft disabled:opacity-50 cursor-pointer"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{item.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => {
                    setResetFor(resetFor === item.id ? null : item.id);
                    setResetPassword('');
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Reset password</span>
                </button>
                {confirmDeleteId === item.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Confirm delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Keep</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-canvas px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {resetFor === item.id ? (
                <form
                  className="mt-3 flex flex-col gap-2 rounded-lg bg-neutral-soft/60 p-3 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    patch(item.id, { temporaryPassword: resetPassword }, `New temporary password set for ${item.full_name}.`);
                  }}
                >
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="New temporary password (min 8 characters)"
                    className={`${inputCls} sm:flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setResetPassword(generatePassword())}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Generate</span>
                  </button>
                  <button
                    type="submit"
                    disabled={busyId === item.id}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    <span>Set password</span>
                  </button>
                </form>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
