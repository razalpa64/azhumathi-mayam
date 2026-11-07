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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Allow API routes to perform their own JSON 401/403 checks
    if (pathname.startsWith('/api/')) {
      return supabaseResponse;
    }

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isRootPage = pathname === '/';
    const isAdminRoute = pathname.startsWith('/admin');
    const isStudentProtectedRoute =
      pathname.startsWith('/dashboard') || pathname.startsWith('/resources');

    if (!user) {
      if (isAdminRoute || isStudentProtectedRoute || isRootPage) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        if (isStudentProtectedRoute || isAdminRoute) {
          loginUrl.searchParams.set('next', pathname);
        }
        return NextResponse.redirect(loginUrl);
      }
      return supabaseResponse;
    }

    // Verify role & active status from profiles table
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
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
};
