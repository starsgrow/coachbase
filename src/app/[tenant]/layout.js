import { getCoachBySlug } from '@/lib/coachUtils';
import { getAuthenticatedCoach } from '@/lib/supabaseAuth';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);
  const nombre = coach?.nombre_marca || tenant.charAt(0).toUpperCase() + tenant.slice(1);

  return {
    title: `${nombre} — App Personalizada`,
    description: coach?.descripcion_corta || `Plataforma oficial de entrenamiento y nutrición de ${nombre}`,
  };
}

export default async function TenantLayout({ children, params }) {
  const { tenant } = await params;
  const coachData = await getCoachBySlug(tenant);

  // Verificar si el visitante actual es el coach dueño de este tenant
  const auth = await getAuthenticatedCoach(tenant);
  const isCoachAuth = !!auth;

  // Fallback de branding si aún no existe en Supabase (ej: para demos locales)
  const coachBranding = {
    nombreMarca: coachData?.nombre_marca || `${tenant.toUpperCase()} Performance`,
    colorPrimary: coachData?.color_primario || (tenant === 'fitjuan' ? '#FF6B35' : tenant === 'andrea' ? '#EC4899' : '#6366F1'),
    colorSecondary: coachData?.color_secundario || '#0F172A',
    logoUrl: coachData?.logo_url || null,
  };

  const initials = tenant.substring(0, 2).toUpperCase();

  return (
    <div
      style={{
        '--color-primary': coachBranding.colorPrimary,
        '--color-secondary': coachBranding.colorSecondary,
      }}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col"
    >
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/${tenant}`} className="flex items-center gap-3 relative z-10">
            {coachBranding.logoUrl ? (
              <img
                src={coachBranding.logoUrl}
                alt={coachBranding.nombreMarca}
                className="w-9 h-9 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-lg"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {initials}
              </div>
            )}
            <span className="font-bold text-lg tracking-tight truncate max-w-[200px] md:max-w-none">
              {coachBranding.nombreMarca}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href={`/${tenant}`} className="hover:text-white transition-colors">
              Inicio
            </Link>

            {/* Rutinas unificado */}
            <Link
              href={isCoachAuth ? `/${tenant}/panel/rutinas` : `/${tenant}/rutinas`}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              Rutinas
            </Link>

            {/* Nutrición unificado */}
            <Link
              href={isCoachAuth ? `/${tenant}/panel/nutricion` : `/${tenant}/nutricion`}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              Nutrición
            </Link>

            <Link href={`/${tenant}/videos`} className="hover:text-white transition-colors">
              Comunidad
            </Link>
            
            {/* Solo visible para el coach */}
            {isCoachAuth ? (
              <>
                <Link href={`/${tenant}/panel/entrenador`} className="hover:text-white transition-colors flex items-center gap-1 font-bold text-indigo-400">
                  ⚡ Entrenador
                </Link>
                <Link href={`/${tenant}/panel/ejercicios`} className="hover:text-white transition-colors flex items-center gap-1">
                  Ejercicios
                </Link>
                <Link href={`/${tenant}/panel/alumnos`} className="hover:text-white transition-colors flex items-center gap-1">
                  Alumnos
                </Link>
                <Link href={`/${tenant}/panel/marca`} className="hover:text-white transition-colors flex items-center gap-1">
                  Mi Marca
                </Link>
                <Link
                  href={`/${tenant}/panel`}
                  className="px-4 py-2 rounded-xl text-white font-semibold text-xs transition-all shadow-md hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Panel Coach
                </Link>
              </>
            ) : (
              <Link
                href={`/${tenant}/login`}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
              >
                Iniciar Sesión
              </Link>
            )}
          </nav>

          {/* Mobile Nav */}
          <MobileNav 
            tenant={tenant} 
            isCoachAuth={isCoachAuth} 
            nombreCoach={coachBranding.nombreMarca} 
          />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
