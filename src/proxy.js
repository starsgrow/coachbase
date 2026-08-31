import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Dominios principales sin subdominio de coach
  const mainDomains = ['localhost:3000', '127.0.0.1:3000', 'olympo.pro', 'www.olympo.pro', 'olympo-coaches.vercel.app'];

  // Ignorar peticiones de API o recursos estáticos
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let subdomain = null;

  // Extraer subdominio (ej: carlos.olympo.pro -> carlos, andrea.localhost:3000 -> andrea)
  if (!mainDomains.includes(hostname)) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  }

  // Si no hay subdominio, estamos en la landing principal
  if (!subdomain) {
    return NextResponse.next();
  }

  // Prevenir duplicados de ruta cuando se navega con subdominio (ej: andrea.localhost:3000/andrea/panel -> /andrea/panel)
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

  // Inyectar el slug del coach en los headers para que lo lean los Server Components
  response.headers.set('x-tenant-slug', subdomain);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
