import { getCoachBySlug, getCoachVideos } from '@/lib/coachUtils';
import { Play, Lock, Film, Sparkles } from 'lucide-react';

export default async function VideosPage({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);
  const realVideos = coach ? await getCoachVideos(coach.id) : [];

  const nombreCoach = coach?.nombre_marca || `Coach ${tenant}`;

  // Si no hay videos en DB aún, mostrar lista demo inicial
  const videoList = realVideos.length > 0
    ? realVideos.map((v) => ({
        id: v.id,
        titulo: v.titulo,
        duracion: v.duracion_segundos ? `${Math.floor(v.duracion_segundos / 60)}:${v.duracion_segundos % 60}` : '05:00',
        categoria: v.categoria || 'Tutorial',
        premium: v.solo_premium,
        thumbnail: v.thumbnail_url,
        urlStream: v.url_stream,
      }))
    : [
        { id: 1, titulo: 'Técnica Correcta de Hip Thrust', duracion: '04:15', categoria: 'Tutorial', premium: false },
        { id: 2, titulo: 'Rutina Completa HIIT de Hombro', duracion: '12:30', categoria: 'Rutina', premium: false },
        { id: 3, titulo: 'Masterclass: Nutrición y Carga de Carbohidratos', duracion: '24:10', categoria: 'Exclusivo', premium: true },
        { id: 4, titulo: 'Evita estos 3 Errores en Sentadilla', duracion: '06:45', categoria: 'Tutorial', premium: false },
        { id: 5, titulo: 'Movilidad de Cadera antes de Entrenar', duracion: '08:20', categoria: 'Warm-up', premium: false },
      ];

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Streaming & Contenido
        </span>
        <h1 className="text-3xl font-black text-white mt-1">
          Biblioteca de Videos — {nombreCoach}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Aprende la técnica exacta de cada ejercicio y mira rutinas guiadas exclusivas.
        </p>
      </div>

      {/* Grid de Videos */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {videoList.map((video) => (
          <div
            key={video.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group cursor-pointer"
          >
            <div className="aspect-video bg-slate-950 relative flex items-center justify-center">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.titulo} className="w-full h-full object-cover" />
              ) : (
                <Play className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] px-1.5 py-0.5 rounded text-white font-mono z-10">
                {video.duracion}
              </span>
              {video.premium && (
                <span className="absolute top-2 left-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                  <Lock className="w-3 h-3" /> VIP
                </span>
              )}
            </div>

            <div className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {video.categoria}
              </span>
              <h4 className="font-bold text-slate-100 text-sm mt-1 group-hover:text-indigo-300 transition-colors line-clamp-1">
                {video.titulo}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
