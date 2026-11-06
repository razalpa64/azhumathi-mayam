import { requireAdminUser, getWebsiteSettings } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdsManagerClient } from '@/components/admin/AdsManagerClient';
import type { Advertisement } from '@/types/database';

export const metadata = {
  title: 'Advertisements Management',
};

export default async function AdminAdvertisementsPage() {
  await requireAdminUser();
  const adminClient = createSupabaseAdminClient();

  const [{ data: ads }, settings] = await Promise.all([
    adminClient.from('advertisements').select('*').order('created_at', { ascending: false }),
    getWebsiteSettings(),
  ]);

  return (
    <AdsManagerClient
      initialAds={(ads || []) as Advertisement[]}
      initialSettings={settings}
    />
  );
}
