import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. SIEMPRE permitir rutas del sistema, estáticos, auth global y APIs
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/registro') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Dominios principales que NUNCA deben extraer subdominio de coach (Vercel, localhost, olympo.pro)
  const isMainDomain =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('vercel.app') ||
    hostname === 'olympo.pro' ||
    hostname === 'www.olympo.pro' ||
    hostname === 'app.olympofit.com' ||
    hostname === 'coach.app.olympofit.com';

  if (isMainDomain) {
    return NextResponse.next();
  }

  let subdomain = null;

  // 3. Extraer subdominio en dominios personalizados (ej: miguel.olympo.pro -> miguel)
  const parts = hostname.split('.');
  if (parts.length > 2 && parts[0] !== 'www') {
    subdomain = parts[0];
  }

  if (!subdomain) {
    return NextResponse.next();
  }

  let targetPath = url.pathname;
  if (targetPath.startsWith(`/${subdomain}/`)) {
    targetPath = targetPath.substring(subdomain.length + 1);
  } else if (targetPath === `/${subdomain}`) {
    targetPath = '/';
  }

  const response = NextResponse.rewrite(
    new URL(`/${subdomain}${targetPath}${url.search}`, request.url)
  );

  response.headers.set('x-tenant-slug', subdomain);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
