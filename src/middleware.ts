import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isTransientAuthError } from '@/lib/auth/transient';

/**
 * A redirect that keeps the session cookies the request just refreshed.
 *
 * `supabase.auth.getUser()` rotates the refresh token and writes the new
 * cookies onto the carrier response. Building a bare redirect throws them
 * away, so the browser keeps a token the server has already retired — and the
 * next refresh fails. To the person using the console, that looks like being
 * logged out at random, a while after signing in.
 */
function redirectKeepingSession(url: URL, carrier: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of carrier.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

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

    // Refresh the session here, on every page request — public ones included.
    //
    // A Server Component cannot write cookies, so if the refresh happens
    // while rendering, the new cookies are dropped on the floor and the
    // refresh token that was just rotated is lost with them. Only the
    // middleware (and route handlers) can persist it, which makes this call
    // the thing that keeps an admin signed in past the first hour.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const authUnreachable = isTransientAuthError(authError);

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isRootPage = pathname === '/';
    const isAdminRoute = pathname.startsWith('/admin');
    const isStudentProtectedRoute = pathname.startsWith('/dashboard');
    // /resources/<id> is deliberately NOT gated here: shared material
    // links land on WhatsApp, and a forwarded link must open a real
    // preview (what the paper is, which subject) rather than a blank
    // login wall. The page itself serves the preview when logged out and
    // the full viewer when signed in.

    // Public pages that check the session themselves: the landing page
    // redirects signed-in users, the calculator renders inside the app
    // shell when signed in, and a shared material link decides between
    // the public preview and the full viewer. Their first byte should not
    // wait for the profile query below — the refresh above still happens.
    const isSelfCheckingPublicPage =
      isRootPage || pathname === '/sgpa-calculator' || pathname.startsWith('/resources');
    if (isSelfCheckingPublicPage) {
      return supabaseResponse;
    }

    if (!user) {
      // "The auth server did not answer" is not the same as "you are signed
      // out". Bouncing someone to /login over a blip is how a session looks
      // like it ended on its own; the page behind this request checks again.
      if (authUnreachable) {
        return supabaseResponse;
      }

      if (isAdminRoute || isStudentProtectedRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        // Keep the full path + query so shared deep links (e.g.
        // /dashboard/materials?subjectId=… from a WhatsApp forward)
        // land exactly where they were meant to after signing in.
        loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
        return redirectKeepingSession(loginUrl, supabaseResponse);
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    // A failed read is not a verdict about the account. This used to fall
    // through to signOut() below, so one flaky query ended an admin's session
    // for good and asked for the password again. Let the page decide instead;
    // every admin page re-checks the profile through its own layout.
    if (profileError) {
      return supabaseResponse;
    }

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('reason', 'deactivated');
      return redirectKeepingSession(loginUrl, supabaseResponse);
    }

    // Staff = super admin + sub-admins; both belong in the console.
    const isStaff = profile.role === 'admin' || profile.role === 'sub_admin';

    // Redirect authenticated users away from /, /login, or /register to their role home
    if (isRootPage || isAuthPage) {
      const dest = request.nextUrl.clone();
      dest.pathname = isStaff ? '/admin' : '/dashboard';
      dest.search = '';
      return redirectKeepingSession(dest, supabaseResponse);
    }

    // Strictly block students from /admin/*
    if (isAdminRoute && !isStaff) {
      const dest = request.nextUrl.clone();
      dest.pathname = '/dashboard';
      dest.search = '';
      return redirectKeepingSession(dest, supabaseResponse);
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
