import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/dashboard', '/projects', '/keywords', '/snapshots', '/settings'];

export function middleware(request: NextRequest) {
  const basicAuthResponse = enforceBasicAuth(request);
  if (basicAuthResponse) {
    return basicAuthResponse;
  }

  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  if (!authEnabled) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get('seo_token'));
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

function enforceBasicAuth(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return null;
  }

  const authorization = request.headers.get('authorization');
  const credentials = parseBasicAuth(authorization);

  if (credentials?.username === username && credentials.password === password) {
    return null;
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SEO Intelligence"',
    },
  });
}

function parseBasicAuth(authorization: string | null) {
  if (!authorization?.startsWith('Basic ')) {
    return null;
  }

  try {
    const decoded = atob(authorization.slice('Basic '.length));
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}
