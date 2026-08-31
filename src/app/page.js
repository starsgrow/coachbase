import { Dumbbell, Sparkles, Video, ExternalLink, ArrowRight, UserPlus, LogIn, CheckCircle2, Zap, Shield, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function RootHomePage() {
  // Obtener lista de coaches para mostrar sus portales en la demo
  let coaches = [];
  try {
    const { data } = await supabaseServer
      .from('coaches')
      .select('id, slug, nombre_marca, color_primario')
      .order('created_at', { ascending: false })
      .limit(6);
    coaches = data || [];
  } catch (e) {
    coaches = [];
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      {/* Header Minimalista */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              O
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Olympo <span className="text-indigo-400">Pro</span>
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" /> Iniciar Sesión
            </Link>
            <Link
              href="/auth/registro"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" /> Crear Mi App
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal / Hero */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-12">
        {/* Badge de Presentación */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs font-bold text-indigo-300 shadow-sm shadow-indigo-500/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Plataforma Marca Blanca para Coaches Fitness
          </span>
        </div>

        {/* Título Principal */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Tu Propia App Fitness con tu <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">Marca y Subdominio</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Olvídate de los PDFs y hojas de cálculo. Ofrece a tus alumnos un portal exclusivo con videoteca en alta definición, rutinas creadas con IA y seguimiento personalizado.
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            href="/auth/registro"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm hover:scale-[1.02] active:scale-95"
          >
            🚀 Crear Mi App Gratis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold px-6 py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            Acceder al Panel
          </Link>
        </div>

        {/* 3 Pilares Básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-8 text-left">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Marca y Subdominio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu portal personalizado en <span className="text-indigo-300 font-mono">tucoach.olympo.pro</span> con tu logo, colores de marca y canales de contacto.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Rutinas con IA y Voz</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diseña programas de entrenamiento en segundos usando dictado por voz, visión computacional o autocompletado inteligente.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Videoteca y Streaming HD</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sube tus videos demostrativos protegidos en CDN de alta velocidad para que tus alumnos ejecuten la técnica perfecta.
            </p>
          </div>
        </div>

        {/* Portales de Coaches Activos / Demo */}
        {coaches.length > 0 && (
          <div className="pt-8 border-t border-slate-900">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Portales de Entrenamiento en Demostración
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {coaches.map((c) => (
                <a
                  key={c.id}
                  href={`http://${c.slug}.localhost:3000`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500 p-3.5 rounded-xl text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: c.color_primario || '#6366F1' }}
                    >
                      {c.slug.slice(0, 2).toUpperCase()}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs truncate group-hover:text-indigo-300">
                      {c.nombre_marca || c.slug}
                    </h5>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      {c.slug}.olympo.pro
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 bg-slate-950">
        <p>© {new Date().getFullYear()} Olympo Pro • Plataforma Marca Blanca para Entrenadores y Atletas.</p>
      </footer>
    </div>
  );
}
