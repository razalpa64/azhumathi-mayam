import { requireMainAdminUser } from '@/lib/auth/session';
import { TeamManagerClient } from '@/components/admin/TeamManagerClient';

export const metadata = {
  title: 'Sub-admin Team',
};

export default async function AdminTeamPage() {
  // Super-admin only — sub-admins never see this page (redirected to /admin).
  await requireMainAdminUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">Sub-admin team</h1>
        <p className="mt-1 text-sm text-muted">
          People who help upload notes and answer requests — without access to student accounts.
        </p>
      </div>

      <TeamManagerClient />
    </div>
  );
}
