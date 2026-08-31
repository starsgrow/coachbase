import { getCoachBySlug, getCoachVideos } from '@/lib/coachUtils';
import { Video, Sparkles, Play, Calendar, Lock } from 'lucide-react';
import Link from 'next/link';

export default async function TenantPage({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);
  const videos = coach ? await getCoachVideos(coach.id) : [];

  const nombreCoach = coach?.nombre_marca || `Coach ${tenant}`;

  return (
    <div className="space-y-10">
      {/* Banner del Coach */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white mb-4 shadow"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Sparkles className="w-3.5 h-3.5" /> App Exclusiva de {nombreCoach}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Entrena al máximo nivel con la guía de <span style={{ color: 'var(--color-primary)' }}>{nombreCoach}</span>
          </h1>
          <p className="mt-4 text-slate-300 text-base md:text-lg">
            {coach?.descripcion_corta ||
              'Bienvenido a tu portal personalizado. Aquí encontrarás tus rutinas diseñadas con IA, seguimiento de progreso y la biblioteca exclusiva de videos de tu coach.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href={`/${tenant}/rutinas`}
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 inline-block text-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Ver Mi Rutina de Hoy
            </Link>
            <Link
              href={`/${tenant}/videos`}
              className="px-6 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all inline-block text-center"
            >
              Explorar Videos
            </Link>
          </div>
        </div>
      </section>

      {/* Feed de Videos de la Comunidad */}
      <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-400" /> Contenido de la Comunidad
          </h2>

          {videos.length > 0 ? (
            <div className="space-y-4">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-700 transition-all"
                >
                  <div className="w-24 h-16 bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                    {vid.thumbnail_url ? (
                      <img src={vid.thumbnail_url} alt={vid.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-6 h-6 text-indigo-400" />
                    )}
                    {vid.solo_premium && (
                      <span className="absolute top-1 left-1 bg-amber-500/80 text-black text-[9px] font-extrabold px-1 rounded flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> VIP
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      {vid.categoria || 'Tutorial'}
                    </span>
                    <h4 className="font-semibold text-slate-100 text-sm line-clamp-1">{vid.titulo}</h4>
                    {vid.descripcion && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{vid.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-700 transition-all">
                <div className="w-24 h-16 bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                  <Play className="w-6 h-6 text-indigo-400" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1 rounded text-white font-mono">04:15</span>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Tutorial</span>
                  <h4 className="font-semibold text-slate-100 text-sm">Técnica Correcta de Hip Thrust</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Aprende a activar glúteos sin sobrecargar lumbar.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-700 transition-all">
                <div className="w-24 h-16 bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                  <Play className="w-6 h-6 text-indigo-400" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1 rounded text-white font-mono">12:30</span>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Rutina</span>
                  <h4 className="font-semibold text-slate-100 text-sm">Rutina de Hombro y Tríceps HIIT</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Sigue a tu coach paso a paso en tiempo real.</p>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
