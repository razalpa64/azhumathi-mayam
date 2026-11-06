import { ShieldCheck } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { PasswordChangeForm } from '@/components/student/PasswordChangeForm';
import { formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Account Settings',
};

export default async function StudentSettingsPage() {
  const profile = await requireStudentAppUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Account Settings & Security
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account password and review your authenticated session details.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PasswordChangeForm />
        </div>

        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-line bg-neutral-soft/65 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-burgundy" />
              <h2 className="text-sm font-semibold text-charcoal">Session & Access Details</h2>
            </div>

            <dl className="divide-y divide-line text-xs">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Login Identifier</dt>
                <dd className="font-mono font-semibold text-charcoal">{profile.username}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Assigned Role</dt>
                <dd className="capitalize font-medium text-charcoal">{profile.role}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Last Authenticated</dt>
                <dd className="font-mono text-charcoal">{formatDateTime(profile.last_login_at)}</dd>
              </div>
            </dl>

            <p className="text-xs text-muted leading-relaxed">
              If you lose access to your password, contact your institutional administrator to issue
              a secure password reset.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
