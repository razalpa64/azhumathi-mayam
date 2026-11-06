import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const proto = headerStore.get('x-forwarded-proto') || 'http';
  const isHttps = proto.includes('https');

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: isHttps ? 'none' : 'lax',
                secure: isHttps,
                path: '/',
              })
            );
          } catch {
            // Called from a Server Component — middleware refreshes session cookies
          }
        },
      },
    }
  );
}
