import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Profile, WebsiteSettings } from '@/types/database';

/** Cache tag for website settings — reused by the admin save route. */
export const SETTINGS_CACHE_TAG = 'website-settings';

const PROFILE_SELECT = `
  *,
  university:universities(id, name, short_name, location, website_url, is_active, display_order, created_at, updated_at),
  programme:programmes(id, university_id, code, name, full_title, degree_level, total_semesters, has_specializations, description, is_active, display_order, created_at, updated_at),
  specialization:specializations(id, programme_id, code, name, description, is_active, display_order, created_at, updated_at),
  regulation:academic_regulations(id, university_id, programme_id, code, name, batch_range, is_active, display_order, created_at, updated_at),
  semester:semesters(id, programme_id, semester_number, label, is_active, created_at, updated_at)
`;

/**
 * Wrapped in React cache(): the student layout AND the page both ask for
 * the profile during one navigation — without this, every click paid for
 * two auth checks + two joined profile queries. Now it's one per request.
 */
export const getAuthenticatedProfile = cache(fetchAuthenticatedProfile);

async function fetchAuthenticatedProfile(): Promise<Profile | null> {
  try {
    return await readAuthenticatedProfile();
  } catch {
    // A network blip between the server and Supabase (or a cold project
    // waking up) rejects the auth call. That used to throw out of every page
    // and land the visitor on the full-page error screen. One quick retry
    // covers the blip; after that the visitor is simply treated as signed
    // out, which sends them to /login — a page that still works when the
    // database does not.
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return await readAuthenticatedProfile();
    } catch {
      return null;
    }
  }
}

async function readAuthenticatedProfile(): Promise<Profile | null> {
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

/** The super administrator (admin@invytra) — the only account tier that
 *  may manage students, sub-admins, notices, ads and site settings. */
export function isMainAdminRole(role: Profile['role']): boolean {
  return role === 'admin';
}

/** Staff = super admin or sub-admin (content managers). */
export function isStaffRole(role: Profile['role']): boolean {
  return role === 'admin' || role === 'sub_admin';
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
  if (isStaffRole(profile.role)) {
    redirect('/admin');
  }
  return profile;
}

/** Super-admin-only pages (students, team, notices, ads, analytics, settings). */
export async function requireMainAdminUser(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  if (!isMainAdminRole(profile.role)) {
    redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
  }
  return profile;
}

/** Staff pages — super admin and sub-admins (content management). */
export async function requireStaffUser(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    redirect('/login');
  }
  if (!isStaffRole(profile.role)) {
    redirect('/dashboard');
  }
  return profile;
}

/** @deprecated Use requireMainAdminUser / requireStaffUser. Kept as the
 *  strict super-admin guard for any not-yet-migrated call site. */
export async function requireAdminUser(): Promise<Profile> {
  return requireMainAdminUser();
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

export async function requireApiStaff(): Promise<
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
  if (!isStaffRole(profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Staff privileges required.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, profile };
}

/**
 * Settings are read by every layout (AdSense gate) and most pages (ads,
 * notices switch), but they change only when an admin saves the settings
 * screen. React `cache` alone still meant one database round trip per
 * request; this caches across requests and is invalidated by tag from
 * the admin route, with a 5-minute expiry as a safety net.
 */
export const getWebsiteSettings = cache(
  unstable_cache(fetchWebsiteSettings, ['website-settings'], {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 300,
  })
);

async function fetchWebsiteSettings(): Promise<WebsiteSettings> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('website_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (data) {
      return data as WebsiteSettings;
    }
  } catch {
    // Settings are decoration: support address, ad switches, platform name.
    // A page must never fail because the row could not be read. The defaults
    // below get cached for the same five minutes as a real read, so a blip
    // can hide the settings briefly — far better than a blank page.
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
