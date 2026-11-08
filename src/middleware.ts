import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Defensive check: if environment variables are not configured in Vercel yet, pass through gracefully
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables.'
    );
    return supabaseResponse;
  }

  try {
    const proto =
      request.headers.get('x-forwarded-proto') ||
      request.nextUrl.protocol.replace(':', '') ||
      'http';
    const isHttps = proto.includes('https');

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                ...options,
                sameSite: isHttps ? 'none' : 'lax',
                secure: isHttps,
                path: '/',
              })
            );
          },
        },
      }
    );

    const pathname = request.nextUrl.pathname;

    // API routes perform their own JSON 401/403 checks (and refresh
    // their own session cookies via their Supabase server client), so
    // skip the auth network round-trip for them entirely — it used to
    // precede every API call, including chat/notification polling.
    if (pathname.startsWith('/api/')) {
      return supabaseResponse;
    }

    // Public pages that check the session themselves: the landing page
    // redirects signed-in users, the calculator renders inside the app
    // shell when signed in, and a shared material link decides between
    // the public preview and the full viewer. Running the middleware's
    // own getUser() + profile query first meant three or four database
    // round trips before the first byte of a public page.
    const isSelfCheckingPublicPage =
      pathname === '/' ||
      pathname === '/sgpa-calculator' ||
      pathname.startsWith('/resources');
    if (isSelfCheckingPublicPage) {
      return supabaseResponse;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isRootPage = pathname === '/';
    const isAdminRoute = pathname.startsWith('/admin');
    const isStudentProtectedRoute = pathname.startsWith('/dashboard');
    // /resources/<id> is deliberately NOT gated here: shared material
    // links land on WhatsApp, and a forwarded link must open a real
    // preview (what the paper is, which subject) rather than a blank
    // login wall. The page itself serves the preview when logged out and
    // the full viewer when signed in.

    if (!user) {
      if (isAdminRoute || isStudentProtectedRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        // Keep the full path + query so shared deep links (e.g.
        // /dashboard/materials?subjectId=… from a WhatsApp forward)
        // land exactly where they were meant to after signing in.
        loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
      // Everything else (/, /login, /register, public files) is public:
      // the root page renders the public landing page for visitors.
      return supabaseResponse;
    }

    // One profile lookup, and only when this request actually needs a
    // role decision:
    //   * /login and /register — to send a signed-in user to their home;
    //   * /admin — to keep students out of the console.
    // Every /dashboard page already resolves the profile in its layout
    // (`requireStudentAppUser`), so repeating the query here added a
    // database round trip to every single tap for no extra protection.
    const needsRoleCheck = isRootPage || isAuthPage || isAdminRoute;

    if (!needsRoleCheck) {
      return supabaseResponse;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('reason', 'deactivated');
      return NextResponse.redirect(loginUrl);
    }

    // Staff = super admin + sub-admins; both belong in the console.
    const isStaff = profile.role === 'admin' || profile.role === 'sub_admin';

    // Redirect authenticated users away from /, /login, or /register to their role home
    if (isRootPage || isAuthPage) {
      const dest = request.nextUrl.clone();
      dest.pathname = isStaff ? '/admin' : '/dashboard';
      dest.search = '';
      return NextResponse.redirect(dest);
    }

    // Strictly block students from /admin/*
    if (isAdminRoute && !isStaff) {
      const dest = request.nextUrl.clone();
      dest.pathname = '/dashboard';
      dest.search = '';
      return NextResponse.redirect(dest);
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware execution error:', error);
    return supabaseResponse;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|google0af7705d1a99715a.html).*)',
  ],
};
