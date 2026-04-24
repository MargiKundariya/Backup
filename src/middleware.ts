import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/auth/callback'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore static assets
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublic = PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Extract auth token from cookies
  const token = req.cookies.get('auth_token')?.value;

  // If trying to access a private route without a token
  if (!isPublic && (!token || token === '')) {
    console.log(`[middleware] No token, denying access to ${pathname}`);
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToLogin(req);
  }

  // If we have a token, verify it
  if (token && token !== '') {
    try {
      // Verify our native JWT
      const payload = await verifyToken(token);

      // Enforce admin role for /admin routes
      if (pathname.startsWith('/admin') && payload.role !== 'super_admin') {
        console.log(`[middleware] Forbidden: user ${payload.sub} is not an admin`);
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Optional: If logged in user hits /login, redirect them away
      if (pathname === '/login' || pathname === '/register') {
        if (payload.role === 'user' && payload.expired) {
          return NextResponse.redirect(new URL('/expired', req.url));
        }
        return NextResponse.redirect(new URL(payload.role === 'super_admin' ? '/admin' : '/', req.url));
      }

      // Check if license is expired for normal users
      if (payload.role === 'user' && payload.expired) {
        if (pathname !== '/expired' && !pathname.startsWith('/api/auth/logout')) {
           // Allow API logout, but block everything else for expired users
           if (pathname.startsWith('/api')) {
             return NextResponse.json({ error: 'License Expired' }, { status: 403 });
           }
           return NextResponse.redirect(new URL('/expired', req.url));
        }
      }

      // If user is NOT expired but hits /expired, redirect them away
      if (pathname === '/expired' && (!payload.expired || payload.role === 'super_admin')) {
        return NextResponse.redirect(new URL('/', req.url));
      }

    } catch (err) {
      console.error('[middleware auth error]', err);
      // Only clear and redirect if we were trying to access a private route
      if (!isPublic) {
        if (pathname.startsWith('/api')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return redirectToLogin(req);
      }
    }
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  // Avoid appending ?next=/ if they just went to root
  if (req.nextUrl.pathname !== '/') {
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

/**
 * Configure which routes this middleware should apply to.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
