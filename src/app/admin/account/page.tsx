import { BadgeCheck, Lock } from 'lucide-react';
import { requireStaffUser } from '@/lib/auth/session';
import { PasswordChangeForm } from '@/components/student/PasswordChangeForm';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'My Account',
};

const STAFF_CAN = [
  'Upload and manage study materials (notes, question papers, short notes)',
  'Manage subjects and the course catalogue (programmes, branches, schemes, semesters)',
  'Read and answer student requests',
];

const SUB_ADMIN_CANNOT = [
  'Student accounts — creating, viewing or changing them',
  'Creating or managing other admin accounts',
  'Notices, advertisements, site settings and the audit log',
];

export default async function AdminAccountPage() {
  const profile = await requireStaffUser();
  const isMainAdmin = profile.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">My account</h1>
        <p className="mt-1 text-sm text-muted">Your sign-in details and console permissions.</p>
      </div>

      {profile.must_change_password ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-relaxed text-amber-900">
          You&apos;re using a temporary password. Set your own below — the person who created your
          account can&apos;t see your new one.
        </p>
      ) : null}

      <section className="rounded-xl border border-line bg-canvas p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-charcoal">{profile.full_name}</h2>
          <Badge variant="burgundy">
            {isMainAdmin ? 'Super Administrator' : 'Sub Administrator'}
          </Badge>
        </div>
        <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-[10px]">Username</dt>
            <dd className="mt-0.5 font-mono text-charcoal">@{profile.username}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-[10px]">Last sign-in</dt>
            <dd className="mt-0.5 text-charcoal">
              {profile.last_login_at ? formatDateTime(profile.last_login_at) : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-charcoal">With this account you can</p>
            <ul className="mt-2 space-y-1.5">
              {STAFF_CAN.map((item) => (
                <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-muted">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  {item}
                </li>
              ))}
              {isMainAdmin ? (
                <li className="flex gap-1.5 text-xs leading-relaxed text-muted">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  Everything else too — students, team, notices, settings and the audit log.
                </li>
              ) : null}
            </ul>
          </div>
          {!isMainAdmin ? (
            <div>
              <p className="text-xs font-semibold text-charcoal">Kept with the super admin</p>
              <ul className="mt-2 space-y-1.5">
                {SUB_ADMIN_CANNOT.map((item) => (
                  <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-muted">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-canvas p-5">
        <h2 className="text-sm font-semibold text-charcoal">Change password</h2>
        <p className="mt-1 text-xs text-muted">
          Use a password you don&apos;t share with any other account.
        </p>
        <div className="mt-4 max-w-md">
          <PasswordChangeForm />
        </div>
      </section>
    </div>
  );
}
