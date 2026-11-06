import { requireAdminUser, getWebsiteSettings } from '@/lib/auth/session';
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient';

export const metadata = {
  title: 'Platform Settings',
};

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const settings = await getWebsiteSettings();

  return <AdminSettingsClient initialSettings={settings} />;
}
