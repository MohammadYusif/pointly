import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login';
  const hasAuthCookie = request.cookies.has('pointly-auth');

  if (!isLoginPage && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoginPage && hasAuthCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|logos).*)'],
};
