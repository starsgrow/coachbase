import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. Ignorar peticiones de Next.js internals, API, recursos estáticos y rutas globales de autenticación
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

  // 2. Dominios principales sin subdominio de coach
  const isMainDomain =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.startsWith('www.') ||
    hostname === 'olympo.pro' ||
    hostname === 'app.olympofit.com' ||
    hostname.endsWith('.vercel.app');

  let subdomain = null;

  // 3. Extraer subdominio si no es dominio principal
  if (!isMainDomain) {
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }

  // Si no hay subdominio, dejar pasar a la landing normal o ruta estándar
  if (!subdomain) {
    return NextResponse.next();
  }

  // Prevenir duplicados de ruta cuando se navega con subdominio (ej: andrea.olympo.pro/andrea/panel -> /andrea/panel)
  let targetPath = url.pathname;
  if (targetPath.startsWith(`/${subdomain}/`)) {
    targetPath = targetPath.substring(subdomain.length + 1);
  } else if (targetPath === `/${subdomain}`) {
    targetPath = '/';
  }

  // Reescribir internamente a la ruta [tenant]
  const response = NextResponse.rewrite(
    new URL(`/${subdomain}${targetPath}${url.search}`, request.url)
  );

  response.headers.set('x-tenant-slug', subdomain);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
