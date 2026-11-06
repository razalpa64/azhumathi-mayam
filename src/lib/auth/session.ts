import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Profile, WebsiteSettings } from '@/types/database';

const PROFILE_SELECT = `
  *,
  university:universities(id, name, short_name, location, website_url, is_active, display_order, created_at, updated_at),
  programme:programmes(id, university_id, code, name, full_title, degree_level, total_semesters, has_specializations, description, is_active, display_order, created_at, updated_at),
  specialization:specializations(id, programme_id, code, name, description, is_active, display_order, created_at, updated_at),
  regulation:academic_regulations(id, university_id, programme_id, code, name, batch_range, is_active, display_order, created_at, updated_at),
  semester:semesters(id, programme_id, semester_number, label, is_active, created_at, updated_at)
`;

export async function getAuthenticatedProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return null;
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return null;
  }

  if (!profile.is_active) {
    return null;
  }

  return profile as unknown as Profile;
}

export async function requireAuthenticatedUser(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  return profile;
}

export async function requireStudentAppUser(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  if (profile.role === 'admin') {
    redirect('/admin');
  }
  return profile;
}

export async function requireAdminUser(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  if (profile.role !== 'admin') {
    redirect('/dashboard');
  }
  return profile;
}

export async function requireApiAuth(): Promise<
  { ok: true; profile: Profile } | { ok: false; response: NextResponse }
> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, profile };
}

export async function requireApiAdmin(): Promise<
  { ok: true; profile: Profile } | { ok: false; response: NextResponse }
> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      ),
    };
  }
  if (profile.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, profile };
}

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('website_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (data) {
    return data as WebsiteSettings;
  }

  return {
    id: 1,
    platform_name: 'അഴിമതി മയം',
    notices_enabled: true,
    ads_enabled: false,
    adsense_publisher_id: null,
    require_ad_consent: false,
    allow_cross_programme_browsing: true,
    storage_provider: 'google_drive_link',
    support_email: null,
    updated_by: null,
    updated_at: new Date().toISOString(),
  };
}

export async function logAdminActivity(params: {
  adminId: string;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('admin_activity_logs').insert({
      admin_id: params.adminId,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      summary: params.summary,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('Failed to write admin activity log:', err);
  }
}
