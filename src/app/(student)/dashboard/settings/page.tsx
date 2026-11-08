import { ShieldCheck } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { PasswordChangeForm } from '@/components/student/PasswordChangeForm';
import { PushNotificationsCard } from '@/components/student/PushNotificationsCard';
import { formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Settings',
};

export default async function StudentSettingsPage() {
  const profile = await requireStudentAppUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Password and account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-8">
          <PasswordChangeForm />
          <PushNotificationsCard />
        </div>

        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-line bg-neutral-soft/65 p-6 space-y-4 lg:rounded-[26px] lg:p-7">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-burgundy" />
              <h2 className="text-sm font-semibold text-charcoal">Your sign-in</h2>
            </div>

            <dl className="divide-y divide-line text-xs">
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Username</dt>
                <dd className="font-mono font-semibold text-charcoal">{profile.username}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Role</dt>
                <dd className="capitalize font-medium text-charcoal">{profile.role}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">Last signed in</dt>
                <dd className="font-mono text-charcoal">{formatDateTime(profile.last_login_at)}</dd>
              </div>
            </dl>

            <p className="text-xs text-muted leading-relaxed">
              Forgot your password? Your administrator can reset it for you.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
