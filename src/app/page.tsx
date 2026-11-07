import { redirect } from 'next/navigation';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';

export default async function RootPage() {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
}
