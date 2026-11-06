import { redirect } from 'next/navigation';
import { getAuthenticatedProfile } from '@/lib/auth/session';

export default async function RootPage() {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
}
