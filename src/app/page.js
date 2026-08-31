import {
  Dumbbell,
  Sparkles,
  Video,
  ExternalLink,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  Zap,
  Shield,
  Smartphone,
  Activity,
  BarChart3,
  Utensils,
  FileDown,
  Timer,
  Play,
  Flame,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function RootHomePage() {
  // Obtener lista de coaches activos para mostrar en el escaparate
  let coaches = [];
  try {
    const { data } = await supabaseServer
      .from("coaches")
      .select("id, slug, nombre_marca, color_primario, color_secundario, logo_url")
      .order("created_at", { ascending: false })
      .limit(6);
    coaches = data || [];
  } catch (e) {
    coaches = [];
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Luces de Fondo / Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-sky-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-[200px] left-1/4 w-[350px] h-[350px] bg-emerald-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Grid Pattern Sutil */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" 
      />

      {/* Header Minimalista & Glassmorphic */}
      <header className="border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-[1px] shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center font-black text-white text-lg">
                <Dumbbell className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white leading-tight">
                Olympo <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Pro</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Coach & Athlete Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl hover:bg-slate-900/90 border border-transparent hover:border-slate-800 transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Iniciar Sesión</span>
            </Link>

            <Link
              href="/auth/registro"
              className="relative group overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 border border-indigo-400/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Mi App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal / Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center space-y-16">
        
        {/* Badge Hero */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-indigo-300 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Plataforma Marca Blanca 100% Personalizada para Coaches Fitness</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Headline Principal */}
        <div className="space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
            Tu Propia App Fitness con tu{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              Marca, Logo y Subdominio
            </span>
          </h1>
          <p className="text-slate-300 text-base sm:text-xl leading-relaxed max-w-2xl mx-auto font-normal">
            Digitaliza tu negocio de coaching. Ofrece a tus alumnos un portal interactivo con{" "}
            <strong className="text-white font-semibold">Modo Entrenador en Vivo</strong>, videoteca en CDN de alta velocidad y{" "}
            <strong className="text-white font-semibold">Sobrecarga Progresiva Científica</strong>.
          </p>
        </div>

        {/* Botones de Acción Hero */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/auth/registro"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:brightness-110 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 text-sm sm:text-base active:scale-95 border border-indigo-400/30"
          >
            🚀 Crear Mi App Gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold px-7 py-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base backdrop-blur-md hover:text-white"
          >
            <LogIn className="w-4 h-4 text-slate-400" /> Acceder al Panel
          </Link>
        </div>

        {/* Vista Previa Interactiva de la App / Live UI Mockup */}
        <div className="relative max-w-5xl mx-auto pt-6">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition duration-1000 -z-10" />
          
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-xl text-left space-y-6">
            {/* Header del Mockup */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">app.olympo.pro • Modo Entrenador</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Sesión en Vivo Activa
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                  Mesociclo 4 Semanas
                </span>
              </div>
            </div>

            {/* Grid del Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tarjeta 1: Ejercicio en Vivo */}
              <div className="md:col-span-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">1</span>
                      Press de Banca Inclinado con Barra
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Pecho • Tempo 2-0-1-0 • Descanso 90s</p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                    🎯 Meta S2: +2.5kg
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SET 1</span>
                    <span className="font-black text-white text-sm">21.0 kg</span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">10 reps ✓</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SET 2</span>
                    <span className="font-black text-white text-sm">21.0 kg</span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">10 reps ✓</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SET 3</span>
                    <span className="font-black text-white text-sm">21.0 kg</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">10 reps</span>
                  </div>
                  <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-300">
                    <span className="text-[10px] text-indigo-400 block">RIR</span>
                    <span className="font-black text-indigo-200 text-sm">RIR 2</span>
                    <span className="text-[10px] text-indigo-300 block font-semibold">Óptimo</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Panel de Control en Vivo */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                    <Timer className="w-3.5 h-3.5 text-indigo-400" /> Timer de Descanso
                  </span>
                  <div className="text-3xl font-black text-white font-mono tracking-tight text-indigo-400">
                    01:30
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-900 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Sobrecarga Progresiva:</span>
                    <strong className="text-emerald-400 font-bold">Activa (Doble Progresión)</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Cardio IMC / Hipertrofia:</span>
                    <strong className="text-sky-400 font-bold">Zona 2 (60-90 min)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Pilares Tecnológicos */}
        <div className="space-y-6 pt-8">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Todo lo que necesitas para escalar tu servicio de coaching
            </h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Herramientas de nivel profesional diseñadas por y para entrenadores de alto rendimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {/* Pilar 1 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Marca Blanca & Subdominio</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tu portal exclusivo en <span className="text-indigo-300 font-mono">tucoach.olympo.pro</span> con tu propio logo, colores de marca y enlaces directos a WhatsApp e Instagram.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Modo Entrenador en Vivo</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guía y evalúa a tus alumnos en tiempo real con temporizador integrado, control de RIR, series piramidales y sobrecarga progresiva multi-semana.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Videoteca Bunny CDN</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tus videos demostrativos alojados y protegidos en streaming HLS de alta velocidad para que tus clientes reproduzcan cada ejercicio al instante.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Nutrición & Planes de Dieta</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generación automática de requerimientos calóricos (TMB/GEAF), macronutrientes optimizados y catálogo verificado de alimentos con porciones.
              </p>
            </div>

            {/* Pilar 5 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Antropometría & Progresión</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seguimiento visual de curvas de fuerza por sesión, proyección de 4 semanas (base, acumulación, pico y deload) y medidas corporales.
              </p>
            </div>

            {/* Pilar 6 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/50 rounded-2xl p-6 space-y-3 transition-all hover:bg-slate-900/90 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <FileDown className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-white text-base">Exportación PDF Interactiva</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Descarga de planes de entrenamiento y nutrición con tu logotipo corporativo, tabla de intensidades y enlaces directos a tus videos de técnica.
              </p>
            </div>
          </div>
        </div>

        {/* Portales de Coaches Activos / Escaparate */}
        {coaches.length > 0 && (
          <div className="pt-10 border-t border-slate-900 space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Coaches Destacados en la Plataforma
              </h4>
              <p className="text-xs text-slate-500">Explora portales personalizados creados con Olympo Pro</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 max-w-5xl mx-auto">
              {coaches.map((c) => (
                <Link
                  key={c.id}
                  href={`/${c.slug}`}
                  className="bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/70 p-4 rounded-2xl text-left transition-all group flex flex-col justify-between hover:bg-slate-900 shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.nombre_marca || c.slug}
                        className="w-8 h-8 rounded-xl object-cover bg-slate-950 border border-slate-800"
                      />
                    ) : (
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner"
                        style={{ backgroundColor: c.color_primario || "#6366F1" }}
                      >
                        {c.slug.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition-colors">
                      {c.nombre_marca || c.slug}
                    </h5>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      /{c.slug}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Banner CTA Final */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/80 border border-indigo-500/30 p-8 sm:p-12 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Listo para llevar tu entrenamiento al siguiente nivel?
            </h3>
            <p className="text-slate-300 text-sm sm:text-base">
              Crea tu aplicación personalizada hoy mismo y entrega a tus clientes una experiencia de entrenamiento de élite.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/registro"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              Comenzar Ahora Gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              Acceso Entrenadores
            </Link>
          </div>
        </div>

      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <p className="font-semibold text-slate-400">© {new Date().getFullYear()} Olympo Pro • Plataforma Marca Blanca para Entrenadores y Atletas.</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            <span>•</span>
            <Link href="/auth/registro" className="hover:text-white transition-colors">Registro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
