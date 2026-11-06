'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PasswordChangeForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Could not update password.' });
      } else {
        setFeedback({ type: 'success', text: 'Your password has been updated securely.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-line bg-canvas p-6 sm:p-8 space-y-5 max-w-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-charcoal">Change password</h2>
          <p className="mt-1 text-xs text-muted">
            Enter your current password, then pick a new one (8+ characters).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPasswords((v) => !v)}
          className="inline-flex items-center gap-1 rounded border border-line bg-neutral-soft px-2.5 py-1 text-xs font-medium text-charcoal hover:bg-neutral-inset cursor-pointer"
        >
          {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span>{showPasswords ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-1.5 block text-xs font-semibold text-charcoal"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type={showPasswords ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-1.5 block text-xs font-semibold text-charcoal">
            New Password
          </label>
          <input
            id="newPassword"
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-xs font-semibold text-charcoal"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              <span>Update Password</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
