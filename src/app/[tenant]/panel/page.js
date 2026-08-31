import VideoUploader from '@/components/VideoUploader';
import { getCoachStats, getCoachClientes, getCoachVideos } from '@/lib/coachUtils';
import { getAuthenticatedCoach } from '@/lib/supabaseAuth';
import { redirect } from 'next/navigation';
import { Users, Video, Palette, Dumbbell, Settings, List, Plus, Sparkles, CheckCircle2, ArrowRight, Apple } from 'lucide-react';
import Link from 'next/link';

export default async function PanelPage({ params }) {
  const { tenant } = await params;

  // Auth Guard: solo el coach dueño de este tenant puede acceder
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect('/auth/login');
  }

  const { coach } = auth;
  const stats = await getCoachStats(coach.id);
  const clientes = await getCoachClientes(coach.id);
  const videos = await getCoachVideos(coach.id);

  const nombreCoach = coach.nombre_marca || `Coach ${tenant}`;
  const coachId = coach.id;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Administración
          </span>
          <h1 className="text-3xl font-black text-white mt-1">
            Panel de Control — {nombreCoach}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestiona tus alumnos, contenido de video y personaliza tu app marca blanca.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/${tenant}/panel/rutinas`}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <Dumbbell className="w-3.5 h-3.5" /> Rutinas
          </Link>
          <Link
            href={`/${tenant}/panel/nutricion`}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <Apple className="w-3.5 h-3.5" /> Nutrición
          </Link>
          <Link
            href={`/${tenant}/panel/ejercicios`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <List className="w-3.5 h-3.5" /> Ejercicios
          </Link>
          <Link
            href="/auth/login"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Cuenta
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas Reales */}
      <div className="grid sm:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Alumnos Activos</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {stats?.total_clientes ?? clientes.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Videos Publicados</span>
            <Video className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {stats?.total_videos ?? videos.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Rutinas Asignadas</span>
            <Dumbbell className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {stats?.total_rutinas ?? 0}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Color de Marca</span>
            <Palette className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-6 h-6 rounded-full shadow border border-white/20"
              style={{ backgroundColor: coach?.color_primario || 'var(--color-primary)' }}
            />
            <span className="text-xs font-bold text-white uppercase font-mono">
              {coach?.color_primario || '#6366F1'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Operaciones */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Subida de Videos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" /> Subir Nuevo Video a Bunny CDN
          </h3>
          <VideoUploader coachId={coachId} />
        </div>

        {/* Accesos Rápidos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Accesos Rápidos
            </h3>
            
            <div className="space-y-3.5">
              <Link 
                href={`/${tenant}/panel/nutricion`}
                className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">Planes de Nutrición & Dietas</h4>
                    <p className="text-xs text-slate-400">Generación con Auto-Balancer y TDEE</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all" />
              </Link>

              <Link 
                href={`/${tenant}/panel/alumnos`}
                className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Gestionar Alumnos</h4>
                    <p className="text-xs text-slate-400">{clientes.length} registrados actualmente</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:-translate-x-1 transition-all" />
              </Link>

              <Link 
                href={`/${tenant}/panel/marca`}
                className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-pink-400 transition-colors">Personalizar Marca</h4>
                    <p className="text-xs text-slate-400">Colores, logotipo y nombre</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:-translate-x-1 transition-all" />
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6">
            <p className="text-xs text-slate-400 mb-2">
              💡 Tus alumnos se conectan automáticamente a tu subdominio{' '}
              <code className="text-indigo-400 font-mono">{tenant}.olympo.pro</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
