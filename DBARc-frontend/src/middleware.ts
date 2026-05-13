import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_PORTAL_MAP: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  TENANT_ADMIN: '/courier',
  SHIPPER: '/merchant',
  RIDER: '/', // Riders might use a different app or a specific landing
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // 1. Redirect to login if accessing protected routes without token
  const isProtectedRoute = pathname.startsWith('/admin') || 
                          pathname.startsWith('/courier') || 
                          pathname.startsWith('/merchant');

  if (isProtectedRoute && !authToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 2. RBAC: Prevent accessing wrong portals
  if (authToken && userRole) {
    if (pathname.startsWith('/admin') && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(ROLE_PORTAL_MAP[userRole] || '/', request.url));
    }
    if (pathname.startsWith('/courier') && userRole !== 'TENANT_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(ROLE_PORTAL_MAP[userRole] || '/', request.url));
    }
    if (pathname.startsWith('/merchant') && userRole !== 'SHIPPER' && userRole !== 'SUPER_ADMIN') {
    if (pathname === '/auth/login') {
      return NextResponse.redirect(new URL(ROLE_PORTAL_MAP[userRole] || '/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/courier/:path*', '/merchant/:path*', '/auth/login'],
};
